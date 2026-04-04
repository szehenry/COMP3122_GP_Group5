"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileImage, Lightbulb, Loader2, Sparkles, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

interface GenerateMathQuestionResponse {
  generatedQuestion?: string
  answer?: string
  stepExplanation?: string
  mathTopic?: string
  conceptExplanation?: string
  explanation?: string
  sourceExtractionMode?: "vision-primary" | "ocr-fallback"
  ocrExtractedText?: string
  error?: string
}

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

function normalizeMathMarkdown(input: string): string {
  if (!input) {
    return ""
  }

  return input
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr: string) => `\n$$${expr.trim()}$$\n`)
    .replace(/\\\((.*?)\\\)/g, (_, expr: string) => `$${expr.trim()}$`)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function formatExplanationNarrative(input: string): string {
  const normalized = normalizeMathMarkdown(input)
  if (!normalized) {
    return ""
  }

  const cleaned = normalized
    .replace(/\bStep\s*(\d+)\s*:/gi, "\nStep $1:")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  const stepMatches = [...cleaned.matchAll(/Step\s*(\d+)\s*:\s*([\s\S]*?)(?=\nStep\s*\d+\s*:|$)/gi)]

  const normalizeStepBlock = (stepNumber: string, content: string): string => {
    const stepText = content.replace(/\s+/g, " ").trim()
    const blockFormulas = [...stepText.matchAll(/\$\$([\s\S]*?)\$\$/g)].map((m) => m[1].trim())
    const inlineFormulas = [...stepText.matchAll(/\$([^$]+)\$/g)].map((m) => m[1].trim())

    const formulas = [...blockFormulas, ...inlineFormulas].filter((x) => x.length > 0)
    const textWithoutFormulas = stepText
      .replace(/\$\$[\s\S]*?\$\$/g, "")
      .replace(/\$[^$]+\$/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s*([.,;:!?])/g, "$1")
      .trim()

    const prettyStepText = textWithoutFormulas || "Apply this transformation."
    const formulaLine = formulas[0] ? `$$${formulas[0]}$$` : "$$\\text{(derive the equation for this step)}$$"
    return `Step ${stepNumber}: ${prettyStepText}\n\n${formulaLine}`
  }

  if (stepMatches.length > 0) {
    return stepMatches
      .map((match) => normalizeStepBlock(match[1], match[2]))
      .join("\n\n")
  }

  const sentenceChunks = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return sentenceChunks
    .map((chunk, index) => {
      const formulas = [...chunk.matchAll(/\$([^$]+)\$/g)].map((m) => m[1].trim())
      const textOnly = chunk.replace(/\$[^$]+\$/g, "").replace(/\s{2,}/g, " ").trim()
      const formulaLine = formulas[0] ? `$$${formulas[0]}$$` : "$$\\text{(derive the equation for this step)}$$"
      return `Step ${index + 1}: ${textOnly || "Apply this transformation."}\n\n${formulaLine}`
    })
    .join("\n\n")
}

function getStatusErrorMessage(status: number): string {
  if (status === 504) {
    return "Generation timed out. Please retry with a clearer/cropped image or try again in a moment."
  }
  if (status === 413) {
    return "Image is too large. Please upload a file smaller than 5MB."
  }
  if (status === 422) {
    return "Could not extract enough text from this image. Please upload a clearer one."
  }
  if (status >= 500) {
    return "Server is busy right now. Please try again shortly."
  }
  return "Failed to generate a similar question. Please try again."
}

