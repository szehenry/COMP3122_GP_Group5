"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, CheckCircle, MessageSquare, ChevronRight } from "lucide-react"

export function PastPapersSection() {
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedPaper, setSelectedPaper] = useState<string>("")
  const [selectedQuestion, setSelectedQuestion] = useState<string>("")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Past Paper Grading</h1>
        <p className="mt-1 text-muted-foreground">
          Upload your past paper answers and get AI-powered marking with explanations
        </p>
      </div>

      {/* Step 1: Select Paper */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              1
            </span>
            Select Past Paper
          </CardTitle>
          <CardDescription>Choose the DSE Mathematics past paper you want to grade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2023, 2022, 2021, 2020, 2019, 2018].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year} DSE
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Paper</label>
              <Select value={selectedPaper} onValueChange={setSelectedPaper}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="Select paper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paper1">Paper 1 (Conventional)</SelectItem>
                  <SelectItem value="paper2">Paper 2 (MC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Question</label>
              <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="Select question" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => (
                    <SelectItem key={i + 1} value={`q${i + 1}`}>
                      Question {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              2
            </span>
            Upload Your Answer
          </CardTitle>
          <CardDescription>
            Upload an image of your handwritten answer for AI grading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Question Preview */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Question</h3>
              <div className="flex aspect-[4/5] items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select a question to preview
                  </p>
                </div>
              </div>
            </div>

            {/* Answer Upload */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Your Answer</h3>
              <div className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary bg-secondary/5 transition-colors hover:bg-secondary/10">
                <Upload className="h-12 w-12 text-secondary" />
                <p className="mt-3 font-medium text-foreground">Upload Answer Image</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Drag & drop or click to browse
                </p>
                <Button variant="secondary" className="mt-4">
                  Choose File
                </Button>
              </div>
            </div>

            {/* Marking Scheme */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Marking Scheme</h3>
              <div className="flex aspect-[4/5] items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Auto-loaded when question selected
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="lg" className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Grade My Answer
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: AI Response */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              3
            </span>
            AI Grading Result
          </CardTitle>
          <CardDescription>
            View your score, detailed feedback, and step-by-step explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
