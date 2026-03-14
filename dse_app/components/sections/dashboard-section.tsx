"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Calculator,
  FileText,
  GraduationCap,
  LineChart,
  Sparkles,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react"

interface DashboardSectionProps {
  onNavigate: (section: string) => void
}

const quickActions = [
  {
    id: "past-papers",
    title: "Past Papers",
    description: "Grade your DSE past paper answers",
    icon: FileText,
    color: "bg-secondary",
  },
  {
    id: "grade-prediction",
    title: "Grade Prediction",
    description: "View your predicted DSE grade",
    icon: LineChart,
    color: "bg-primary",
  },
  {
    id: "best5-calculator",
    title: "Best 5 Calculator",
    description: "Calculate your JUPAS admission score",
    icon: Calculator,
    color: "bg-secondary",
  },
  {
    id: "university-intake",
    title: "University Intake",
    description: "Explore university programmes",
    icon: GraduationCap,
    color: "bg-primary",
  },
  {
    id: "practice-questions",
    title: "Practice Questions",
    description: "Generate AI-powered practice",
    icon: Sparkles,
    color: "bg-secondary",
  },
]

const recentActivity = [
  { title: "2023 Paper 1 Q15", score: "8/12", time: "2 hours ago" },
  { title: "2022 Paper 2 Q20", score: "10/10", time: "Yesterday" },
  { title: "2023 Paper 1 Q18", score: "6/8", time: "2 days ago" },
]

export function DashboardSection({ onNavigate }: DashboardSectionProps) {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="rounded-2xl border-2 border-border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, Student</h1>
            <p className="mt-1 text-muted-foreground">
              Continue your DSE Mathematics preparation journey
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Predicted Grade</p>
              <p className="text-3xl font-bold text-secondary">5*</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Papers Completed</p>
              <p className="text-3xl font-bold text-foreground">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-border">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
              <TrendingUp className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold text-foreground">78%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Study Hours</p>
              <p className="text-2xl font-bold text-foreground">24.5h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
              <Target className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Questions Solved</p>
              <p className="text-2xl font-bold text-foreground">156</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-bold uppercase tracking-wide text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-secondary hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${action.color}`}
                >
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-foreground group-hover:text-secondary">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent Activity & Progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-wide">
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest graded questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <FileText className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary px-3 py-1 font-mono text-sm font-bold text-secondary-foreground">
                  {activity.score}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-wide">
              Topic Progress
            </CardTitle>
            <CardDescription>Your mastery level by topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { topic: "Algebra", progress: 85 },
              { topic: "Geometry", progress: 72 },
              { topic: "Statistics", progress: 90 },
              { topic: "Calculus", progress: 65 },
              { topic: "Trigonometry", progress: 78 },
            ].map((item) => (
              <div key={item.topic} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{item.topic}</span>
                  <span className="font-mono text-sm font-bold text-secondary">
                    {item.progress}%
                  </span>
                </div>
                <Progress value={item.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