export default function DseMathGeneratorPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [generatedQuestion, setGeneratedQuestion] = useState("")
  const [conceptSummary, setConceptSummary] = useState("")
  const [answerExplanation, setAnswerExplanation] = useState("")
  const [ocrExtractedText, setOcrExtractedText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastRequestFailed, setLastRequestFailed] = useState(false)
  const [sourceMode, setSourceMode] = useState<"vision-primary" | "ocr-fallback" | "">("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedFileName = useMemo(() => selectedFile?.name ?? "No file selected", [selectedFile])
  const formattedFileSize = useMemo(() => {
    if (!selectedFile) {
      return ""
    }

    return `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
  }, [selectedFile])

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("")
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedFile])

  const resetOutput = () => {
    setGeneratedQuestion("")
    setConceptSummary("")
    setAnswerExplanation("")
    setOcrExtractedText("")
    setSourceMode("")
  }

  const resetFileSelection = () => {
    setSelectedFile(null)
    setError("")
    setLastRequestFailed(false)
    resetOutput()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const validateFile = (file: File): string => {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return "Please upload an image file in PNG, JPG, JPEG, or WebP format."
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return "Image is too large. Please upload a file smaller than 5MB."
    }

    return ""
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    if (!nextFile) {
      resetFileSelection()
      return
    }

    const validationError = validateFile(nextFile)
    if (validationError) {
      setSelectedFile(null)
      setLastRequestFailed(false)
      resetOutput()
      setError(validationError)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    setSelectedFile(nextFile)
    setLastRequestFailed(false)
    setError("")
    resetOutput()
  }

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError("Please upload a question image first.")
      return
    }

    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError("")
    setLastRequestFailed(false)
    resetOutput()

    try {
      const formData = new FormData()
      formData.append("questionImage", selectedFile)

      const response = await fetch("/api/generate-math-question", {
        method: "POST",
        body: formData,
      })

      const contentType = response.headers.get("content-type") || ""
      const isJson = contentType.includes("application/json")
      let payload: GenerateMathQuestionResponse = {}
      let responseText = ""

      if (isJson) {
        try {
          payload = (await response.json()) as GenerateMathQuestionResponse
        } catch {
          responseText = await response.text().catch(() => "")
        }
      } else {
        responseText = await response.text()
      }

      if (!response.ok) {
        throw new Error(payload.error || getStatusErrorMessage(response.status))
      }

      if (!isJson) {
        throw new Error(
          responseText
            ? `Unexpected server response: ${responseText.slice(0, 120)}`
            : "Unexpected server response format."
        )
      }

      const nextGeneratedQuestion = normalizeMathMarkdown(payload.generatedQuestion?.trim() || "")
      const answer = normalizeMathMarkdown(payload.answer?.trim() || "")
      const explanation = formatExplanationNarrative(
        (payload.stepExplanation || payload.explanation || "").trim()
      )
      const mathTopic = normalizeMathMarkdown(payload.mathTopic?.trim() || "")
      const conceptExplanation = normalizeMathMarkdown(payload.conceptExplanation?.trim() || "")

      if (!nextGeneratedQuestion || !answer || !explanation || !mathTopic || !conceptExplanation) {
        throw new Error("Generation succeeded but response is incomplete. Please retry.")
      }

      setGeneratedQuestion(nextGeneratedQuestion)
      setConceptSummary(`### Topic\n\n${mathTopic}\n\n### Concept Used\n\n${conceptExplanation}`)
      setAnswerExplanation(`### Answer\n\n${answer}\n\n### Step-by-step explanation\n\n${explanation}`)
      setOcrExtractedText(payload.ocrExtractedText?.trim() || "")
      setSourceMode(payload.sourceExtractionMode || "")
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate the question right now. Please try again."
      setError(message)
      setLastRequestFailed(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">DSE Math Question Generator</h1>
            <p className="mt-1 text-muted-foreground">
              Upload a DSE math question image, then generate a similar question with answer and
              explanation.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            {lastRequestFailed && (
              <Button onClick={handleGenerate} disabled={!selectedFile || isLoading} size="sm">
                Retry
              </Button>
            )}
          </div>
        )}

        <section className="space-y-6">
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
                <FileImage className="h-5 w-5 text-secondary" />
                Upload Question
              </CardTitle>
              <CardDescription>
                Upload one image file for your source DSE question.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">Selected: {selectedFileName}</p>
              {selectedFile && <p className="text-xs text-muted-foreground">Size: {formattedFileSize}</p>}

              {previewUrl && (
                <div className="overflow-hidden rounded-md border border-border">
                  <img
                    src={previewUrl}
                    alt="Selected math question preview"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" disabled={!selectedFile || isLoading} onClick={handleGenerate}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Similar Question
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  disabled={!selectedFile || isLoading}
                  onClick={resetFileSelection}
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
                <Sparkles className="h-5 w-5 text-secondary" />
                Generated Question
              </CardTitle>
              <CardDescription>Generated similar question from your uploaded source image.</CardDescription>
            </CardHeader>
            <CardContent>
              {sourceMode && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Extraction mode: {sourceMode === "vision-primary" ? "Vision primary" : "OCR fallback"}
                </p>
              )}
              {generatedQuestion ? (
                <div className="space-y-5">
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {generatedQuestion}
                    </ReactMarkdown>
                  </div>
                  {conceptSummary && (
                    <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-3">
                      <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {conceptSummary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Upload a valid image and click Generate to see a similar DSE-style question here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
                <Lightbulb className="h-5 w-5 text-secondary" />
                Answer and Explanation
              </CardTitle>
              <CardDescription>Model answer and step-by-step explanation will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              {answerExplanation ? (
                <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {answerExplanation}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  The answer and step-by-step explanation will appear after successful generation.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
                <FileImage className="h-5 w-5 text-secondary" />
                OCR Extracted Text
              </CardTitle>
              <CardDescription>Raw text recognized from your uploaded question image.</CardDescription>
            </CardHeader>
            <CardContent>
              {ocrExtractedText ? (
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">{ocrExtractedText}</p>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  OCR extracted text will appear here after generation starts.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}