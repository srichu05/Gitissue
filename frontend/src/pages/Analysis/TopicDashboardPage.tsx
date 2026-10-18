import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { AlertCircle, RefreshCw, BarChart2, Info, Layers } from "lucide-react"

import { AnalysisHeader } from "@/components/analysis/AnalysisHeader"
import { TopicCard } from "@/components/topics/TopicCard"
import { TopicDistributionChart } from "@/components/charts/TopicDistributionChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalysis, useTopics } from "@/hooks/useApi"
import type { TopicDistributionItem } from "@/types"

export function TopicDashboardPage() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const navigate = useNavigate()

  const {
    data: analysis,
    isLoading: analysisLoading,
    error: analysisError,
  } = useAnalysis(analysisId || "")

  const {
    data: topics,
    isLoading: topicsLoading,
    error: topicsError,
    refetch,
  } = useTopics(analysisId || "")

  if (!analysisId) {
    return <div className="p-8 text-center text-muted-foreground">No analysis ID provided.</div>
  }

  const isLoading = analysisLoading || topicsLoading
  const error = analysisError || topicsError

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-1" />
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        </div>
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
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  const topicList = topics || []
  const kMode = analysis?.config?.k_mode || "auto"
  const isManual = kMode === "manual"

  // Prepare distribution data for chart
  const distributionData: TopicDistributionItem[] = topicList.map((t) => ({
    topic_id: t.id,
    topic_index: t.topic_index,
    auto_label: t.display_label || t.human_label || t.label || t.auto_label,
    probability: t.prevalence,
  }))

  return (
    <div className="space-y-6">
      <AnalysisHeader analysis={analysis} analysisId={analysisId} activeTab="topics" />

      {/* Main Analysis Insights Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Topic Share Chart */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="size-4 text-primary" />
                Topic Prevalence Share
              </CardTitle>
              <Badge variant={isManual ? "secondary" : "default"} className="text-[11px] capitalize">
                {isManual ? "Manual K" : "Auto K"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Expected marginal share of each topic across all analyzed issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center py-2">
            {distributionData.length > 0 ? (
              <TopicDistributionChart distribution={distributionData} />
            ) : (
              <p className="text-xs text-muted-foreground">No topic distribution available.</p>
            )}
          </CardContent>
        </Card>

        {/* Statistical Concepts Explainer Banner */}
        <Card className="lg:col-span-2 bg-muted/20 border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="size-4 text-primary" />
              Understanding Topic Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-background/60 p-3 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <Layers className="size-3.5 text-primary" />
                  Prevalence (Marginal Share)
                </span>
                <p className="leading-relaxed">
                  The mean posterior probability of this topic averaged across all corpus documents. Every issue has a mixed membership distribution and contributes proportionally to all topics.
                </p>
              </div>
              <div className="rounded-md border bg-background/60 p-3 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <BarChart2 className="size-3.5 text-primary" />
                  Dominant Issue Count
                </span>
                <p className="leading-relaxed">
                  The discrete count of issues for which this topic has the single highest assignment probability (argmax topic). The sum of dominant issue counts equals total retained documents.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/90">
              Click any topic card below to inspect top-15 word probabilities, view representative GitHub issues, or customize the human interpretation label.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Topics Grid */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Discovered Topics</h2>
            <p className="text-xs text-muted-foreground">
              Latent topic clusters ordered by prevalence share (highest to lowest)
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {topicList.length} topics discovered
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topicList.map((topic, index) => (
            <motion.div
              key={topic.id || topic.topic_index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <TopicCard
                topic={topic}
                onClick={() =>
                  navigate(`/app/analyses/${analysisId}/topics/${topic.topic_index}`)
                }
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default TopicDashboardPage
