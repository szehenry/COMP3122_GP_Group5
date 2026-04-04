import type { NextApiRequest, NextApiResponse } from "next"
import { IncomingForm, type File as FormidableFile, type Files } from "formidable"
import fs from "fs"
import Tesseract from "tesseract.js"
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference"
import { AzureKeyCredential } from "@azure/core-auth"

export const config = {
  api: {
    bodyParser: false,
  },
}

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MODEL_TIMEOUT_MS = 90000
const MAX_COMPLETION_TOKENS = 1200
const PRIMARY_MODEL = "openai/gpt-5"
const FALLBACK_MODEL = "openai/gpt-4.1-mini"

type GenerateResponse = {
  generatedQuestion: string
  answer: string
  stepExplanation: string
  sourceExtractionMode: "ocr" | "vision-fallback"
}

type GenerateResult = {
  generatedQuestion?: string
  answer?: string
  stepExplanation?: string
}

function getFilePath(file: FormidableFile | undefined): string {
  return typeof file?.filepath === "string" ? file.filepath : ""
}

function normalizeModelContent(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object") {
          const maybeText = (part as { text?: unknown }).text
          if (typeof maybeText === "string") return maybeText
          const maybeContent = (part as { content?: unknown }).content
          if (typeof maybeContent === "string") return maybeContent
        }
        return ""
      })
      .join("\n")
  }
  if (content == null) return ""
  return String(content)
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

