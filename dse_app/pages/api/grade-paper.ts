import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import Tesseract from 'tesseract.js'
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export const config = {
  api: {
    bodyParser: false,
  },
}

// Extract text from files using OCR or PDF parsing
async function extractTextFromFile(filePath: string, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const data = fs.readFileSync(filePath)
    // Dynamically import pdf-parse to avoid ESM/CJS issues
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default?.default || pdfParseModule.default || pdfParseModule;
    console.log('pdfParseModule:', pdfParseModule, 'pdfParse:', pdfParse);
    const pdfData = await pdfParse(data)
    return pdfData.text
  } else if (mimetype.startsWith('image/')) {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+chi_tra')
    return text
  }
  return ''
}

type GradingQuestion = {
  q: number
  score: number
  total: number
  feedback: string
  solution: string
  concepts: string
}

type GradingPayload = {
  score: number
  total: number
  perQuestion: GradingQuestion[]
  rawResult?: string
  ocrDebug?: {
    markingSchemeText: string
    answerText: string
  }
}

type GradeContext = {
  year: string
  paper: string
  paperType: string
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

const MODEL_TIMEOUT_MS = 90000
const MAX_COMPLETION_TOKENS = 1200
const PRIMARY_MODEL = "openai/gpt-5"
const FALLBACK_MODEL = "openai/gpt-4.1-mini"

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('timed out')
}

