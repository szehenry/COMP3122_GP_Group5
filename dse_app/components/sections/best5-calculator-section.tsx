"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Info, RotateCcw } from "lucide-react"

const subjects = [
  { id: "chi", name: "Chinese Language", core: true },
  { id: "eng", name: "English Language", core: true },
  { id: "math", name: "Mathematics (Compulsory)", core: true },
  { id: "ls", name: "Citizenship & Social Development", core: true, fixed: true },
  { id: "m1", name: "Mathematics (M1)", core: false },
  { id: "m2", name: "Mathematics (M2)", core: false },
  { id: "phy", name: "Physics", core: false },
  { id: "chem", name: "Chemistry", core: false },
  { id: "bio", name: "Biology", core: false },
  { id: "bafs", name: "BAFS", core: false },
  { id: "econ", name: "Economics", core: false },
  { id: "geog", name: "Geography", core: false },
  { id: "hist", name: "History", core: false },
  { id: "ict", name: "ICT", core: false },
]

const grades = [
  { value: "5**", points: 7, label: "5**" },
  { value: "5*", points: 6, label: "5*" },
  { value: "5", points: 5, label: "5" },
  { value: "4", points: 4, label: "4" },
  { value: "3", points: 3, label: "3" },
  { value: "2", points: 2, label: "2" },
  { value: "1", points: 1, label: "1" },
  { value: "U", points: 0, label: "U" },
]

export function Best5CalculatorSection() {
  const [subjectGrades, setSubjectGrades] = useState<Record<string, string>>({
    chi: "",
    eng: "",
    math: "",
    ls: "A",
  })
  const [selectedElectives, setSelectedElectives] = useState<string[]>([])
  const [electiveGrades, setElectiveGrades] = useState<Record<string, string>>({})

  const handleElectiveToggle = (subjectId: string) => {
    if (selectedElectives.includes(subjectId)) {
      setSelectedElectives(selectedElectives.filter((id) => id !== subjectId))
      const newGrades = { ...electiveGrades }
      delete newGrades[subjectId]
      setElectiveGrades(newGrades)
    } else if (selectedElectives.length < 3) {
      setSelectedElectives([...selectedElectives, subjectId])
    }
  }

  const calculateBest5 = () => {
    const allGrades: number[] = []

    // Core subjects (except CS which is Attained/Not Attained)
    Object.entries(subjectGrades).forEach(([id, grade]) => {
      if (id !== "ls" && grade) {
        const gradeObj = grades.find((g) => g.value === grade)
        if (gradeObj) allGrades.push(gradeObj.points)
      }
    })

    // Electives
    Object.values(electiveGrades).forEach((grade) => {
      if (grade) {
        const gradeObj = grades.find((g) => g.value === grade)
        if (gradeObj) allGrades.push(gradeObj.points)
      }
    })

    // Sort descending and take best 5
    allGrades.sort((a, b) => b - a)
    return allGrades.slice(0, 5).reduce((sum, points) => sum + points, 0)
  }

  const handleReset = () => {
    setSubjectGrades({ chi: "", eng: "", math: "", ls: "A" })
    setSelectedElectives([])
    setElectiveGrades({})
  }

  const best5Score = calculateBest5()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Best 5 Calculator</h1>
        <p className="mt-1 text-muted-foreground">
          Calculate your JUPAS admission score based on your DSE results
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border-2 border-secondary/30 bg-secondary/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
        <div className="text-sm text-foreground">
          <p className="font-medium">How Best 5 Works</p>
          <p className="mt-1 text-muted-foreground">
            Your Best 5 score is calculated from your top 5 subject results. Core subjects (Chinese,
            English, Math) are required. Citizenship & Social Development is graded Attained/Not
            Attained and not counted in the score.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Core Subjects */}
        <Card className="border-2 border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-wide">
              Core Subjects
            </CardTitle>
            <CardDescription>Enter your grades for required subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjects
              .filter((s) => s.core)
              .map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{subject.name}</p>
                    {subject.fixed && (
                      <p className="text-sm text-muted-foreground">Attained / Not Attained</p>
                    )}
                  </div>
                  {subject.fixed ? (
                    <div className="rounded-lg bg-primary px-4 py-2 font-mono text-sm font-bold text-primary-foreground">
                      Attained
                    </div>
                  ) : (
                    <Select
                      value={subjectGrades[subject.id] || ""}
                      onValueChange={(value) =>
                        setSubjectGrades({ ...subjectGrades, [subject.id]: value })
                      }
                    >
                      <SelectTrigger className="w-28 border-2 border-border">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade.value} value={grade.value}>
                            {grade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Score Display */}
        <Card className="border-2 border-secondary bg-secondary/5">
          <CardContent className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Calculator className="h-12 w-12 text-secondary" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Best 5 Score
            </p>
            <p className="mt-2 text-6xl font-bold text-secondary">{best5Score}</p>
            <p className="mt-2 text-muted-foreground">out of 35</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="mt-6 gap-2 border-2 border-border"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Elective Subjects */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide">
            Elective Subjects
          </CardTitle>
          <CardDescription>
            Select up to 3 elective subjects ({selectedElectives.length}/3 selected)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects
              .filter((s) => !s.core)
              .map((subject) => {
                const isSelected = selectedElectives.includes(subject.id)
                return (
                  <div
                    key={subject.id}
                    className={`rounded-lg border-2 p-4 transition-all ${
                      isSelected
                        ? "border-secondary bg-secondary/5"
                        : "border-border hover:border-secondary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleElectiveToggle(subject.id)}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                            isSelected
                              ? "border-secondary bg-secondary"
                              : "border-border"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="h-3 w-3 text-secondary-foreground"
                              fill="currentColor"
                              viewBox="0 0 12 12"
                            >
                              <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7a1 1 0 00-1.414-1.414z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">{subject.name}</span>
                      </button>
                      {isSelected && (
                        <Select
                          value={electiveGrades[subject.id] || ""}
                          onValueChange={(value) =>
                            setElectiveGrades({ ...electiveGrades, [subject.id]: value })
                          }
                        >
                          <SelectTrigger className="w-20 border-2 border-border">
                            <SelectValue placeholder="--" />
                          </SelectTrigger>
                          <SelectContent>
                            {grades.map((grade) => (
                              <SelectItem key={grade.value} value={grade.value}>
                                {grade.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Grade Points Reference */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide">
            Grade Points Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {grades.map((grade) => (
              <div
                key={grade.value}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2"
              >
                <span className="font-mono font-bold text-foreground">{grade.label}</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono text-secondary">{grade.points} pts</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
