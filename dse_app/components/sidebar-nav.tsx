"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Calculator,
  FileText,
  GraduationCap,
  Home,
  LineChart,
  Sparkles,
  SquarePen,
  Settings,
  User,
} from "lucide-react"

interface SidebarNavProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "past-papers", label: "Past Papers Gradings", icon: FileText },
  { id: "grade-prediction", label: "Grade Prediction", icon: LineChart },
  { id: "best5-calculator", label: "Best 5 Calculator", icon: Calculator },
  { id: "university-intake", label: "University Intake", icon: GraduationCap },
  { id: "practice-questions", label: "Practice Questions", icon: Sparkles },
  {
    id: "dse-math-generator",
    label: "Math Generator",
    icon: SquarePen,
    href: "/dse-math-generator",
  },
]

export function SidebarNav({ activeSection, onSectionChange }: SidebarNavProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">DSETutor</h1>
          <p className="text-xs text-sidebar-foreground/70">Math Edition</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Learning
        </p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary">
            <User className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">Student</p>
            <p className="truncate text-xs text-sidebar-foreground/60">F.6 Mathematics</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