async function postChatWithTimeout(client: any, body: any, timeoutMs: number) {
  return await Promise.race([
    client.path("/chat/completions").post({ body }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Model request timed out after ${timeoutMs}ms`)), timeoutMs)
    }),
  ])
}

async function postChatWithModelFallback(client: any, baseBody: any) {
  try {
    return await postChatWithTimeout(
      client,
      { ...baseBody, model: PRIMARY_MODEL },
      MODEL_TIMEOUT_MS
    )
  } catch (e) {
    if (!isTimeoutError(e)) throw e
    console.warn(`Primary model timeout (${PRIMARY_MODEL}), retrying with fallback model (${FALLBACK_MODEL})`)
    return await postChatWithTimeout(
      client,
      { ...baseBody, model: FALLBACK_MODEL },
      MODEL_TIMEOUT_MS
    )
  }
}

function fileToDataUrl(filePath: string, mimetype: string): string {
  const bytes = fs.readFileSync(filePath)
  const base64 = bytes.toString('base64')
  return `data:${mimetype};base64,${base64}`
}

function normalizeModelContent(content: any): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object') {
          if (typeof part.text === 'string') return part.text
          if (typeof part.content === 'string') return part.content
        }
        return ''
      })
      .join('\n')
  }
  if (content == null) return ''
  return String(content)
}

function parseGradingPayload(rawText: string): Omit<GradingPayload, 'ocrDebug'> {
  const fallback: Omit<GradingPayload, 'ocrDebug'> = {
    score: 0,
    total: 0,
    perQuestion: [],
    rawResult: rawText,
  }

  if (!rawText.trim()) return fallback

  const stripped = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  const objectMatch = stripped.match(/\{[\s\S]*\}/)
  const jsonCandidate = objectMatch ? objectMatch[0] : stripped

  // Repair simple arithmetic expressions like "total": 35 + 35 into numeric literals.
  const normalizeNumericExpression = (source: string) => {
    const withFlattenedSums = source.replace(
      /"(score|total|q)"\s*:\s*(-?\d+(?:\.\d+)?(?:\s*\+\s*-?\d+(?:\.\d+)?)*)/g,
      (_m, key, expr) => {
        const value = String(expr)
          .split('+')
          .map((part) => Number(part.trim()))
          .filter((n) => Number.isFinite(n))
          .reduce((sum, n) => sum + n, 0)
        return `"${key}": ${value}`
      }
    )

    // Remove trailing commas that often break strict JSON parsing.
    return withFlattenedSums.replace(/,\s*([}\]])/g, '$1')
  }

  const repairedJsonCandidate = normalizeNumericExpression(jsonCandidate)

  const extractQuestionObjects = (source: string): GradingQuestion[] => {
    const perQuestionMatch = source.match(/"perQuestion"\s*:\s*\[([\s\S]*)\]/)
    if (!perQuestionMatch) return []
    const arrayBody = perQuestionMatch[1]
    const objects: string[] = []
    let depth = 0
    let start = -1

    for (let i = 0; i < arrayBody.length; i++) {
      const ch = arrayBody[i]
      if (ch === '{') {
        if (depth === 0) start = i
        depth += 1
      } else if (ch === '}') {
        depth -= 1
        if (depth === 0 && start >= 0) {
          objects.push(arrayBody.slice(start, i + 1))
          start = -1
        }
      }
    }

    return objects
      .map((objText) => {
        const repaired = normalizeNumericExpression(objText)
        try {
          const parsed = JSON.parse(repaired)
          return {
            q: Number.isFinite(Number(parsed?.q)) ? Number(parsed.q) : 0,
            score: Number.isFinite(Number(parsed?.score)) ? Number(parsed.score) : 0,
            total: Number.isFinite(Number(parsed?.total)) ? Number(parsed.total) : 0,
            feedback: typeof parsed?.feedback === 'string' ? parsed.feedback : '',
            solution: typeof parsed?.solution === 'string' ? parsed.solution : '',
            concepts: typeof parsed?.concepts === 'string' ? parsed.concepts : '',
          } as GradingQuestion
        } catch {
          return null
        }
      })
      .filter((q): q is GradingQuestion => Boolean(q))
  }

  try {
    const parsed = JSON.parse(repairedJsonCandidate)
    const perQuestionSource = Array.isArray(parsed?.perQuestion) ? parsed.perQuestion : []
    const fromArray: GradingQuestion[] = perQuestionSource.map((q: any, idx: number) => ({
      q: Number.isFinite(Number(q?.q)) ? Number(q.q) : idx + 1,
      score: Number.isFinite(Number(q?.score)) ? Number(q.score) : 0,
      total: Number.isFinite(Number(q?.total)) ? Number(q.total) : 0,
      feedback: typeof q?.feedback === 'string' ? q.feedback : '',
      solution: typeof q?.solution === 'string' ? q.solution : '',
      concepts: typeof q?.concepts === 'string' ? q.concepts : '',
    }))

    // Single-question mode: allow either flat object or perQuestion array from model.
    const singleFromFlat: GradingQuestion = {
      q: Number.isFinite(Number(parsed?.q)) ? Number(parsed.q) : 1,
      score: Number.isFinite(Number(parsed?.score)) ? Number(parsed.score) : 0,
      total: Number.isFinite(Number(parsed?.total)) ? Number(parsed.total) : 0,
      feedback: typeof parsed?.feedback === 'string' ? parsed.feedback : '',
      solution: typeof parsed?.solution === 'string' ? parsed.solution : '',
      concepts: typeof parsed?.concepts === 'string' ? parsed.concepts : '',
    }

    const selected = fromArray.length > 0
      ? fromArray[0]
      : (singleFromFlat.feedback || singleFromFlat.solution || singleFromFlat.total > 0 ? singleFromFlat : null)

    const perQuestion = selected ? [selected] : []
    const autoScore = perQuestion.reduce((sum, q) => sum + q.score, 0)
    const autoTotal = perQuestion.reduce((sum, q) => sum + q.total, 0)

    return {
      score: Number.isFinite(Number(parsed?.score)) ? Number(parsed.score) : autoScore,
      total: Number.isFinite(Number(parsed?.total)) ? Number(parsed.total) : autoTotal,
      perQuestion,
      rawResult: rawText,
    }
  } catch {
    const recoveredQuestions = extractQuestionObjects(repairedJsonCandidate)
    const firstRecovered = recoveredQuestions[0]

    if (firstRecovered) {
      return {
        score: firstRecovered.score,
        total: firstRecovered.total,
        perQuestion: [firstRecovered],
        rawResult: rawText,
      }
    }

    return {
      score: 0,
      total: 0,
      perQuestion: [],
      rawResult: rawText,
    }
  }
}

function normalizeGradingPayload(payload: Omit<GradingPayload, 'ocrDebug'>): Omit<GradingPayload, 'ocrDebug'> {
  const first = payload.perQuestion[0]
  if (!first) {
    return {
      score: 0,
      total: 0,
      perQuestion: [],
      rawResult: payload.rawResult,
    }
  }

  const total = Number.isFinite(first.total) && first.total > 0 ? first.total : 0
  const feedback = (first.feedback || '').trim()
  let score = Number.isFinite(first.score) && first.score >= 0 ? first.score : 0

  // If model says "correct" but omits score, award full marks for that question.
  if (score === 0 && total > 0 && /^correct\b/i.test(feedback)) {
    score = total
  }

  const normalizedQuestion: GradingQuestion = {
    q: Number.isFinite(first.q) && first.q > 0 ? first.q : 1,
    score: Math.min(score, total || score),
    total,
    feedback,
    solution: (first.solution || '').trim(),
    concepts: (first.concepts || '').trim() || 'Refer to the model solution and marking points for key concepts.',
  }

  return {
    score: normalizedQuestion.score,
    total: normalizedQuestion.total,
    perQuestion: [normalizedQuestion],
    rawResult: payload.rawResult,
  }
}

function shouldRepairPayload(payload: Omit<GradingPayload, 'ocrDebug'>): boolean {
  const q = payload.perQuestion[0]
  if (!q) return true
  const feedback = (q.feedback || '').trim()
  const solution = (q.solution || '').trim()
  return !(q.total > 0) || !feedback || !solution || feedback.split(/\s+/).length <= 2
}

function buildGradingPrompt(questionText: string, markingSchemeText: string, answerText: string, ctx: GradeContext): string {
  return `You are an expert HKDSE Mathematics marker.

Context:
- Year: ${ctx.year || 'unknown'}
- Paper: ${ctx.paper || 'unknown'}
- Paper Type: ${ctx.paperType || 'unknown'}

Rules:
1) This is single-question grading mode: grade the uploaded question.
2) Use mark allocation from the uploaded marking scheme for this question.
3) For marking schemes, the 1A means 1 mark for answer, 1M means 1 mark for method. If only A for that question or part, just award full marks if the answer is correct. If only M, award marks for method even if the final answer is wrong and method is correct.
3) score must be in [0, total].
4) Numeric fields must be plain numbers only (do NOT output expressions like 35+35).
5) feedback must explain why marks are awarded/deducted.
6) solution must include concise key steps.
7) concepts must be non-empty.
8) Return ONLY valid JSON. No markdown and no extra text.

