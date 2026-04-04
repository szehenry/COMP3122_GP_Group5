"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileImage, Lightbulb, Sparkles } from "lucide-react"

export default function DseMathGeneratorPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [generatedQuestion, setGeneratedQuestion] = useState("")
  const [answerExplanation, setAnswerExplanation] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedFileName = useMemo(() => selectedFile?.name ?? "No file selected", [selectedFile])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    setSelectedFile(nextFile)
    setError("")
  }

  const handleGenerateStub = () => {
    setIsLoading(true)
    setError("")
    setGeneratedQuestion("")
    setAnswerExplanation("")

    // Phase 1 is UI shell only. API wiring will be added in Phase 2.
    window.setTimeout(() => {
      setIsLoading(false)
      setError("Generation is not connected yet. This will be enabled in Phase 2.")
    }, 400)
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
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
                <FileImage className="h-5 w-5 text-secondary" />
                Upload Question
              </CardTitle>
              <CardDescription>
                Phase 1 shell: choose one image file for your source DSE question.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">Selected: {selectedFileName}</p>
              <Button
                className="w-full"
                disabled={!selectedFile || isLoading}
                onClick={handleGenerateStub}
              >
                <Sparkles className="h-4 w-4" />
                {isLoading ? "Preparing..." : "Generate Similar Question"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
                <Sparkles className="h-5 w-5 text-secondary" />
                Generated Question
              </CardTitle>
              <CardDescription>
                Similar question output will appear here after backend integration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedQuestion ? (
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">{generatedQuestion}</p>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Placeholder: generated similar question will be shown in Phase 2.
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
              <CardDescription>
                Model answer and step-by-step explanation will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {answerExplanation ? (
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">{answerExplanation}</p>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Placeholder: answer and step explanation will be shown in Phase 2.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}