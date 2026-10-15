import { NavLink, Link } from "react-router-dom"
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Activity,
  FileText,
  Download,
  Calendar,
} from "lucide-react"
import { Github } from "@/components/ui/github-icon"
import { Button } from "@/components/ui/button"
import { AnalysisStatusBadge } from "@/components/analysis/AnalysisStatusBadge"
import type { Analysis } from "@/types"

interface AnalysisHeaderProps {
  analysis?: Analysis | null
  analysisId: string
  activeTab: "topics" | "trends" | "evaluation" | "corpus" | "exports"
}

export function AnalysisHeader({ analysis, analysisId, activeTab }: AnalysisHeaderProps) {
  const repoName = analysis?.repository_full_name || analysis?.repository?.full_name || "Repository Analysis"
  const status = analysis?.status || "completed"
  const kVal = analysis?.k ?? analysis?.num_topics ?? (analysis?.config?.num_topics as number | undefined) ?? "-"
  const issuesCount = analysis?.issue_count ?? analysis?.num_documents ?? analysis?.num_issues_fetched ?? "-"
  const vocabSize = analysis?.vocabulary_size ?? analysis?.vocab_size ?? "-"
  const coherence = typeof analysis?.coherence_cv === "number" ? analysis.coherence_cv.toFixed(3) : null

  const tabs = [
    { id: "topics", label: "Discovered Topics", to: `/app/analyses/${analysisId}/topics`, icon: BarChart3 },
    { id: "trends", label: "Prevalence Trends", to: `/app/analyses/${analysisId}/trends`, icon: TrendingUp },
    { id: "evaluation", label: "Model Evaluation", to: `/app/analyses/${analysisId}/evaluation`, icon: Activity },
    { id: "corpus", label: "Corpus & Preprocessing", to: `/app/analyses/${analysisId}/corpus`, icon: FileText },
    { id: "exports", label: "Export Reports", to: `/app/analyses/${analysisId}/exports`, icon: Download },
  ]

  return (
    <div className="space-y-4 border-b pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/app" title="Back to dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{repoName}</h1>
              <AnalysisStatusBadge status={status} />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Topics: <strong className="font-semibold text-foreground">K={kVal}</strong></span>
              <span>Documents: <strong className="font-semibold text-foreground">{issuesCount}</strong></span>
              <span>Vocabulary: <strong className="font-semibold text-foreground">{vocabSize}</strong></span>
              {coherence && (
                <span>Coherence: <strong className="font-semibold text-primary">{coherence}</strong> (C_v)</span>
              )}
              {analysis?.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {new Date(analysis.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {analysis?.repository?.html_url && (
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={analysis.repository.html_url} target="_blank" rel="noopener noreferrer">
              <Github className="size-3.5" />
              <span>View GitHub</span>
            </a>
          </Button>
        )}
      </div>

      {/* Analysis Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-1 pt-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="size-4" />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