Required JSON shape:
{
  "q": number,
  "score": number,
  "total": number,
  "feedback": string,
  "solution": string,
  "concepts": string
}

Question Paper:
${questionText}

Marking Scheme:
${markingSchemeText}

Student Answer:
${answerText}`
}

function buildVisionGradingPrompt(ctx: GradeContext): string {
  return `You are an expert HKDSE Mathematics marker.

Context:
- Year: ${ctx.year || 'unknown'}
- Paper Type: ${ctx.paperType || 'unknown'}

You will receive 3 images in this order:
1) Question image
2) Student answer image
3) Marking scheme image

Rules:
1) This is single-question grading mode.
2) Use mark allocation from the marking scheme for this question.
3) score must be in [0, total].
4) Numeric fields must be plain numbers only.
5) feedback must explain why marks are awarded/deducted.
6) solution must include concise key steps.
7) concepts must be non-empty.
8) Return ONLY valid JSON. No markdown and no extra text.

Required JSON shape:
{
  "q": number,
  "score": number,
  "total": number,
  "feedback": string,
  "solution": string,
  "concepts": string
}`
}

function buildRepairPrompt(
  questionText: string,
  markingSchemeText: string,
  answerText: string,
  previousRawResult: string,
  ctx: GradeContext
): string {
  return `The previous grading output was incomplete.

Context:
- Year: ${ctx.year || 'unknown'}
- Paper: ${ctx.paper || 'unknown'}
- Paper Type: ${ctx.paperType || 'unknown'}

You must re-grade and regenerate complete JSON for ALL questions in the marking scheme.
Strictly return ONLY valid JSON with this shape:
{
  "q": number,
  "score": number,
  "total": number,
  "feedback": string,
  "solution": string,
  "concepts": string
}

Constraints:
- Do not use one-word feedback such as "Correct" only.
- solution must explain the key steps for each question.
- concepts must be non-empty for each question.
- numeric fields must be plain numbers only (no expressions).
- Grade only the uploaded single question.

Question Paper:
${questionText}

Marking Scheme:
${markingSchemeText}

Student Answer:
${answerText}

