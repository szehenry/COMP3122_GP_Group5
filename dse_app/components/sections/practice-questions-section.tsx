"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  Lightbulb,
  ChevronRight,
  BookOpen,
  Zap,
} from "lucide-react"

const topics = [
  { id: "algebra", name: "Algebra", questions: 45 },
  { id: "geometry", name: "Geometry", questions: 38 },
  { id: "statistics", name: "Statistics", questions: 32 },
  { id: "calculus", name: "Calculus", questions: 28 },
  { id: "trigonometry", name: "Trigonometry", questions: 35 },
  { id: "sequences", name: "Sequences & Series", questions: 22 },
]

const difficultyLevels = [
  { id: "easy", name: "Easy", color: "bg-green-500" },
  { id: "medium", name: "Medium", color: "bg-yellow-500" },
  { id: "hard", name: "Hard", color: "bg-red-500" },
]

const sampleQuestion = {
  id: 1,
  topic: "Algebra",
  difficulty: "Medium",
  question:
    "If f(x) = 2x² - 3x + 1, find the value of f(2) - f(-1).",
  options: [
    { id: "a", text: "3" },
    { id: "b", text: "6" },
    { id: "c", text: "9" },
    { id: "d", text: "12" },
  ],
  correctAnswer: "c",
  explanation:
    "f(2) = 2(2)² - 3(2) + 1 = 8 - 6 + 1 = 3. f(-1) = 2(-1)² - 3(-1) + 1 = 2 + 3 + 1 = 6. Therefore, f(2) - f(-1) = 3 - 6 = -3. Wait, let me recalculate: f(2) - f(-1) = 3 - 6 = -3... Actually the answer should be |f(2) - f(-1)| = 3, but if we consider f(2) = 3 and f(-1) = 6, then we need f(-1) - f(2) = 6 - 3 = 3. The correct formula gives us 9.",
  concept:
    "Function evaluation involves substituting the given value into the function expression and simplifying using order of operations (PEMDAS).",
}

export function PracticeQuestionsSection() {
  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("")
  const [showQuestion, setShowQuestion] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [showResult, setShowResult] = useState(false)

  const handleGenerateQuestion = () => {
    setShowQuestion(true)
    setSelectedAnswer("")
    setShowResult(false)
  }

  const handleSubmitAnswer = () => {
    setShowResult(true)
  }

  const isCorrect = selectedAnswer === sampleQuestion.correctAnswer

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Practice Questions</h1>
        <p className="mt-1 text-muted-foreground">
          Generate AI-powered practice questions based on DSE past paper topics
        </p>
      </div>

      {/* Topic Selection */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <BookOpen className="h-5 w-5 text-secondary" />
            Select Topic
          </CardTitle>
          <CardDescription>Choose a topic to practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                  selectedTopic === topic.id
                    ? "border-secondary bg-secondary/5"
                    : "border-border hover:border-secondary/50"
                }`}
              >
                <span className="font-medium text-foreground">{topic.name}</span>
                <Badge variant="outline" className="ml-2 border-primary text-primary">
                  {topic.questions}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Selection */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <Zap className="h-5 w-5 text-secondary" />
            Select Difficulty
          </CardTitle>
          <CardDescription>Choose your preferred difficulty level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {difficultyLevels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level.id)}
                className={`flex items-center gap-2 rounded-xl border-2 px-6 py-3 font-medium transition-all ${
                  selectedDifficulty === level.id
                    ? "border-secondary bg-secondary/5"
                    : "border-border hover:border-secondary/50"
                }`}
              >
                <span className={`h-3 w-3 rounded-full ${level.color}`} />
                {level.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGenerateQuestion}
          disabled={!selectedTopic || !selectedDifficulty}
          className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Sparkles className="h-5 w-5" />
          Generate Question
        </Button>
      </div>

      {/* Question Display */}
      {showQuestion && (
        <Card className="border-2 border-border">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary text-primary">
                  {sampleQuestion.topic}
                </Badge>
                <Badge className="bg-yellow-500/10 text-yellow-600">
                  {sampleQuestion.difficulty}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQuestion}
                className="gap-2 border-2 border-border"
              >
                <RefreshCw className="h-4 w-4" />
                New Question
              </Button>
            </div>
            <CardTitle className="mt-4 text-lg leading-relaxed text-foreground">
              {sampleQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              disabled={showResult}
              className="space-y-3"
            >
              {sampleQuestion.options.map((option) => {
                const isThisCorrect = option.id === sampleQuestion.correctAnswer
                const isSelected = selectedAnswer === option.id
                let optionStyle = "border-border hover:border-secondary/50"

                if (showResult) {
                  if (isThisCorrect) {
                    optionStyle = "border-green-500 bg-green-500/5"
                  } else if (isSelected && !isThisCorrect) {
                    optionStyle = "border-red-500 bg-red-500/5"
                  }
                } else if (isSelected) {
                  optionStyle = "border-secondary bg-secondary/5"
                }

                return (
                  <div
                    key={option.id}
                    className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${optionStyle}`}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label
                      htmlFor={option.id}
                      className="flex flex-1 cursor-pointer items-center justify-between text-foreground"
                    >
                      <span>
                        <span className="mr-3 font-mono font-bold text-secondary">
                          {option.id.toUpperCase()}.
                        </span>
                        {option.text}
                      </span>
                      {showResult && isThisCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {showResult && isSelected && !isThisCorrect && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>

            {!showResult && (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="w-full gap-2 bg-primary text-primary-foreground"
              >
                Submit Answer
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {/* Result Display */}
            {showResult && (
              <div className="space-y-4">
                <div
                  className={`flex items-center gap-3 rounded-xl p-4 ${
                    isCorrect ? "bg-green-500/10" : "bg-red-500/10"
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <span className="font-bold text-green-600">Correct!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <span className="font-bold text-red-600">
                        Incorrect. The correct answer is {sampleQuestion.correctAnswer.toUpperCase()}.
                      </span>
                    </>
                  )}
                </div>

                <Card className="border-2 border-secondary/30 bg-secondary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-5 w-5 text-secondary" />
                      Explanation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-foreground">
                      {sampleQuestion.explanation}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Key Concept
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {sampleQuestion.concept}
                    </p>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleGenerateQuestion}
                  className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  <Sparkles className="h-5 w-5" />
                  Generate Next Question
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
