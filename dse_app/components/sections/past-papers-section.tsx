"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, CheckCircle, MessageSquare, ChevronRight, Loader2 } from "lucide-react"

export function PastPapersSection() {
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [markingSchemeFile, setMarkingSchemeFile] = useState<File | null>(null)
  const [gradingResult, setGradingResult] = useState<any>(null)
  const [gradingLoading, setGradingLoading] = useState(false)
  const [selectedResultQuestion, setSelectedResultQuestion] = useState<number>(1)
  const [paperType, setPaperType] = useState<string>("")

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
    if (!questionFile || !answerFile || !markingSchemeFile || !paperType) return
    setGradingLoading(true)
    const formData = new FormData()
    formData.append('question', questionFile)
    formData.append('answer', answerFile)
    formData.append('markingScheme', markingSchemeFile)
    formData.append('paperType', paperType)
    // TODO: Add user_id if available
    const res = await fetch('/api/grade-paper', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    setGradingResult(data)
    setGradingLoading(false)
    setSelectedResultQuestion(1)
  }

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
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Question Paper Upload */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Question Paper</h3>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/5 p-4">
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
              </div>
            </div>
            {/* Answer Upload */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Your Answer</h3>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/5 p-4">
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
              </div>
            </div>
            {/* Marking Scheme Upload */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Marking Scheme</h3>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/5 p-4">
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
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              disabled={!paperType || !questionFile || !answerFile || !markingSchemeFile || gradingLoading}
              onClick={handleGrade}
            >
              {gradingLoading ? 'Grading...' : 'Grade My Answer'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

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
          {gradingResult && gradingResult.perQuestion && gradingResult.perQuestion.length === 0 && (
            <div className="mb-4 p-4 border border-red-400 bg-red-50 text-red-700 rounded">
              <strong>No questions detected.</strong> Please check your marking scheme file or try a clearer scan.<br/>
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
                <div className="mb-4 flex items-center gap-2">
                  <label className="font-medium">Select Question:</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={selectedResultQuestion}
                    onChange={e => setSelectedResultQuestion(Number(e.target.value))}
                  >
                    {gradingResult.perQuestion.map((q: any, idx: number) => (
                      <option key={q.q} value={q.q}>Question {q.q}</option>
                    ))}
                  </select>
                </div>
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
                        {gradingResult.perQuestion.find((q: any) => q.q === selectedResultQuestion)?.feedback || 'No feedback.'}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="solution">
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-3 text-muted-foreground">
                        {gradingResult.perQuestion.find((q: any) => q.q === selectedResultQuestion)?.solution
                          || 'No solution available from AI output.'}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="concepts">
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                      <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-3 text-muted-foreground">
                        {gradingResult.perQuestion.find((q: any) => q.q === selectedResultQuestion)?.concepts
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