Previous incomplete output:
${previousRawResult}`
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const form = new IncomingForm({ multiples: false })
    const parsedForm = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err: any, fields: any, files: any) => {
        if (err) {
          reject(err)
          return
        }
        resolve({ fields, files })
      })
    })

    const { fields, files } = parsedForm
    // Handle case where files are arrays (Formidable v2+)
    const getFirst = (f: any) => Array.isArray(f) ? f[0] : f
    const questionFile = getFirst(files.question)
    const answerFile = getFirst(files.answer)
    const markingSchemeFile = getFirst(files.markingScheme)
    const getField = (f: any) => Array.isArray(f) ? f[0] : f
    const gradeContext: GradeContext = {
      year: String(getField(fields.year) || ''),
      paper: String(getField(fields.paper) || ''),
      paperType: String(getField(fields.paperType) || ''),
    }

    // Use correct file path property (filepath or path)
    const getFilePath = (file: any) => file.filepath || file.path
    if (!getFilePath(questionFile) || !getFilePath(answerFile) || !getFilePath(markingSchemeFile)) {
      res.status(400).json({ error: 'File upload failed: missing file path', debug: { questionFile, answerFile, markingSchemeFile } })
      return
    }
    const questionMimetype = questionFile.mimetype || ''
    const answerMimetype = answerFile.mimetype || ''
    const markingSchemeMimetype = markingSchemeFile.mimetype || ''

    const areAllImages =
      questionMimetype.startsWith('image/') &&
      answerMimetype.startsWith('image/') &&
      markingSchemeMimetype.startsWith('image/')

    let questionText = ''
    let answerText = ''
    let markingSchemeText = ''

    if (!areAllImages) {
      // Text path for PDF/mixed uploads.
      questionText = await extractTextFromFile(getFilePath(questionFile), questionMimetype)
      answerText = await extractTextFromFile(getFilePath(answerFile), answerMimetype)
      markingSchemeText = await extractTextFromFile(getFilePath(markingSchemeFile), markingSchemeMimetype)
    }

    const normalizedQuestionText = normalizeExtractedText(questionText)
    const normalizedAnswerText = normalizeExtractedText(answerText)
    const normalizedMarkingSchemeText = normalizeExtractedText(markingSchemeText)

    // Stop early when text extraction path fails to produce meaningful text.
    if (!areAllImages && (
      normalizedQuestionText.length < 10 ||
      normalizedAnswerText.length < 10 ||
      normalizedMarkingSchemeText.length < 10
    )) {
      res.status(422).json({
        error: 'Unable to read enough text from uploaded files. Please upload clearer images or PDFs (higher resolution).',
        details: {
          questionTextLength: normalizedQuestionText.length,
          answerTextLength: normalizedAnswerText.length,
          markingSchemeTextLength: normalizedMarkingSchemeText.length,
        },
        ocrDebug: {
          markingSchemeText,
          answerText,
        },
      })
      return
    }

    const endpoint = "https://models.github.ai/inference";
    const token = process.env.GITHUB_MODEL_API_KEY_gpt5;
    if (!token) {
      res.status(500).json({ error: 'Missing GITHUB_MODEL_API_KEY_gpt5 environment variable' });
      return;
    }
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    const firstUserContent: any = areAllImages
      ? [
          { type: 'text', text: buildVisionGradingPrompt(gradeContext) },
          { type: 'image_url', image_url: { url: fileToDataUrl(getFilePath(questionFile), questionMimetype) } },
          { type: 'image_url', image_url: { url: fileToDataUrl(getFilePath(answerFile), answerMimetype) } },
          { type: 'image_url', image_url: { url: fileToDataUrl(getFilePath(markingSchemeFile), markingSchemeMimetype) } },
        ]
      : buildGradingPrompt(questionText, markingSchemeText, answerText, gradeContext)

    const response = await postChatWithModelFallback(
      client,
      {
        messages: [
          { role: "system", content: "You are an expert DSE Mathematics marker." },
          { role: "user", content: firstUserContent }
        ],
        max_completion_tokens: MAX_COMPLETION_TOKENS,
      } as any
    ) as any;
    if (isUnexpected(response)) {
      console.error('GitHub Model API error:', response.body.error);
      res.status(502).json({ error: 'GitHub Model API error', details: response.body.error });
      return;
    }
    const rawContent = normalizeModelContent(response.body?.choices?.[0]?.message?.content)
    let parsed = parseGradingPayload(rawContent)

    if (!areAllImages && shouldRepairPayload(parsed)) {
      const repairPrompt = buildRepairPrompt(questionText, markingSchemeText, answerText, rawContent, gradeContext)
      const repairUserContent: any = areAllImages
        ? [
            { type: 'text', text: `${buildVisionGradingPrompt(gradeContext)}\n\nPrevious incomplete output:\n${rawContent}` },
            { type: 'image_url', image_url: { url: fileToDataUrl(getFilePath(questionFile), questionMimetype) } },
            { type: 'image_url', image_url: { url: fileToDataUrl(getFilePath(answerFile), answerMimetype) } },
            { type: 'image_url', image_url: { url: fileToDataUrl(getFilePath(markingSchemeFile), markingSchemeMimetype) } },
          ]
        : repairPrompt

      const repairResponse = await postChatWithModelFallback(
        client,
        {
          messages: [
            { role: "system", content: "You are an expert DSE Mathematics marker." },
            { role: "user", content: repairUserContent }
          ],
          max_completion_tokens: MAX_COMPLETION_TOKENS,
        } as any
      ) as any

      if (!isUnexpected(repairResponse)) {
        const repairedRaw = normalizeModelContent(repairResponse.body?.choices?.[0]?.message?.content)
        parsed = parseGradingPayload(repairedRaw)
      }
    }

    const normalized = normalizeGradingPayload(parsed)
    const payload: GradingPayload = {
      ...normalized,
      ocrDebug: {
        markingSchemeText,
        answerText,
      },
    }

    res.json(payload);
  } catch (e) {
    console.error('Grade paper API error:', e)
    if (!res.headersSent) {
      if (e instanceof Error && e.message.includes('timed out')) {
        res.status(504).json({ error: 'Model request timeout. Please try again.' })
        return
      }
      res.status(500).json({ error: 'Processing error', details: e instanceof Error ? e.message : e })
    }
  }
}

export default handler