async function postChatWithTimeout(client: any, body: any, timeoutMs: number) {
  return await Promise.race([
    client.path("/chat/completions").post({ body }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Model request timed out after ${timeoutMs}ms`)), timeoutMs)
    }),
  ])
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("timed out")
}

async function postChatWithModelFallback(client: any, baseBody: any) {
  try {
    return await postChatWithTimeout(client, { ...baseBody, model: PRIMARY_MODEL }, MODEL_TIMEOUT_MS)
  } catch (error) {
    if (!isTimeoutError(error)) throw error
    return await postChatWithTimeout(client, { ...baseBody, model: FALLBACK_MODEL }, MODEL_TIMEOUT_MS)
  }
}

function extractJsonObject(rawText: string): string {
  const stripped = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  return match ? match[0] : stripped
}

function parseGenerateResult(rawText: string): GenerateResult {
  if (!rawText.trim()) {
    return {}
  }

  const candidate = extractJsonObject(rawText)
  const parsed = JSON.parse(candidate) as GenerateResult
  return {
    generatedQuestion: typeof parsed.generatedQuestion === "string" ? parsed.generatedQuestion.trim() : "",
    answer: typeof parsed.answer === "string" ? parsed.answer.trim() : "",
    stepExplanation: typeof parsed.stepExplanation === "string" ? parsed.stepExplanation.trim() : "",
  }
}

function fileToDataUrl(filePath: string, mimetype: string): string {
  const bytes = fs.readFileSync(filePath)
  return `data:${mimetype};base64,${bytes.toString("base64")}`
}

async function parseForm(req: NextApiRequest): Promise<{ files: Files }> {
  const form = new IncomingForm({
    multiples: false,
    maxFiles: 1,
    maxFileSize: MAX_FILE_SIZE_BYTES,
  })

  return await new Promise((resolve, reject) => {
    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err)
        return
      }
      resolve({ files })
    })
  })
}

async function extractQuestionViaOcr(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  const {
    data: { text },
  } = await Tesseract.recognize(buffer, "eng+chi_tra")
  return normalizeExtractedText(text)
}

async function extractQuestionViaVision(client: any, filePath: string, mimetype: string): Promise<string> {
  const dataUrl = fileToDataUrl(filePath, mimetype)
  const response = await postChatWithModelFallback(client, {
    messages: [
      {
        role: "system",
        content: "You read math question images accurately, preserving formulas and symbols.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract the full HKDSE math question text from this image. Return plain text only with no markdown.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    max_completion_tokens: 800,
  } as any)

  if (isUnexpected(response)) {
    throw new Error("Vision extraction failed")
  }

  const visionText = normalizeModelContent(response.body?.choices?.[0]?.message?.content)
  return normalizeExtractedText(visionText)
}

function buildGenerationPrompt(sourceQuestion: string): string {
  return [
    "You are an expert Hong Kong DSE Mathematics teacher.",
    "Create ONE new question similar in style, topic, and difficulty to the source question.",
    "Then provide the exact answer and a concise step-by-step explanation suitable for students.",
    "Return ONLY valid JSON with this exact schema:",
    '{"generatedQuestion":"string","answer":"string","stepExplanation":"string"}',
    "Do not include markdown, code fences, or additional keys.",
    "",
    "Source question:",
    sourceQuestion,
  ].join("\n")
}

async function handler(req: NextApiRequest, res: NextApiResponse<GenerateResponse | { error: string }>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  let uploadedPath = ""

  try {
    const token = process.env.GITHUB_MODEL_API_KEY_gpt5
    if (!token) {
      res.status(500).json({ error: "Missing GITHUB_MODEL_API_KEY_gpt5 environment variable" })
      return
    }

    const { files } = await parseForm(req)
    const rawFile = files.questionImage
    const uploadedFile = Array.isArray(rawFile) ? rawFile[0] : rawFile

    if (!uploadedFile) {
      res.status(400).json({ error: "No question image uploaded. Use field name 'questionImage'." })
      return
    }

    const mimetype = uploadedFile.mimetype || ""
    uploadedPath = getFilePath(uploadedFile)

    if (!uploadedPath) {
      res.status(400).json({ error: "Upload failed: missing file path." })
      return
    }

    if (!ALLOWED_MIME_TYPES.has(mimetype)) {
      res.status(400).json({ error: "Unsupported image type. Please upload PNG, JPG, JPEG, or WebP." })
      return
    }

    const endpoint = "https://models.github.ai/inference"
    const client = ModelClient(endpoint, new AzureKeyCredential(token))

    const ocrText = await extractQuestionViaOcr(uploadedPath)
    let sourceQuestion = ocrText
    let extractionMode: "ocr" | "vision-fallback" = "ocr"

    // Fallback to vision extraction when OCR text is too short for stable generation.
    if (sourceQuestion.length < 25) {
      sourceQuestion = await extractQuestionViaVision(client, uploadedPath, mimetype)
      extractionMode = "vision-fallback"
    }

    if (sourceQuestion.length < 20) {
      res.status(422).json({ error: "Unable to extract enough question text. Please upload a clearer image." })
      return
    }

    const generationResponse = await postChatWithModelFallback(client, {
      messages: [
        {
          role: "system",
          content: "You are an expert DSE Mathematics teacher creating high-quality practice material.",
        },
        {
          role: "user",
          content: buildGenerationPrompt(sourceQuestion),
        },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    } as any)

    if (isUnexpected(generationResponse)) {
      res.status(502).json({ error: "GitHub Model API error" })
      return
    }

    const rawContent = normalizeModelContent(generationResponse.body?.choices?.[0]?.message?.content)
    let parsed: GenerateResult

    try {
      parsed = parseGenerateResult(rawContent)
    } catch {
      res.status(502).json({ error: "Model returned invalid JSON format. Please try again." })
      return
    }

    if (!parsed.generatedQuestion || !parsed.answer || !parsed.stepExplanation) {
      res.status(502).json({ error: "Model response is incomplete. Please try again." })
      return
    }

    res.status(200).json({
      generatedQuestion: parsed.generatedQuestion,
      answer: parsed.answer,
      stepExplanation: parsed.stepExplanation,
      sourceExtractionMode: extractionMode,
    })
  } catch (error) {
    if (error instanceof Error && (error as any).code === 1009) {
      res.status(413).json({ error: "Image is too large. Please upload a file smaller than 5MB." })
      return
    }

    if (isTimeoutError(error)) {
      res.status(504).json({ error: "Model request timeout. Please try again." })
      return
    }

    console.error("Generate math question API error:", error)
    res.status(500).json({ error: "Failed to generate question. Please try again." })
  } finally {
    if (uploadedPath) {
      fs.promises.unlink(uploadedPath).catch(() => {
        // Ignore cleanup errors for temp upload files.
      })
    }
  }
}

export default handler