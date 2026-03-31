"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, CheckCircle, MessageSquare, ChevronRight, Loader2 } from "lucide-react"

export function PastPapersSection() {
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [mcAnswer, setMcAnswer] = useState<string>("A") // New state for paper 2 MC Answer
  const [markingSchemeFile, setMarkingSchemeFile] = useState<File | null>(null)
  const [gradingResult, setGradingResult] = useState<any>(null)
  const [gradingLoading, setGradingLoading] = useState(false)
  const [paperType, setPaperType] = useState<string>("")
  const [sourceMode, setSourceMode] = useState<"upload" | "example">("upload")
  const [sampleFileMap, setSampleFileMap] = useState<Record<string, File | null>>({
    paper1Question: null,
    paper1Answer: null,
    paper1Marking: null,
    paper2Question: null,
    paper2Marking: null,
  })
  const [sampleUploadStatus, setSampleUploadStatus] = useState<Record<string, string>>({})

  // File input refs
  const questionInputRef = useRef<HTMLInputElement>(null)
  const answerInputRef = useRef<HTMLInputElement>(null)
  const markingSchemeInputRef = useRef<HTMLInputElement>(null)

  // File preview helpers
  const renderFilePreview = (file: File | null) => {
    if (!file) return null
    if (file.type.startsWith('image/')) {
      return <img src={URL.createObjectURL(file)} alt="preview" className="max-h-40 mx-auto my-2 rounded" />
    }
    if (file.type === 'application/pdf') {
      return <span className="block text-xs text-muted-foreground my-2">PDF: {file.name}</span>
    }
    return <span className="block text-xs text-muted-foreground my-2">{file.name}</span>
  }

  // Handle grading
  const handleGrade = async () => {
    if (!paperType) return
    if (sourceMode === 'upload' && paperType === 'paper1' && (!questionFile || !answerFile || !markingSchemeFile)) return
    if (sourceMode === 'upload' && paperType === 'paper2' && (!questionFile || !markingSchemeFile || !mcAnswer)) return
    
    setGradingLoading(true)
    try {
      const formData = new FormData()
      formData.append('sourceMode', sourceMode)
      formData.append('paperType', paperType)
      if (paperType === 'paper2') {
        formData.append('mcAnswer', mcAnswer)
      }
      if (sourceMode === 'upload') {
        formData.append('question', questionFile as File)
        if (paperType === 'paper1') {
          formData.append('answer', answerFile as File)
        }
        formData.append('markingScheme', markingSchemeFile as File)
      }
      // TODO: Add user_id if available
      const res = await fetch('/api/grade-paper', {
        method: 'POST',
        body: formData,
      })

      const rawText = await res.text()
      if (!rawText.trim()) {
        throw new Error('Empty response body from /api/grade-paper')
      }

      let data: any
      try {
        data = JSON.parse(rawText)
      } catch {
        throw new Error('Invalid JSON response from /api/grade-paper')
      }

      if (!res.ok) {
        throw new Error(data?.error || `Request failed with status ${res.status}`)
      }

      setGradingResult(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to grade answer'
      setGradingResult({ error: message, perQuestion: [] })
    } finally {
      setGradingLoading(false)
    }
  }

  const uploadSampleFile = async (sampleKey: string) => {
    const file = sampleFileMap[sampleKey]
    if (!file) return
    setSampleUploadStatus((prev) => ({ ...prev, [sampleKey]: 'Uploading...' }))
    try {
      const formData = new FormData()
      formData.append('sampleKey', sampleKey)
      formData.append('file', file)
      const res = await fetch('/api/sample-files-upload', {
        method: 'POST',
        body: formData,
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) {
        throw new Error(data?.details || data?.hint || data?.error || 'Upload failed')
      }
      setSampleUploadStatus((prev) => ({ ...prev, [sampleKey]: 'Uploaded' }))
    } catch (e) {
      setSampleUploadStatus((prev) => ({
        ...prev,
        [sampleKey]: e instanceof Error ? `Failed: ${e.message}` : 'Failed',
      }))
    }
  }

  const activeResult = gradingResult?.perQuestion?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Past Paper Grading</h1>
        <p className="mt-1 text-muted-foreground">
          Upload your past paper answers and get AI-powered marking with explanations
        </p>
      </div>

      {/* Step 1: Upload */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              1
            </span>
            Upload Files (By question)
          </CardTitle>
          <CardDescription>
            Upload the question paper, your answer, and the marking scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mr-2">Paper Type:</label>
            <select
              className="border rounded px-2 py-1"
              value={paperType}
              onChange={e => setPaperType(e.target.value)}
              required
            >
              <option value="">Select Paper Type</option>
              <option value="paper1">Paper 1 (Short/Long Questions)</option>
              <option value="paper2">Paper 2 (MC Questions)</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mr-2">File Source:</label>
            <select
              className="border rounded px-2 py-1"
              value={sourceMode}
              onChange={e => setSourceMode(e.target.value as "upload" | "example")}
              required
            >
              <option value="upload">Upload file</option>
              <option value="example">Example question, user answer, and marking schemes</option>
            </select>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Question Paper Upload */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Question Paper</h3>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/5 p-4">
                {sourceMode === 'example' ? (
                  <p className="my-4 text-sm text-muted-foreground">
                    {paperType === 'paper2'
                      ? 'You have chosen example question (Paper 2).'
                      : 'You have chosen example question (Paper 1).'}
                  </p>
                ) : (
                  <>
                    {renderFilePreview(questionFile) || <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      ref={questionInputRef}
                      onChange={e => setQuestionFile(e.target.files?.[0] || null)}
                    />
                    <Button variant="secondary" className="mt-2" onClick={() => questionInputRef.current?.click()}>
                      {questionFile ? 'Change File' : 'Choose File'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* Answer Upload / MC Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Your Answer</h3>
              <div className={`flex flex-col ${paperType === 'paper2' ? 'items-start justify-start' : 'items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/5'} p-4 min-h-[140px]`}>
                {sourceMode === 'example' ? (
                  <p className="my-4 text-sm text-muted-foreground">
                    {paperType === 'paper2'
                      ? 'You have chosen example answer (Paper 2 MC).'
                      : 'You have chosen example user answer (Paper 1).'}
                  </p>
                ) : paperType === 'paper2' ? (
                  <div className="flex flex-col items-start gap-4 w-full px-8">
                    <p className="text-sm text-muted-foreground">Select your MC answer:</p>
                    <div className="flex flex-col gap-3">
                      {["A", "B", "C", "D"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="mcAnswer"
                            value={opt}
                            checked={mcAnswer === opt}
                            onChange={(e) => setMcAnswer(e.target.value)}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="font-semibold">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {renderFilePreview(answerFile) || <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      ref={answerInputRef}
                      onChange={e => setAnswerFile(e.target.files?.[0] || null)}
                    />
                    <Button variant="secondary" className="mt-2" onClick={() => answerInputRef.current?.click()}>
                      {answerFile ? 'Change File' : 'Choose File'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* Marking Scheme Upload */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Marking Scheme</h3>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/5 p-4">
                {sourceMode === 'example' ? (
                  <p className="my-4 text-sm text-muted-foreground">
                    {paperType === 'paper2'
                      ? 'You have chosen example marking scheme (Paper 2).'
                      : 'You have chosen example marking scheme (Paper 1).'}
                  </p>
                ) : (
                  <>
                    {renderFilePreview(markingSchemeFile) || <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      ref={markingSchemeInputRef}
                      onChange={e => setMarkingSchemeFile(e.target.files?.[0] || null)}
                    />
                    <Button variant="secondary" className="mt-2" onClick={() => markingSchemeInputRef.current?.click()}>
                      {markingSchemeFile ? 'Change File' : 'Choose File'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              disabled={
                !paperType ||
                gradingLoading ||
                (sourceMode === 'upload' && paperType === 'paper1' && (!questionFile || !answerFile || !markingSchemeFile)) ||
                (sourceMode === 'upload' && paperType === 'paper2' && (!questionFile || !markingSchemeFile))
              }
              onClick={handleGrade}
            >
              {gradingLoading ? 'Grading...' : 'Grade My Answer'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide">Temporary Sample Upload (Local)</CardTitle>
          <CardDescription>
            Upload the 5 example files to Supabase storage. Keep this card local if you do not want to push it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'paper1Question', label: 'Upload here for example question paper1' },
            { key: 'paper1Answer', label: 'Upload here for example user answer paper1' },
            { key: 'paper1Marking', label: 'Upload here for example marking scheme paper1' },
            { key: 'paper2Question', label: 'Upload here for example question paper2' },
            { key: 'paper2Marking', label: 'Upload here for example marking scheme paper2' },
          ].map((slot) => (
            <div key={slot.key} className="rounded border border-border p-3">
              <p className="mb-2 text-sm font-medium">{slot.label}</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setSampleFileMap((prev) => ({ ...prev, [slot.key]: file }))
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => uploadSampleFile(slot.key)}
                  disabled={!sampleFileMap[slot.key]}
                >
                  Upload
                </Button>
                <span className="text-xs text-muted-foreground">{sampleUploadStatus[slot.key] || ''}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card> */}

      {/* Step 2: AI Response */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              2
            </span>
            AI Grading Result
            {gradingLoading && (
              <Loader2 className="ml-2 h-5 w-5 animate-spin text-primary" />
            )}
            {gradingResult && !gradingLoading && (
              <span className="ml-4 text-base font-semibold text-green-600">{gradingResult.score} / {gradingResult.total}</span>
            )}
          </CardTitle>
          <CardDescription>
            View your score, detailed feedback, and step-by-step explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gradingResult?.error && (
            <div className="mb-4 rounded border border-red-400 bg-red-50 p-4 text-red-700">
              <strong>Grading failed.</strong> {gradingResult.error}
            </div>
          )}
          {gradingResult && gradingResult.perQuestion && gradingResult.perQuestion.length === 0 && (
            <div className="mb-4 p-4 border border-red-400 bg-red-50 text-red-700 rounded">
              <strong>No grading result detected.</strong> Please check your uploaded files or try a clearer scan.<br/>
              <details className="mt-2">
                <summary className="cursor-pointer">Show OCR Debug Info</summary>
                <pre className="text-xs overflow-x-auto bg-gray-100 p-2 mt-2 rounded">
{gradingResult.ocrDebug ? `Marking Scheme OCR:\n${gradingResult.ocrDebug.markingSchemeText}\n\nAnswer OCR:\n${gradingResult.ocrDebug.answerText}` : 'No OCR debug info.'}
                </pre>
              </details>
            </div>
          )}
          {gradingResult ? (
            gradingResult.perQuestion && gradingResult.perQuestion.length > 0 ? (
              <div>
                <p className="mb-4 text-sm font-medium text-foreground">Current uploaded question result</p>
                <Tabs defaultValue="feedback" className="w-full">
                  <TabsList className="mb-4 grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                    <TabsTrigger value="solution">Model Solution</TabsTrigger>
                    <TabsTrigger value="concepts">Key Concepts</TabsTrigger>
                  </TabsList>
                  <TabsContent value="feedback">
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-3 text-muted-foreground">
                        {activeResult?.feedback || 'No feedback.'}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="solution">
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-3 text-muted-foreground">
                        {activeResult?.solution
                          || 'No solution available from AI output.'}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="concepts">
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-3 text-muted-foreground">
                        {activeResult?.concepts
                          || 'Key concepts were not returned for this question.'}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
                {gradingResult.rawResult && (
                  <details className="mt-4 rounded border border-border p-3">
                    <summary className="cursor-pointer font-medium">Show Raw AI Output</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
{gradingResult.rawResult}
                    </pre>
                  </details>
                )}
              </div>
            ) : null
          ) : (
            <Tabs defaultValue="feedback" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="solution">Model Solution</TabsTrigger>
                <TabsTrigger value="concepts">Key Concepts</TabsTrigger>
              </TabsList>
              <TabsContent value="feedback">
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-3 text-muted-foreground">
                    Upload and submit your answer to receive AI grading feedback
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="solution">
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-3 text-muted-foreground">
                    Model solution will appear after grading
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="concepts">
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-3 text-muted-foreground">
                    Key mathematical concepts will be explained here
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
