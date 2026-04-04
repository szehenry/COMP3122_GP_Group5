"use client"

import { useEffect, useState } from "react"
import { SidebarNav } from "@/components/sidebar-nav"
import { DashboardSection } from "@/components/sections/dashboard-section"
import { PastPapersSection } from "@/components/sections/past-papers-section"
import { GradePredictionSection } from "@/components/sections/grade-prediction-section"
import { Best5CalculatorSection } from "@/components/sections/best5-calculator-section"
import { UniversityIntakeSection } from "@/components/sections/university-intake-section"
import { PracticeQuestionsSection } from "@/components/sections/practice-questions-section"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section")
    if (section) {
      setActiveSection(section)
    }
  }, [])

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection onNavigate={setActiveSection} />
      case "past-papers":
        return <PastPapersSection />
      case "grade-prediction":
        return <GradePredictionSection />
      case "best5-calculator":
        return <Best5CalculatorSection />
      case "university-intake":
        return <UniversityIntakeSection />
      case "practice-questions":
        return <PracticeQuestionsSection />
      default:
        return <DashboardSection onNavigate={setActiveSection} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <svg
              className="h-5 w-5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold">DSETutor</h1>
            <p className="text-xs text-muted-foreground">Math Edition</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile toggleable */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarNav
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section)
            setSidebarOpen(false)
          }}
        />
      </div>

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{renderSection()}</div>
      </main>
    </div>
  )
}
