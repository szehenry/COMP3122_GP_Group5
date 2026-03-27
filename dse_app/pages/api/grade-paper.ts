import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import path from 'path'
import { supabase } from '../../utils/supabaseClient'
import Tesseract from 'tesseract.js'
import FormData from 'form-data'
import fetch from 'node-fetch'
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
      // Ensure all fields are strings, not arrays
      const getField = (f: any) => Array.isArray(f) ? f[0] : f
      const paperType = getField(fields.paperType)
      // Debug log file objects to check structure
      console.log('questionFile:', questionFile)
      console.log('answerFile:', answerFile)
      console.log('markingSchemeFile:', markingSchemeFile)
      // Use correct file path property (filepath or path)
      const getFilePath = (file: any) => file.filepath || file.path
      const getFileName = (file: any) => file.originalFilename || file.name
      if (!getFilePath(questionFile) || !getFilePath(answerFile) || !getFilePath(markingSchemeFile)) {
        res.status(400).json({ error: 'File upload failed: missing file path', debug: { questionFile, answerFile, markingSchemeFile } })
        return
      }
      // === Extract text from files ===
      const questionText = await extractTextFromFile(getFilePath(questionFile), questionFile.mimetype || '')
      const answerText = await extractTextFromFile(getFilePath(answerFile), answerFile.mimetype || '')
      const markingSchemeText = await extractTextFromFile(getFilePath(markingSchemeFile), markingSchemeFile.mimetype || '')
      // === Compose prompt for Llama 4 ===
      const prompt = `You are an expert DSE Mathematics marker.\n\nQuestion Paper:\n${questionText}\n\nMarking Scheme:\n${markingSchemeText}\n\nStudent Answer:\n${answerText}\n\nGrade the answer according to the marking scheme. Give per-question feedback, model solution, and key concepts.`
      const endpoint = "https://models.github.ai/inference";
      const model = "meta/Llama-4-Scout-17B-16E-Instruct";
      const token = process.env.GITHUB_MODEL_API_KEY;
      const client = ModelClient(endpoint, new AzureKeyCredential(token));
      const response = await client.path("/chat/completions").post({
        body: {
          messages: [
            { role: "system", content: "You are an expert DSE Mathematics marker." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048,
          model: model
        }
      });
      if (isUnexpected(response)) {
        console.error('GitHub Model API error:', response.body.error);
        res.status(502).json({ error: 'GitHub Model API error', details: response.body.error });
        return;
      }
      res.json({ result: response.body.choices[0].message.content });
    } catch (e) {
      console.error('Cerebras API error:', e)
      res.status(500).json({ error: 'Processing error', details: e instanceof Error ? e.message : e })
    }
  })
}

export default handler
