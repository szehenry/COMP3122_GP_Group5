import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const SAMPLE_BUCKET = process.env.SUPABASE_SAMPLE_BUCKET || 'grading-examples'

const SAMPLE_PATHS: Record<string, string> = {
  paper1Question: 'examples/paper1/question',
  paper1Answer: 'examples/paper1/answer',
  paper1Marking: 'examples/paper1/marking',
  paper2Question: 'examples/paper2/question',
  paper2Marking: 'examples/paper2/marking',
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for sample upload API')
  }
  return createClient(supabaseUrl, supabaseKey)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

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

    const getField = (f: any) => (Array.isArray(f) ? f[0] : f)
    const sampleKey = String(getField(parsedForm.fields.sampleKey) || '')
    const targetPath = SAMPLE_PATHS[sampleKey]
    if (!targetPath) {
      res.status(400).json({ error: 'Invalid sampleKey' })
      return
    }

    const getFirst = (f: any) => (Array.isArray(f) ? f[0] : f)
    const sampleFile = getFirst(parsedForm.files.file)
    const filePath = sampleFile?.filepath || sampleFile?.path
    if (!filePath) {
      res.status(400).json({ error: 'Missing upload file' })
      return
    }

    const content = fs.readFileSync(filePath)
    const contentType = sampleFile?.mimetype || 'application/octet-stream'

    const supabase = getSupabaseServerClient()
    const { error } = await supabase.storage
      .from(SAMPLE_BUCKET)
      .upload(targetPath, content, { upsert: true, contentType })

    if (error) {
      const hint = error.message.includes('Bucket not found')
        ? `Bucket '${SAMPLE_BUCKET}' does not exist. Create it in Supabase Storage first.`
        : error.message.includes('row-level security') || error.message.includes('permission')
          ? 'Check Storage policies or use service role key in .env.local.'
          : undefined
      res.status(500).json({ error: 'Failed to upload sample file', details: error.message, hint })
      return
    }

    res.status(200).json({ ok: true, sampleKey, path: targetPath })
  } catch (e) {
    res.status(500).json({ error: 'Upload processing failed', details: e instanceof Error ? e.message : String(e) })
  }
}
