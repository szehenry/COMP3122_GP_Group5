"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, Target, Award, BarChart3 } from "lucide-react"

const gradeHistory = [
  { paper: "2024 Paper 1", score: 82, grade: "5*", date: "Mar 2024" },
  { paper: "2024 Paper 2", score: 78, grade: "5", date: "Mar 2024" },
  { paper: "2023 Paper 1", score: 75, grade: "5", date: "Feb 2024" },
  { paper: "2023 Paper 2", score: 80, grade: "5*", date: "Feb 2024" },
  { paper: "2022 Paper 1", score: 70, grade: "5", date: "Jan 2024" },
]

const topicPerformance = [
  { topic: "Algebra & Functions", score: 88, trend: "up" },
  { topic: "Geometry", score: 72, trend: "down" },
  { topic: "Statistics & Probability", score: 90, trend: "up" },
  { topic: "Calculus (M2)", score: 65, trend: "stable" },
  { topic: "Trigonometry", score: 78, trend: "up" },
  { topic: "Number & Coordinate", score: 85, trend: "stable" },
]

export function GradePredictionSection() {
  const predictedGrade = "5*"
  const averageScore = 77

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Grade Prediction</h1>
        <p className="mt-1 text-muted-foreground">
          AI-powered prediction based on your past paper performance
        </p>
      </div>

      {/* Main Prediction Card */}
      <Card className="border-2 border-secondary bg-card">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Predicted DSE Grade
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-7xl font-bold text-secondary">{predictedGrade}</span>
                <span className="text-2xl text-muted-foreground">/5**</span>
              </div>
              <p className="mt-3 text-muted-foreground">
                Based on {gradeHistory.length} completed past papers
              </p>
            </div>
            <div className="h-px w-full bg-border md:h-32 md:w-px" />
            <div className="grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-foreground">{averageScore}%</p>
                <p className="mt-1 text-sm text-muted-foreground">Average Score</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">+5%</p>
                <p className="mt-1 text-sm text-muted-foreground">Improvement</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Thresholds */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <Target className="h-5 w-5 text-secondary" />
            Grade Thresholds
          </CardTitle>
          <CardDescription>Historical DSE Mathematics grade boundaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { grade: "5**", min: 85, color: "bg-secondary" },
              { grade: "5*", min: 75, color: "bg-secondary/80" },
              { grade: "5", min: 65, color: "bg-primary" },
              { grade: "4", min: 55, color: "bg-primary/80" },
              { grade: "3", min: 45, color: "bg-muted-foreground" },
            ].map((item) => (
              <div key={item.grade} className="flex items-center gap-4">
                <span className="w-12 font-mono font-bold text-foreground">{item.grade}</span>
                <div className="flex-1">
                  <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${item.min}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-right font-mono text-sm text-muted-foreground">
                  {item.min}%+
                </span>
              </div>
            ))}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/10 p-3">
              <Award className="h-5 w-5 text-secondary" />
              <span className="text-sm text-foreground">
                Your average of <strong>{averageScore}%</strong> places you in the{" "}
                <strong className="text-secondary">{predictedGrade}</strong> range
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance by Topic */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <BarChart3 className="h-5 w-5 text-secondary" />
            Performance by Topic
          </CardTitle>
          <CardDescription>Your strengths and areas for improvement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {topicPerformance.map((item) => (
              <div
                key={item.topic}
                className="flex items-center gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.topic}</span>
                    <div className="flex items-center gap-2">
                      {item.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {item.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                      {item.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-mono text-sm font-bold text-secondary">
                        {item.score}%
                      </span>
                    </div>
                  </div>
                  <Progress value={item.score} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide">
            Paper History
          </CardTitle>
          <CardDescription>Your completed past papers and scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Paper
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                    Grade
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gradeHistory.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{item.paper}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm text-foreground">
                      {item.score}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-md bg-secondary px-2 py-1 font-mono text-sm font-bold text-secondary-foreground">
                        {item.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {item.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
