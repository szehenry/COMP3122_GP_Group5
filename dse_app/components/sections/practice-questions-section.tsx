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

// ==================== AI QUESTION GENERATOR ====================
const generateQuestionWithAI = async (topicName: string, difficulty: string) => {
  const token = process.env.NEXT_PUBLIC_GITHUB_LLM_TOKEN;

  if (!token) {
    throw new Error("GitHub token is missing. Add NEXT_PUBLIC_GITHUB_LLM_TOKEN to your .env.local file");
  }


const systemPrompt = `You are an expert HKDSE Mathematics examiner. Generate ONE brand-new multiple-choice question that is **extremely similar in style, wording, format, and difficulty** to the real DSE past-paper questions provided in the Math test.pdf.

CRITICAL STYLE RULES (match these exactly):
- Use formal, concise DSE-style English.
- Start questions with phrases like: "If ...", "Let k be a constant such that ...", "In the figure,", "It is given that ...", "The ...", "Which of the following ... is/are true?", etc.
- Geometry questions almost always begin with "In the figure,".
- Algebra questions often involve expansion, factorisation, substitution, or constants.
- For all mathematical expressions, use **plain text with Unicode** (e.g. 2x², x³, ∠CDE = 66°). 
- **DO NOT use any $ or $$ LaTeX delimiters**.
- Options must be short, realistic distractors.
- Never add extra explanations or markdown in the JSON.

Return ONLY a valid JSON object with this exact structure (no extra text):
{
  "id": 999,
  "topic": "${topicName}",
  "difficulty": "${difficulty}",
  "question": "full question text here",
  "options": [
    {"id": "a", "text": "option text"},
    {"id": "b", "text": "option text"},
    {"id": "c", "text": "option text"},
    {"id": "d", "text": "option text"}
  ],
  "correctAnswer": "c",
  "explanation": "detailed step-by-step solution with all calculations shown",
  "concept": "one-sentence key concept name"
}

Now generate one new ${difficulty} level question on the topic "${topicName}".`;
  const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate one ${difficulty} ${topicName} DSE-style question now.` }
      ],
      temperature: 0.65,
      max_tokens: 900,
    }),
  });

  if (!response.ok) throw new Error("API error");

  const data = await response.json();
  const jsonString = data.choices[0].message.content.trim();
  return JSON.parse(jsonString);
};
// ==================== END OF AI GENERATOR ====================

export function PracticeQuestionsSection() {
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQuestion = async () => {
    if (!selectedTopic || !selectedDifficulty) return;

    setLoading(true);
    try {
      const topicName = topics.find(t => t.id === selectedTopic)?.name || selectedTopic;
      const generated = await generateQuestionWithAI(topicName, selectedDifficulty);
      setCurrentQuestion(generated);
      setShowQuestion(true);
      setSelectedAnswer("");
      setShowResult(false);
    } catch (err) {
      console.error(err);
      alert("Failed to generate question. Please check your GitHub token and internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    setShowResult(true);
  };

  if (showQuestion && !currentQuestion) return null;

  const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Practice Questions</h1>
        <p className="mt-1 text-muted-foreground">
          Generate AI-powered practice questions based on DSE past paper topics
        </p>
      </div>

      {/* Topic Selection - FULL RESTORED */}
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

      {/* Difficulty Selection - FULL RESTORED */}
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
          disabled={!selectedTopic || !selectedDifficulty || loading}
          className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Sparkles className="h-5 w-5" />
          {loading ? "Generating AI Question..." : "Generate Question"}
        </Button>
      </div>

      {/* Question Display */}
      {showQuestion && currentQuestion && (
        <Card className="border-2 border-border">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary text-primary">
                  {currentQuestion.topic}
                </Badge>
                <Badge className={`${
                  currentQuestion.difficulty === "Easy" ? "bg-green-500/10 text-green-600" :
                  currentQuestion.difficulty === "Medium" ? "bg-yellow-500/10 text-yellow-600" :
                  "bg-red-500/10 text-red-600"
                }`}>
                  {currentQuestion.difficulty}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQuestion}
                disabled={loading}
                className="gap-2 border-2 border-border"
              >
                <RefreshCw className="h-4 w-4" />
                New Question
              </Button>
            </div>
            <CardTitle className="mt-4 text-lg leading-relaxed text-foreground">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              disabled={showResult}
              className="space-y-3"
            >
              {currentQuestion.options.map((option: any) => {
                const isThisCorrect = option.id === currentQuestion.correctAnswer;
                const isSelected = selectedAnswer === option.id;
                let optionStyle = "border-border hover:border-secondary/50";

                if (showResult) {
                  if (isThisCorrect) {
                    optionStyle = "border-green-500 bg-green-500/5";
                  } else if (isSelected && !isThisCorrect) {
                    optionStyle = "border-red-500 bg-red-500/5";
                  }
                } else if (isSelected) {
                  optionStyle = "border-secondary bg-secondary/5";
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
                );
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
                        Incorrect. The correct answer is {currentQuestion.correctAnswer.toUpperCase()}.
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
                      {currentQuestion.explanation}
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
                      {currentQuestion.concept}
                    </p>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleGenerateQuestion}
                  disabled={loading}
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
  );
}