import { useParams } from "react-router-dom"
import { AlertCircle, TrendingUp, Info, RefreshCw } from "lucide-react"

import { AnalysisHeader } from "@/components/analysis/AnalysisHeader"
import { TrendChart } from "@/components/charts/TrendChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalysis, useTopics, useTrends } from "@/hooks/useApi"
import type { TrendDataPoint } from "@/types"

export function TrendsPage() {
  const { analysisId } = useParams<{ analysisId: string }>()

  const {
    data: analysis,
    isLoading: analysisLoading,
  } = useAnalysis(analysisId || "")

  const {
    data: topics,
    isLoading: topicsLoading,
  } = useTopics(analysisId || "")

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
    refetch,
  } = useTrends(analysisId || "")

  if (!analysisId) {
    return <div className="p-8 text-center text-muted-foreground">Missing analysis ID.</div>
  }

  const isLoading = analysisLoading || topicsLoading || trendsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (trendsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Failed to load trend data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {trendsError instanceof Error ? trendsError.message : "Trend analysis failed."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  const topicList = topics || []
  const series = trends?.series || []
  const isSufficient = trends?.sufficient && series.length >= 3

  // Transform series into Recharts tabular structure
  const chartData: TrendDataPoint[] = series.map((s) => {
    const point: TrendDataPoint = { month: s.month }
    s.topics.forEach((t) => {
      const matched = topicList.find((item) => item.id === t.topic_id)
      const idx = matched ? matched.topic_index : 0
      point[`topic_${idx}`] = Number((t.prevalence * 100).toFixed(1))
    })
    return point
  })

  return (
    <div className="space-y-6">
      <AnalysisHeader analysis={analysis} analysisId={analysisId} activeTab="trends" />

      {/* Main Trends Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Monthly Topic Prevalence Dynamics
              </CardTitle>
              <CardDescription>
                100% stacked area chart tracking how topic share shifts across calendar months.
              </CardDescription>
            </div>
            {isSufficient && (
              <span className="text-xs font-mono text-muted-foreground">
                {series.length} months analyzed
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isSufficient ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border rounded-lg bg-muted/20 border-dashed">
              <Info className="size-8 text-muted-foreground" />
              <div className="max-w-md">
                <h3 className="font-semibold text-sm">Insufficient Historical Data</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This issue corpus spans fewer than 3 calendar months ({series.length} month
                  {series.length === 1 ? "" : "s"} found). GitIssue requires at least 3 calendar
                  months of activity to compute stable monthly prevalence trends.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <TrendChart data={chartData} topics={topicList} />
              <div className="text-xs text-muted-foreground text-center">
                Prevalence per month is computed using probability-weighted means normalized to sum strictly to 100%.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default TrendsPage
