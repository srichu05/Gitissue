import React, { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  PlusCircle,
  BarChart3,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Trash2,
  Search,
  ExternalLink,
  Download,
  Activity,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalysisStatusBadge } from "@/components/analysis/AnalysisStatusBadge"
import { useAnalyses, useDeleteAnalysis } from "@/hooks/useApi"

type StatusFilter = "all" | "completed" | "running" | "failed"

export function HistoryPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAnalyses(1, 50)
  const deleteMutation = useDeleteAnalysis()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const analyses = data?.items || []

  // Compute status counts
  const counts = useMemo(() => {
    let completed = 0
    let running = 0
    let failed = 0

    analyses.forEach((a) => {
      const s = String(a.status).toLowerCase()
      if (s === "completed") completed++
      else if (s === "failed") failed++
      else running++
    })

    return { total: analyses.length, completed, running, failed }
  }, [analyses])

  // Filter analyses by search query & status
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((a) => {
      // 1. Status Filter
      const s = String(a.status).toLowerCase()
      if (statusFilter === "completed" && s !== "completed") return false
      if (statusFilter === "failed" && s !== "failed") return false
      if (statusFilter === "running" && (s === "completed" || s === "failed")) return false

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const name = (a.repository_full_name || "").toLowerCase()
        return name.includes(query)
      }

      return true
    })
  }, [analyses, statusFilter, searchQuery])

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete the analysis for "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 mt-1" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Failed to load analysis history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unable to reach the GitIssue API service."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analysis History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete audit log of all historical repository topic modeling jobs, evaluations, and exports.
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/analyze")}
          className="gap-2 bg-white text-zinc-950 hover:bg-white/90 font-medium shadow-sm transition-all"
        >
          <PlusCircle className="size-4 text-zinc-950" /> New Analysis
        </Button>
      </div>

      {analyses.length === 0 ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <EmptyState
            title="No analyses recorded yet"
            description="Run your first GitHub issue topic modeling job to build your analysis history."
            icon={<BarChart3 className="size-6" />}
            action={
              <Button
                onClick={() => navigate("/app/analyze")}
                className="bg-white text-zinc-950 hover:bg-white/90 font-medium"
              >
                <PlusCircle className="size-4 mr-2" /> Start First Analysis
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search repositories (e.g. storytold/wordcraft)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 bg-card/60 border-border/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border/60 bg-card/40">
              {(
                [
                  { id: "all", label: "All Runs", count: counts.total },
                  { id: "completed", label: "Completed", count: counts.completed },
                  { id: "running", label: "Active", count: counts.running },
                  { id: "failed", label: "Failed", count: counts.failed },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-white/15 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[11px] tabular-nums opacity-75">
                      ({tab.count})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* List of Historical Analyses */}
          {filteredAnalyses.length === 0 ? (
            <Card className="border-border/60 bg-card/40 py-12 text-center">
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-foreground">No matching analyses found</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search terms or filter criteria.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                  }}
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAnalyses.map((a) => {
                const isFinished = String(a.status).toLowerCase() === "completed"
                const targetRoute = isFinished
                  ? `/app/analyses/${a.id}/topics`
                  : `/app/analyses/${a.id}`

                const issueCount = a.num_documents || a.issue_count || a.num_issues_fetched || 0
                const kVal = a.num_topics || a.k
                const vocabVal = a.vocab_size || a.vocabulary_size
                const coherence = typeof a.coherence_cv === "number" ? a.coherence_cv.toFixed(3) : null

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/60 p-4 transition-all hover:border-border hover:bg-card/90"
                  >
                    {/* Left: Repo Details */}
                    <div
                      onClick={() => navigate(targetRoute)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-semibold text-base text-foreground group-hover:text-white transition-colors truncate">
                          {a.repository_full_name}
                        </span>
                        <AnalysisStatusBadge status={a.status} />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          <strong className="text-foreground/90 font-medium tabular-nums">{issueCount}</strong> issues
                        </span>
                        {kVal && (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5" />
                            <strong className="text-foreground/90 font-medium tabular-nums">K={kVal}</strong> topics
                          </span>
                        )}
                        {vocabVal && (
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="size-3.5" />
                            <strong className="text-foreground/90 font-medium tabular-nums">{vocabVal}</strong> vocab
                          </span>
                        )}
                        {coherence && (
                          <span className="flex items-center gap-1.5">
                            <Activity className="size-3.5 text-primary" />
                            <span>C_v:</span>
                            <strong className="text-foreground/90 font-medium tabular-nums">{coherence}</strong>
                          </span>
                        )}
                        <span>
                          {new Date(a.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {isFinished ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/app/analyses/${a.id}/topics`)}
                            className="h-8 gap-1.5 text-xs font-medium"
                          >
                            <span>Topics</span>
                            <ExternalLink className="size-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/app/analyses/${a.id}/exports`)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Export reports"
                          >
                            <Download className="size-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/app/analyses/${a.id}`)}
                          className="h-8 text-xs font-medium"
                        >
                          View Progress
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                        title="Delete analysis"
                        onClick={(e) => handleDelete(e, a.id, a.repository_full_name)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default HistoryPage
