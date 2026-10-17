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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MetricCard } from "@/components/ui/metric-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalysisStatusBadge } from "@/components/analysis/AnalysisStatusBadge"
import { useAnalyses, useDeleteAnalysis } from "@/hooks/useApi"

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useAnalyses(1, 20)
  const deleteMutation = useDeleteAnalysis()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 mt-1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Failed to load analyses</h2>
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

  const analyses = data?.items || []
  const totalAnalyses = data?.total || analyses.length

  if (analyses.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          title="No analyses yet"
          description="Connect a public GitHub repository to discover hidden topics in your issues."
          icon={<BarChart3 className="size-6" />}
          action={
            <Button onClick={() => navigate("/app/analyze")}>
              <PlusCircle className="size-4 mr-2" /> Analyze a Repository
            </Button>
          }
        />
      </div>
    )
  }

  // Calculate live statistics from actual analyses
  const completedCount = analyses.filter(
    (a) => String(a.status).toLowerCase() === "completed"
  ).length
  const totalIssuesAnalyzed = analyses.reduce(
    (acc, a) => acc + (a.num_documents || a.issue_count || a.num_issues_fetched || 0),
    0
  )
  const totalTopics = analyses.reduce(
    (acc, a) => acc + (a.num_topics || a.k || 0),
    0
  )
  const avgTopics = completedCount > 0 ? (totalTopics / completedCount).toFixed(1) : "0"

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this analysis?")) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your repository analyses and topic intelligence.
          </p>
        </div>
        <Button onClick={() => navigate("/app/analyze")} className="gap-2">
          <PlusCircle className="size-4" /> New Analysis
        </Button>
      </div>

      {/* Real Computed Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <MetricCard
            label="Total Analyses"
            value={totalAnalyses.toLocaleString()}
            subtext={`${completedCount} completed`}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <MetricCard
            label="Issues Analyzed"
            value={totalIssuesAnalyzed.toLocaleString()}
            subtext="across all runs"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MetricCard
            label="Avg Topics / Repo"
            value={avgTopics}
            subtext="latent clusters"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <MetricCard
            label="Active Runs"
            value={(totalAnalyses - completedCount).toString()}
            subtext="queued / running"
            accent
          />
        </motion.div>
      </div>

      {/* Analyses List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
          <CardDescription>Your repository issue topic modeling runs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analyses.map((a) => {
            const isFinished = String(a.status).toLowerCase() === "completed"
            const targetRoute = isFinished
              ? `/app/analyses/${a.id}/topics`
              : `/app/analyses/${a.id}`

            return (
              <div
                key={a.id}
                onClick={() => navigate(targetRoute)}
                className="flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent/40 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {a.repository_full_name}
                    </span>
                    <AnalysisStatusBadge status={a.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {a.num_documents || a.issue_count || a.num_issues_fetched || 0} issues
                    </span>
                    {(a.num_topics || a.k) && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        K={a.num_topics || a.k}
                      </span>
                    )}
                    {(a.vocab_size || a.vocabulary_size) && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="size-3" />
                        {a.vocab_size || a.vocabulary_size} vocab
                      </span>
                    )}
                    <span>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Delete analysis"
                    onClick={(e) => handleDelete(e, a.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  <BarChart3 className="size-4 text-muted-foreground" />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
export default DashboardPage
