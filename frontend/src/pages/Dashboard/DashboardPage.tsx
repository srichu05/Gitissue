import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  PlusCircle,
  BarChart3,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  ExternalLink,
  Layers,
  ShieldCheck,
  Search,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Cpu,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MetricCard } from "@/components/ui/metric-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { AnalysisStatusBadge } from "@/components/analysis/AnalysisStatusBadge"
import { useAnalyses, useTopics } from "@/hooks/useApi"
import { useAppAuth } from "@/components/auth/AuthProvider"
import type { Analysis, Topic } from "@/types"

function LatestAnalysisSpotlight({ analysis }: { analysis: Analysis }) {
  const navigate = useNavigate()
  const { data: topics, isLoading: loadingTopics } = useTopics(analysis.id)

  const issueCount = analysis.num_documents || analysis.issue_count || analysis.num_issues_fetched || 0
  const kVal = analysis.num_topics || analysis.k || (topics ? topics.length : 5)
  const vocabVal = analysis.vocab_size || analysis.vocabulary_size
  const coherence = typeof analysis.coherence_cv === "number" ? analysis.coherence_cv.toFixed(3) : null

  // Top 3 preview topics
  const previewTopics = (topics || []).slice(0, 3)

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card/90 via-card/60 to-background/60 shadow-lg overflow-hidden backdrop-blur-md">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> Active Model Spotlight
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {analysis.repository_full_name}
              </h2>
              <AnalysisStatusBadge status={analysis.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate(`/app/analyses/${analysis.id}/topics`)}
              className="bg-white text-zinc-950 hover:bg-white/90 font-medium text-xs h-8 shadow-xs"
            >
              <span>Explore Topics</span>
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Technical Stats Strip */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3 text-muted-foreground/80" />
            <span>Modeled Issues:</span>
            <strong className="text-foreground font-semibold tabular-nums">{issueCount}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="size-3 text-muted-foreground/80" />
            <span>Topics:</span>
            <strong className="text-foreground font-semibold tabular-nums">K={kVal}</strong>
          </span>
          {vocabVal && (
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-3 text-muted-foreground/80" />
              <span>Vocabulary:</span>
              <strong className="text-foreground font-semibold tabular-nums">{vocabVal}</strong>
            </span>
          )}
          {coherence && (
            <span className="flex items-center gap-1.5">
              <Activity className="size-3 text-primary" />
              <span>Coherence (C_v):</span>
              <strong className="text-primary font-semibold tabular-nums">{coherence}</strong>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Top Discovered Topic Clusters
            </h3>
            <Link
              to={`/app/analyses/${analysis.id}/topics`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <span>View all {kVal} clusters</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>

          {loadingTopics ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : previewTopics.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {previewTopics.map((topic: Topic, idx: number) => {
                const words = topic.top_words?.slice(0, 4) || []
                const label = topic.auto_label || `Topic #${topic.topic_index ?? idx + 1}`
                const share = typeof topic.prevalence === "number"
                  ? (topic.prevalence * 100).toFixed(1)
                  : typeof topic.dominant_issue_count === "number" && issueCount > 0
                  ? ((topic.dominant_issue_count / issueCount) * 100).toFixed(1)
                  : null

                return (
                  <div
                    key={topic.id || idx}
                    onClick={() => navigate(`/app/analyses/${analysis.id}/topics/${topic.topic_index ?? idx}`)}
                    className="group rounded-lg border border-border/50 bg-card/50 p-3.5 transition-all hover:border-border hover:bg-card/80 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-foreground truncate group-hover:text-white transition-colors">
                          {label}
                        </span>
                        {share && (
                          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                            {share}%
                          </span>
                        )}
                      </div>

                      {/* Keywords pill list */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {words.map((w, wIdx) => {
                          const wordStr = typeof w === "string" ? w : w.word
                          return (
                            <span
                              key={wIdx}
                              className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[11px] text-muted-foreground tracking-wide"
                            >
                              {wordStr}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{topic.dominant_issue_count ?? "-"} issues</span>
                      <span className="group-hover:text-foreground transition-colors flex items-center gap-0.5">
                        inspect &rarr;
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-border/40 p-4 text-center text-xs text-muted-foreground">
              Topic clusters generated. Click below to view topic distributions.
            </div>
          )}
        </div>

        {/* Quick Deep-Dive Links */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/analyses/${analysis.id}/trends`)}
            className="text-xs h-8"
          >
            <TrendingUp className="size-3.5 mr-1.5" /> Temporal Trends
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/analyses/${analysis.id}/evaluation`)}
            className="text-xs h-8"
          >
            <Activity className="size-3.5 mr-1.5" /> Model Diagnostics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/analyses/${analysis.id}/corpus`)}
            className="text-xs h-8"
          >
            <Layers className="size-3.5 mr-1.5" /> Corpus & Vocabulary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/analyses/${analysis.id}/exports`)}
            className="text-xs h-8"
          >
            Export JSON/CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAppAuth()
  const { data, isLoading, error, refetch } = useAnalyses(1, 20)

  const [quickRepoInput, setQuickRepoInput] = useState("")

  const analyses = data?.items || []
  const totalAnalyses = data?.total || analyses.length

  const completedAnalyses = analyses.filter(
    (a) => String(a.status).toLowerCase() === "completed"
  )
  const completedCount = completedAnalyses.length
  const activeCount = totalAnalyses - completedCount

  const totalIssuesAnalyzed = analyses.reduce(
    (acc, a) => acc + (a.num_documents || a.issue_count || a.num_issues_fetched || 0),
    0
  )

  const uniqueRepos = new Set(analyses.map((a) => a.repository_full_name)).size

  const totalTopics = analyses.reduce(
    (acc, a) => acc + (a.num_topics || a.k || 0),
    0
  )

  // Latest completed analysis for spotlight
  const latestCompleted = completedAnalyses[0]

  // Recent 3 runs for compact activity feed
  const recentRuns = analyses.slice(0, 3)

  const handleQuickAnalyze = (e: React.FormEvent) => {
    e.preventDefault()
    const target = quickRepoInput.trim()
    if (target) {
      navigate(`/app/analyze?repo=${encodeURIComponent(target)}`)
    } else {
      navigate("/app/analyze")
    }
  }

  const handlePresetClick = (preset: string) => {
    navigate(`/app/analyze?repo=${encodeURIComponent(preset)}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-1" />
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
          <h2 className="text-lg font-semibold">Failed to load topic dashboard</h2>
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

  const userGreeting = user?.firstName ? `Welcome back, ${user.firstName}` : "Topic Intelligence Dashboard"

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {userGreeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unsupervised topic intelligence, issue clustering, and probabilistic model diagnostics.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/app/analyze")}
            className="h-9 gap-2 bg-white text-zinc-950 hover:bg-white/90 font-medium shadow-sm transition-all"
          >
            <PlusCircle className="size-4 text-zinc-950" />
            <span>New Analysis</span>
          </Button>
        </div>
      </div>

      {/* 4 Core Intelligence Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <MetricCard
            label="Total Modeled Issues"
            value={totalIssuesAnalyzed.toLocaleString()}
            subtext="tokenized issue bodies"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <MetricCard
            label="Repositories Modeled"
            value={uniqueRepos.toLocaleString()}
            subtext={`${completedCount} completed analyses`}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MetricCard
            label="Discovered Clusters"
            value={totalTopics.toLocaleString()}
            subtext="latent Dirichlet topics"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <MetricCard
            label="Active Jobs"
            value={activeCount.toString()}
            subtext={activeCount > 0 ? "inference in progress" : "all pipelines idle"}
            accent={activeCount > 0}
          />
        </motion.div>
      </div>

      {/* Spotlight Widget or Empty State */}
      {latestCompleted ? (
        <LatestAnalysisSpotlight analysis={latestCompleted} />
      ) : analyses.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <EmptyState
            title="No repository analyses yet"
            description="Provide a public GitHub repository URL to start clustering issues with latent topic modeling."
            icon={<BarChart3 className="size-6" />}
            action={
              <Button
                onClick={() => navigate("/app/analyze")}
                className="bg-white text-zinc-950 hover:bg-white/90 font-medium"
              >
                <PlusCircle className="size-4 mr-2" /> Analyze First Repository
              </Button>
            }
          />
        </div>
      ) : null}

      {/* Two Column Grid: Quick Launch Launcher & Recent Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Quick Analysis Launcher */}
        <Card className="lg:col-span-7 border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Quick Repository Launcher</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Instantly initiate topic extraction on any public repository without leaving the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleQuickAnalyze} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="https://github.com/owner/repository"
                  value={quickRepoInput}
                  onChange={(e) => setQuickRepoInput(e.target.value)}
                  className="pl-9 text-xs sm:text-sm bg-background/50 border-border/60"
                />
              </div>
              <Button
                type="submit"
                className="bg-white text-zinc-950 hover:bg-white/90 font-medium text-xs sm:text-sm shrink-0"
              >
                Analyze
              </Button>
            </form>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Popular presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "storytold/wordcraft",
                  "facebook/react",
                  "fastapi/fastapi",
                  "pallets/flask",
                  "tailwindlabs/tailwindcss",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:border-border hover:text-foreground hover:bg-secondary/80 transition-all font-medium"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Recent Analyses Compact Activity Feed */}
        <Card className="lg:col-span-5 border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Recent Analyses</CardTitle>
              </div>
              <Link
                to="/app/history"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <span>View all ({totalAnalyses})</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              Latest issue clustering and model execution jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 flex-1">
            {recentRuns.length > 0 ? (
              recentRuns.map((a) => {
                const isFinished = String(a.status).toLowerCase() === "completed"
                const target = isFinished
                  ? `/app/analyses/${a.id}/topics`
                  : `/app/analyses/${a.id}`

                return (
                  <div
                    key={a.id}
                    onClick={() => navigate(target)}
                    className="group flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40 bg-background/40 hover:bg-card/90 transition-all cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-white transition-colors">
                        {a.repository_full_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(a.created_at).toLocaleDateString()} &bull; {a.num_documents || a.issue_count || 0} issues
                      </p>
                    </div>
                    <AnalysisStatusBadge status={a.status} className="shrink-0" />
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No runs recorded.</p>
            )}
          </CardContent>
          <div className="p-4 pt-0 border-t border-border/30 mt-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/app/history")}
              className="w-full text-xs text-muted-foreground hover:text-foreground justify-between"
            >
              <span>Explore Analysis History log</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Architecture & Data Hygiene Standards Footer Strip */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-400" />
          <span className="font-medium text-foreground">NLP Engine Hygiene Compliance:</span>
          <span>Zero issue body persistence &bull; Lemmatized vocabulary &bull; Gibbs Sampling &bull; Coherence C_v validation</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
            Engine Ready
          </span>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
