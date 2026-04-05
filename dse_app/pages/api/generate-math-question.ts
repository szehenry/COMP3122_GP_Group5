import type { NextApiRequest, NextApiResponse } from "next"
import { IncomingForm, type File as FormidableFile, type Files } from "formidable"
import fs from "fs"
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference"
import { AzureKeyCredential } from "@azure/core-auth"

export const config = {
  api: {
    bodyParser: false,
  },
}

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MODEL_TIMEOUT_MS = 120000
const MAX_COMPLETION_TOKENS = 900
const PRIMARY_MODEL = "openai/gpt-4.1-mini"
const FALLBACK_MODEL = "openai/gpt-4.1-nano"

type GenerateResponse = {
  generatedQuestion: string
  answer: string
  stepExplanation: string
  mathTopic: string
  conceptExplanation: string
  needsGraph: boolean
  graphType: "none" | "coordinate-graph" | "geometry-diagram" | "stat-plot"
  figureDescription: string
  imagePrompt: string
  sourceExtractionMode: "vision-primary" | "ocr-fallback"
  ocrExtractedText: string
}

type GenerateResult = {
  generatedQuestion?: string
  answer?: string
  stepExplanation?: string
  mathTopic?: string
  conceptExplanation?: string
  needsGraph?: boolean
  graphType?: "none" | "coordinate-graph" | "geometry-diagram" | "stat-plot" | string
  figureDescription?: string
  imagePrompt?: string
}

type ApiErrorResponse = {
  error: string
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
    console.warn(`Primary model timeout (${PRIMARY_MODEL}), retrying with fallback (${FALLBACK_MODEL})`)
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
    mathTopic: typeof parsed.mathTopic === "string" ? parsed.mathTopic.trim() : "",
    conceptExplanation:
      typeof parsed.conceptExplanation === "string" ? parsed.conceptExplanation.trim() : "",
    needsGraph: typeof parsed.needsGraph === "boolean" ? parsed.needsGraph : false,
    graphType: typeof parsed.graphType === "string" ? parsed.graphType.trim() : "none",
    figureDescription:
      typeof parsed.figureDescription === "string" ? parsed.figureDescription.trim() : "",
    imagePrompt: typeof parsed.imagePrompt === "string" ? parsed.imagePrompt.trim() : "",
  }
}

function normalizeGraphType(value: GenerateResult["graphType"]): GenerateResponse["graphType"] {
  if (
    value === "coordinate-graph" ||
    value === "geometry-diagram" ||
    value === "stat-plot"
  ) {
    return value
  }
  return "none"
}

function normalizeGraphFields(parsed: GenerateResult): Pick<GenerateResponse, "needsGraph" | "graphType" | "figureDescription" | "imagePrompt"> {
  const normalizedType = normalizeGraphType(parsed.graphType)
  const figureDescription = parsed.figureDescription?.trim() || ""
  const imagePrompt = parsed.imagePrompt?.trim() || ""
  const requestedGraph = parsed.needsGraph === true
  const hasRenderablePrompt = imagePrompt.length > 0

  if (!requestedGraph || !hasRenderablePrompt || normalizedType === "none") {
    return {
      needsGraph: false,
      graphType: "none",
      figureDescription: "",
      imagePrompt: "",
    }
  }

  return {
    needsGraph: true,
    graphType: normalizedType,
    figureDescription,
    imagePrompt,
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

function mapFormidableError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== "object") {
    return null
  }

  const maybeCode = (error as { code?: unknown }).code
  const maybeMessage = (error as { message?: unknown }).message
  const message = typeof maybeMessage === "string" ? maybeMessage.toLowerCase() : ""

  if (maybeCode === 1009 || message.includes("maxfilesize") || message.includes("max file size")) {
    return {
      status: 413,
      message: "Image is too large. Please upload a file smaller than 5MB.",
    }
  }

  if (message.includes("maxfiles") || message.includes("too many files")) {
    return {
      status: 400,
      message: "Please upload exactly one image file.",
    }
  }

  return null
}

async function extractQuestionViaOcr(filePath: string): Promise<string> {
  // Lazy import prevents serverless cold-start crashes if tesseract worker internals are not bundled.
  const tesseractModule = await import("tesseract.js")
  const recognize = tesseractModule.default?.recognize ?? tesseractModule.recognize
  if (typeof recognize !== "function") {
    throw new Error("Tesseract recognize function is unavailable")
  }

  const buffer = fs.readFileSync(filePath)
  const {
    data: { text },
  } = await recognize(buffer, "eng+chi_tra")
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
    "Then provide the exact answer, concise step-by-step explanation, the math topic name, and concept explanation suitable for students.",
    "Return ONLY valid JSON with this exact schema:",
    '{"generatedQuestion":"string","answer":"string","stepExplanation":"string","mathTopic":"string","conceptExplanation":"string","needsGraph":true|false,"graphType":"none|coordinate-graph|geometry-diagram|stat-plot","figureDescription":"string","imagePrompt":"string"}',
    "Set needsGraph=true only if the generated question requires a visual graph/diagram to solve.",
    "If needsGraph=false, you MUST set graphType to 'none' and both figureDescription and imagePrompt to empty strings.",
    "If needsGraph=true, you MUST provide a concrete graphType plus a detailed figureDescription and imagePrompt.",
    "imagePrompt must be specific enough for an image model to draw the exact required graph or diagram.",
    "For non-visual algebra/number questions, set needsGraph=false.",
    "For coordinate geometry, function graphs, statistics plots, or geometry figure-based questions, set needsGraph=true.",
    "The stepExplanation must be detailed and easy to read for students (at least 5 complete steps).",
    "Do NOT use bullet points for stepExplanation. Use short paragraphs or numbered Step 1, Step 2 style.",
    "Use this exact repeating style for each step: 'Step N: short explanation sentence' then on the next line a related formula in block math $$...$$.",
    "Never place Step 1, Step 2, Step 3 in one single paragraph; each step must be separated by a blank line.",
    "In all fields, write human-readable Markdown and wrap every math expression in LaTeX delimiters: inline $...$ and block $$...$$.",
    "Do not include markdown code fences or additional keys.",
    "",
    "Source question:",
    sourceQuestion,
  ].join("\n")
}

