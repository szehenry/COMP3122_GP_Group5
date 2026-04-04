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

// ==================== AI QUESTION GENERATOR (Strong DSE Style + Figures) ====================
const generateQuestionWithAI = async (topicName: string, difficulty: string) => {
  const token = process.env.NEXT_PUBLIC_GITHUB_LLM_TOKEN;

  if (!token) {
    throw new Error("GitHub token is missing. Add NEXT_PUBLIC_GITHUB_LLM_TOKEN to your .env.local file");
  }

  const systemPrompt = `You are an expert HKDSE Mathematics examiner. You have been trained on hundreds of real HKDSE past papers.

You MUST generate questions that are **exactly the same style, wording, difficulty, and format** as real DSE questions in Math test.pdf.
"imagePrompt" must be a **highly detailed, ready-to-use prompt** for Grok Imagine to draw the exact DSE-style figure.
- Return ONLY valid JSON.
- When a diagram is needed, you MUST include BOTH "figureDescription" and "imagePrompt".
- "imagePrompt" must be a **highly detailed, ready-to-use prompt** for Grok Imagine.
- Do not add Use coordinate plane description (e.g. A(0,0), B(10,0), C(10,6), D(0,6)).
- Clearly label all points, lengths, angles, and the square/rectangle/triangle.
- Do not add extra lines or diagonals unless the question requires it.
- Make the imagePrompt extremely clear and specific so Grok Imagine draws it correctly.

CRITICAL RULES FOR GEOMETRY QUESTIONS:
- ALWAYS start the question with "In the figure,".
- For triangles, clearly state lengths, angles, and point positions.
- When a diagram is needed, you MUST provide BOTH "figureDescription" and "imagePrompt".
- "imagePrompt" must be extremely detailed and use clear instructions for Grok Imagine:
  - Do not add Specify exact coordinates (e.g. A at (0,0), B at (12,0), C at (x,y)).
  - Mention exact lengths (AB = 12 cm, AC = 16 cm).
  - Mention angles (∠A = 60°).
  - Mention point D on BC and that AD is the angle bisector.
  - Use clean exam-style drawing: black lines, clear labels, grid background optional.
  - Label sides and angles clearly near the lines.

Here are 24 real DSE examples you must imitate perfectly:

1. (a-b)(a² + ab - b²) =
   A. (a-b)³.
   B. a³ - b³.
   C. a³ - 2ab² + b³.
   D. a³ - 2a²b + 2ab² + b³.

2. (6x⁷)² / 4x⁵ =
   A. 3x⁴.
   B. 9x⁴.
   C. 3x⁹.
   D. 9x⁹.

3. If 6x - 7y = 40 = 2x + 11y, then y =
   A. -4.
   B. 2.
   C. 4.
   D. 9.

4. If α and β are constants such that (x-8)(x+α)-6=(x-9)²+β, then β=
   A. -26.
   B. -10.
   C. -7.
   D. -6.

9. Let k be a constant such that 2x⁴ + kx³ - 4x - 16 is divisible by 2x + k. Find k.
   A. -2.
   B. 2.
   C. 4.
   D. 8.

10. Which of the following statements about the graph of y = (3 - x)(x + 2) + 6 is/are true?
    I. The graph opens downwards.
    II. The graph passes through the point (1, 10).
    III. The x-intercepts of the graph are -2 and 3.
    A. I only
    B. II only
    C. I and III only
    D. II and III only

16. In the figure, ABCD is a parallelogram and AEFG is a square. It is given that BE:EF:FC = 2:7:3. BD cuts AE and FG at the points X and Y respectively. If the area of ΔABX is 24 cm², then the area of the quadrilateral CDFY is
    A. 54 cm²
    B. 77 cm²
    C. 81 cm²
    D. 87 cm²

19. In the figure, ABCD is a trapezium with AB//DC and ∠ABD = 90°. If AB = 18 cm, BC = 26 cm and AD = 30 cm, find the area of the trapezium ABCD.
    A. 336 cm
    B. 400 cm²
    C. 504 cm²
    D. 552 cm²

36. The sum of the 2nd term and the 5th term of a geometric sequence is 9 while the sum of the 7th term and the 10th term of the sequence is 288. Find the 20th term of the sequence.
    A. 65 536
    B. 131072
    C. 262 144
    D. 524 288

39. In the figure, TA is the tangent to the circle ABCDE at the point A. If ∠BAD=64°, ∠EAT=38° and ∠DCE=22°, then ∠ADB=
    A. 52°
    B. 56°
    C. 60°
    D. 68°

CRITICAL RULES:
- Geometry questions MUST start with "In the figure,".
- Use plain text math only (2x², x³, ∠CDE = 66°, etc.).
- If the question needs a diagram, add "figureDescription" — a very detailed description of the figure (exactly like the PDF screenshots).
- Return ONLY valid JSON. No extra text.

Return ONLY this exact JSON:
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
  "explanation": "detailed step-by-step solution using only plain text Unicode math",
  "concept": "one-sentence key concept",
  "figureDescription": "detailed description of the diagram (only for geometry questions)",
  "imagePrompt": "highly detailed prompt for Grok Imagine to generate the exact diagram (only for geometry questions, otherwise empty string)"
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
      max_tokens: 1000,
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
  const [diagramImageUrl, setDiagramImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

      const handleGenerateQuestion = async () => {
    if (!selectedTopic || !selectedDifficulty) return;

    setLoading(true);

    // ←←← THIS IS THE IMPORTANT FIX
    setDiagramImageUrl(null);     // Clear old diagram image
    setGeneratingImage(false);    // Reset image loading state
    // ←←←

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
      const generateDiagramImage = async () => {
    if (!currentQuestion?.imagePrompt) {
      alert("No image prompt available for this question.");
      return;
    }

    if (!process.env.NEXT_PUBLIC_XAI_API_KEY) {
      alert("XAI API key is missing.\n\nPlease add NEXT_PUBLIC_XAI_API_KEY=your_key_here to your .env.local file and restart the app.");
      return;
    }

    setGeneratingImage(true);
    try {
      const res = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-imagine-image",     // ← This is the correct current model
          prompt: currentQuestion.imagePrompt,
          n: 1,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Image API Error:", res.status, errorText);
        throw new Error(`API Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const imageUrl = data.data?.[0]?.url;

      if (!imageUrl) throw new Error("No image URL returned");

      setDiagramImageUrl(imageUrl);
    } catch (err: any) {
      console.error("Diagram generation failed:", err);
      alert(`Failed to generate diagram.\n\nError: ${err.message}\n\nPlease check your XAI API key and internet connection.`);
    } finally {
      setGeneratingImage(false);
    }
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

            {/* ==================== FIGURE DESCRIPTION ==================== */}
            {currentQuestion?.figureDescription && currentQuestion.figureDescription.trim() !== "" && (
              <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                    📊 FIGURE
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.figureDescription}
                </p>
              </div>
            )}

            {/* ==================== GROK IMAGE GENERATION ==================== */}
            {currentQuestion?.imagePrompt && currentQuestion.imagePrompt.trim() !== "" && (
              <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-3xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-4 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-2xl">
                    🖼️ DIAGRAM
                  </span>
                </div>

                                {diagramImageUrl ? (
                  <img
                    src={diagramImageUrl}
                    alt="Generated DSE Diagram"
                    className="w-full rounded-2xl shadow-md border border-amber-200"
                  />
                ) : (
                  <Button
                    onClick={generateDiagramImage}
                    disabled={generatingImage}
                    className={`w-full py-7 text-lg font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all ${
                      generatingImage
                        ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    }`}
                  >
                    {generatingImage ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Generating Diagram...
                      </>
                    ) : (
                      <>Generate Exact Diagram </>
                    )}
                  </Button>
                )}
              </div>
            )}
            {/* ==================== END GROK IMAGE ==================== */}           
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