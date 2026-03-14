"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  Search,
  MapPin,
  Briefcase,
  BookOpen,
  ChevronRight,
  Star,
  Building2,
  Users,
} from "lucide-react"

const universities = [
  { id: "hku", name: "The University of Hong Kong", abbr: "HKU" },
  { id: "cuhk", name: "The Chinese University of Hong Kong", abbr: "CUHK" },
  { id: "hkust", name: "HKUST", abbr: "HKUST" },
  { id: "polyu", name: "The Hong Kong Polytechnic University", abbr: "PolyU" },
  { id: "cityu", name: "City University of Hong Kong", abbr: "CityU" },
  { id: "hkbu", name: "Hong Kong Baptist University", abbr: "HKBU" },
  { id: "lingu", name: "Lingnan University", abbr: "LU" },
  { id: "eduhk", name: "The Education University of Hong Kong", abbr: "EdUHK" },
]

const interests = [
  "Engineering",
  "Computer Science",
  "Business",
  "Medicine",
  "Science",
  "Social Science",
  "Arts",
  "Education",
  "Law",
  "Architecture",
]

const programmes = [
  {
    id: 1,
    name: "BEng in Computer Science",
    university: "HKU",
    score: 28,
    intake: 120,
    description:
      "A comprehensive programme covering software engineering, AI, and data science.",
    careers: ["Software Engineer", "Data Scientist", "Product Manager"],
    subjects: ["Programming", "Algorithms", "Machine Learning", "Database Systems"],
  },
  {
    id: 2,
    name: "BSc in Mathematics",
    university: "CUHK",
    score: 26,
    intake: 80,
    description:
      "Study pure and applied mathematics with specializations in various fields.",
    careers: ["Actuary", "Quantitative Analyst", "Data Analyst"],
    subjects: ["Calculus", "Linear Algebra", "Statistics", "Discrete Math"],
  },
  {
    id: 3,
    name: "BEng in Electronic Engineering",
    university: "HKUST",
    score: 27,
    intake: 100,
    description:
      "Focus on electronics, telecommunications, and embedded systems.",
    careers: ["Hardware Engineer", "Systems Engineer", "IoT Developer"],
    subjects: ["Circuits", "Signal Processing", "Embedded Systems", "Communications"],
  },
  {
    id: 4,
    name: "BSc in Actuarial Science",
    university: "HKU",
    score: 30,
    intake: 40,
    description:
      "Prepare for a career in risk assessment and insurance mathematics.",
    careers: ["Actuary", "Risk Analyst", "Insurance Consultant"],
    subjects: ["Probability", "Financial Math", "Risk Theory", "Life Contingencies"],
  },
  {
    id: 5,
    name: "BBA in Finance",
    university: "CUHK",
    score: 29,
    intake: 150,
    description:
      "Develop expertise in corporate finance, investments, and banking.",
    careers: ["Investment Banker", "Financial Analyst", "Portfolio Manager"],
    subjects: ["Corporate Finance", "Investment Analysis", "Financial Markets", "Derivatives"],
  },
]

export function UniversityIntakeSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [selectedProgramme, setSelectedProgramme] = useState<typeof programmes[0] | null>(null)
  const [best5Score] = useState(28)

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest))
    } else {
      setSelectedInterests([...selectedInterests, interest])
    }
  }

  const filteredProgrammes = programmes.filter((p) => p.score <= best5Score + 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">University Intake</h1>
        <p className="mt-1 text-muted-foreground">
          Explore university programmes based on your Best 5 score and interests
        </p>
      </div>

      {/* Score Banner */}
      <Card className="border-2 border-secondary bg-secondary/5">
        <CardContent className="flex flex-col items-center justify-between gap-6 p-6 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <GraduationCap className="h-8 w-8 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Best 5 Score</p>
              <p className="text-3xl font-bold text-foreground">
                {best5Score} <span className="text-lg text-muted-foreground">/ 35</span>
              </p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground">Programmes within reach</p>
            <p className="text-3xl font-bold text-secondary">{filteredProgrammes.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-wide">
            Find Programmes
          </CardTitle>
          <CardDescription>Search by interest or programme name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search programmes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-2 border-border pl-10"
            />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Select your interests</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => {
                const isSelected = selectedInterests.includes(interest)
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-secondary bg-secondary text-secondary-foreground"
                        : "border-border text-foreground hover:border-secondary/50"
                    }`}
                  >
                    {interest}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Programme List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            Recommended Programmes
          </h2>
          {filteredProgrammes.map((programme) => (
            <Card
              key={programme.id}
              className={`cursor-pointer border-2 transition-all hover:border-secondary ${
                selectedProgramme?.id === programme.id ? "border-secondary" : "border-border"
              }`}
              onClick={() => setSelectedProgramme(programme)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary text-primary">
                        {programme.university}
                      </Badge>
                      {programme.score <= best5Score && (
                        <Badge className="bg-green-500/10 text-green-600">
                          <Star className="mr-1 h-3 w-3" /> Good Match
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-2 font-bold text-foreground">{programme.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {programme.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Min. Score</p>
                    <p className="text-2xl font-bold text-secondary">{programme.score}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Programme Details */}
        <div>
          {selectedProgramme ? (
            <Card className="sticky top-6 border-2 border-secondary">
              <CardHeader className="bg-secondary/5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-secondary" />
                  <span className="font-medium text-foreground">{selectedProgramme.university}</span>
                </div>
                <CardTitle className="mt-2 text-xl">{selectedProgramme.name}</CardTitle>
                <CardDescription>{selectedProgramme.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Minimum Score</p>
                    <p className="text-2xl font-bold text-foreground">{selectedProgramme.score}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Annual Intake</p>
                    <p className="text-2xl font-bold text-foreground">{selectedProgramme.intake}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-secondary" />
                    <h4 className="font-semibold text-foreground">Key Subjects</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProgramme.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-secondary" />
                    <h4 className="font-semibold text-foreground">Career Paths</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedProgramme.careers.map((career) => (
                      <div
                        key={career}
                        className="flex items-center gap-2 rounded-lg border border-border p-3"
                      >
                        <ChevronRight className="h-4 w-4 text-secondary" />
                        <span className="text-sm text-foreground">{career}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Users className="h-4 w-4" />
                  View Full Programme Details
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-64 items-center justify-center border-2 border-dashed border-border">
              <div className="text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  Select a programme to view details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
