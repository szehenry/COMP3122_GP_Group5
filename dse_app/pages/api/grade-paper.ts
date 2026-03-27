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
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng')
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
    const perQuestion: GradingQuestion[] = perQuestionSource.map((q: any, idx: number) => ({
      q: Number.isFinite(Number(q?.q)) ? Number(q.q) : idx + 1,
      score: Number.isFinite(Number(q?.score)) ? Number(q.score) : 0,
      total: Number.isFinite(Number(q?.total)) ? Number(q.total) : 0,
      feedback: typeof q?.feedback === 'string' ? q.feedback : '',
      solution: typeof q?.solution === 'string' ? q.solution : '',
      concepts: typeof q?.concepts === 'string' ? q.concepts : '',
    }))

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
    const recoveredScore = recoveredQuestions.reduce((sum, q) => sum + q.score, 0)
    const recoveredTotal = recoveredQuestions.reduce((sum, q) => sum + q.total, 0)

    if (recoveredQuestions.length > 0) {
      return {
        score: recoveredScore,
        total: recoveredTotal,
        perQuestion: recoveredQuestions,
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
  const normalizedQuestions = payload.perQuestion
    .map((q, idx) => {
      const total = Number.isFinite(q.total) && q.total > 0 ? q.total : 0
      const feedback = (q.feedback || '').trim()
      let score = Number.isFinite(q.score) && q.score >= 0 ? q.score : 0

      // If model says "correct" but omits score, award full marks for that question.
      if (score === 0 && total > 0 && /^correct\b/i.test(feedback)) {
        score = total
      }

      return {
        q: Number.isFinite(q.q) && q.q > 0 ? q.q : idx + 1,
        score: Math.min(score, total || score),
        total,
        feedback,
        solution: (q.solution || '').trim(),
        concepts: (q.concepts || '').trim() || 'Refer to the model solution and marking points for key concepts.',
      }
    })
    .sort((a, b) => a.q - b.q)

  const sumScore = normalizedQuestions.reduce((sum, q) => sum + q.score, 0)
  const sumTotal = normalizedQuestions.reduce((sum, q) => sum + q.total, 0)

  return {
    score: sumScore,
    total: sumTotal,
    perQuestion: normalizedQuestions,
    rawResult: payload.rawResult,
  }
}

function shouldRepairPayload(payload: Omit<GradingPayload, 'ocrDebug'>): boolean {
  if (!payload.perQuestion.length) return true
  const missingSolutionCount = payload.perQuestion.filter((q) => !q.solution?.trim()).length
  const zeroTotalCount = payload.perQuestion.filter((q) => !(q.total > 0)).length
  const mostlyOneWordFeedback = payload.perQuestion.filter((q) => {
    const f = (q.feedback || '').trim()
    return !!f && f.split(/\s+/).length <= 2
  }).length

  return (
    missingSolutionCount / payload.perQuestion.length > 0.6 ||
    zeroTotalCount === payload.perQuestion.length ||
    mostlyOneWordFeedback / payload.perQuestion.length > 0.7
  )
}

function buildGradingPrompt(questionText: string, markingSchemeText: string, answerText: string, ctx: GradeContext): string {
  return `You are an expert HKDSE Mathematics marker.

Context:
- Year: ${ctx.year || 'unknown'}
- Paper: ${ctx.paper || 'unknown'}
- Paper Type: ${ctx.paperType || 'unknown'}

Rules:
1) Grade ALL questions that appear in the marking scheme (all sections, not only one section).
2) Use mark allocation from the marking scheme for each question.
3) For each question, provide short but useful feedback and a concise model solution.
4) score must be in [0, total].
5) total (top level) must equal sum(perQuestion[].total).
6) score (top level) must equal sum(perQuestion[].score).
7) Numeric fields must be plain numbers only (do NOT output expressions like 35+35).
8) concepts must be non-empty for every question.
9) Return ONLY valid JSON. No markdown and no extra text.

Required JSON shape:
{
  "score": number,
  "total": number,
  "perQuestion": [
    {
      "q": number,
      "score": number,
      "total": number,
      "feedback": string,
      "solution": string,
      "concepts": string
    }
  ]
}

Question Paper:
${questionText}

Marking Scheme:
${markingSchemeText}

Student Answer:
${answerText}`
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
  "score": number,
  "total": number,
  "perQuestion": [
    {
      "q": number,
      "score": number,
      "total": number,
      "feedback": string,
      "solution": string,
      "concepts": string
    }
  ]
}

Constraints:
- Do not use one-word feedback such as "Correct" only.
- solution must explain the key steps for each question.
- concepts must be non-empty for each question.
- numeric fields must be plain numbers only (no expressions).
- total and score at top level must equal sums from perQuestion.

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

  const form = new IncomingForm({ multiples: false })
  form.parse(req, async (err: any, fields: any, files: any) => {
    if (err) return res.status(500).json({ error: 'File upload error' })
    try {
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
      // Debug log file objects to check structure
      console.log('questionFile:', questionFile)
      console.log('answerFile:', answerFile)
      console.log('markingSchemeFile:', markingSchemeFile)
      // Use correct file path property (filepath or path)
      const getFilePath = (file: any) => file.filepath || file.path
      if (!getFilePath(questionFile) || !getFilePath(answerFile) || !getFilePath(markingSchemeFile)) {
        res.status(400).json({ error: 'File upload failed: missing file path', debug: { questionFile, answerFile, markingSchemeFile } })
        return
      }
      // === Extract text from files ===
      const questionText = await extractTextFromFile(getFilePath(questionFile), questionFile.mimetype || '')
      const answerText = await extractTextFromFile(getFilePath(answerFile), answerFile.mimetype || '')
      const markingSchemeText = await extractTextFromFile(getFilePath(markingSchemeFile), markingSchemeFile.mimetype || '')
      // === Compose prompt for Llama 4 ===
      const prompt = buildGradingPrompt(questionText, markingSchemeText, answerText, gradeContext)
      const endpoint = "https://models.github.ai/inference";
      const model = "meta/Llama-4-Scout-17B-16E-Instruct";
      const token = process.env.GITHUB_MODEL_API_KEY;
      if (!token) {
        res.status(500).json({ error: 'Missing GITHUB_MODEL_API_KEY environment variable' });
        return;
      }
      const client = ModelClient(endpoint, new AzureKeyCredential(token));
      const response = await client.path("/chat/completions").post({
        body: {
          messages: [
            { role: "system", content: "You are an expert DSE Mathematics marker." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 4096,
          model: model
        }
      });
      if (isUnexpected(response)) {
        console.error('GitHub Model API error:', response.body.error);
        res.status(502).json({ error: 'GitHub Model API error', details: response.body.error });
        return;
      }
      const rawContent = normalizeModelContent(response.body?.choices?.[0]?.message?.content)
      let parsed = parseGradingPayload(rawContent)

      if (shouldRepairPayload(parsed)) {
        const repairPrompt = buildRepairPrompt(questionText, markingSchemeText, answerText, rawContent, gradeContext)
        const repairResponse = await client.path("/chat/completions").post({
          body: {
            messages: [
              { role: "system", content: "You are an expert DSE Mathematics marker." },
              { role: "user", content: repairPrompt }
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 4096,
            model: model
          }
        })

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
      res.status(500).json({ error: 'Processing error', details: e instanceof Error ? e.message : e })
    }
  })
}

export default handler