function buildVisionGenerationInstruction(): string {
  return [
    "You are an expert Hong Kong DSE Mathematics teacher.",
    "Read the uploaded question image and create ONE new question with similar topic and difficulty.",
    "Then provide the exact answer, concise step-by-step explanation, the math topic name, and concept explanation suitable for students.",
    "Return ONLY valid JSON with this exact schema:",
    '{"generatedQuestion":"string","answer":"string","stepExplanation":"string","mathTopic":"string","conceptExplanation":"string","needsGraph":true|false,"graphType":"none|coordinate-graph|geometry-diagram|stat-plot","figureDescription":"string","imagePrompt":"string"}',
    "Set needsGraph=true only if the generated question requires a visual graph/diagram to solve.",
    "If needsGraph=false, you MUST set graphType to 'none' and both figureDescription and imagePrompt to empty strings.",
    "If needsGraph=true, you MUST provide a concrete graphType plus a detailed figureDescription and imagePrompt.",
    "imagePrompt must be specific enough for an image model to draw the exact required graph or diagram.",
    "For non-visual algebra/number questions, set needsGraph=false.",
    "For coordinate geometry, function graphs, statistics plots, or geometry figure-based questions, set needsGraph=true.",
    "The stepExplanation must be detailed and easy to read for students (at least 5 complete steps).",
    "Do NOT use bullet points for stepExplanation. Use short paragraphs or numbered Step 1, Step 2 style.",
    "Use this exact repeating style for each step: 'Step N: short explanation sentence' then on the next line a related formula in block math $$...$$.",
    "Never place Step 1, Step 2, Step 3 in one single paragraph; each step must be separated by a blank line.",
    "In all fields, write human-readable Markdown and wrap every math expression in LaTeX delimiters: inline $...$ and block $$...$$.",
    "Do not include markdown code fences or additional keys.",
  ].join("\n")
}

async function handler(req: NextApiRequest, res: NextApiResponse<GenerateResponse | ApiErrorResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  let uploadedPath = ""

  try {
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

    const token = process.env.GITHUB_MODEL_API_KEY_gpt5
    if (!token) {
      res.status(500).json({ error: "Missing GITHUB_MODEL_API_KEY_gpt5 environment variable" })
      return
    }

    const endpoint = "https://models.github.ai/inference"
    const client = ModelClient(endpoint, new AzureKeyCredential(token))

    let ocrText = ""
    let extractionMode: "vision-primary" | "ocr-fallback" = "vision-primary"

    let generationResponse = await postChatWithModelFallback(client, {
      messages: [
        {
          role: "system",
          content: "You are an expert DSE Mathematics teacher creating high-quality practice material.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildVisionGenerationInstruction(),
            },
            { type: "image_url", image_url: { url: fileToDataUrl(uploadedPath, mimetype) } },
          ],
        },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    } as any)

    if (isUnexpected(generationResponse)) {
      // OCR is only attempted when vision generation fails to reduce runtime overhead and bundling risk.
      ocrText = await extractQuestionViaOcr(uploadedPath).catch(() => "")
      const sourceQuestion = normalizeExtractedText(ocrText)
      if (sourceQuestion.length < 20) {
        res.status(502).json({ error: "Vision generation failed and OCR fallback was insufficient." })
        return
      }

      extractionMode = "ocr-fallback"
      generationResponse = await postChatWithModelFallback(client, {
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
    }

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

    if (
      !parsed.generatedQuestion ||
      !parsed.answer ||
      !parsed.stepExplanation ||
      !parsed.mathTopic ||
      !parsed.conceptExplanation
    ) {
      res.status(502).json({ error: "Model response is incomplete. Please try again." })
      return
    }

    const normalizedGraph = normalizeGraphFields(parsed)

    res.status(200).json({
      generatedQuestion: parsed.generatedQuestion,
      answer: parsed.answer,
      stepExplanation: parsed.stepExplanation,
      mathTopic: parsed.mathTopic,
      conceptExplanation: parsed.conceptExplanation,
      needsGraph: normalizedGraph.needsGraph,
      graphType: normalizedGraph.graphType,
      figureDescription: normalizedGraph.figureDescription,
      imagePrompt: normalizedGraph.imagePrompt,
      sourceExtractionMode: extractionMode,
      ocrExtractedText: ocrText,
    })
  } catch (error) {
    const mappedFormError = mapFormidableError(error)
    if (mappedFormError) {
      res.status(mappedFormError.status).json({ error: mappedFormError.message })
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