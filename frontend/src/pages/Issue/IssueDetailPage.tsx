import { useParams, Link } from "react-router-dom"
import {
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Calendar,
  User,
  PieChart as PieChartIcon,
  Tag,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

import { TopicDistributionChart } from "@/components/charts/TopicDistributionChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useIssue } from "@/hooks/useApi"
import type { TopicDistributionItem } from "@/types"

export function IssueDetailPage() {
  const { analysisId, issueId } = useParams<{ analysisId: string; issueId: string }>()

  const {
    data: issue,
    isLoading,
    error,
    refetch,
  } = useIssue(analysisId || "", issueId || "")

  if (!analysisId || !issueId) {
    return <div className="p-8 text-center text-muted-foreground">Missing issue route parameters.</div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Failed to load issue details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Issue could not be loaded."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  // Distribution items from API
  const rawDist = issue.distribution || issue.topic_distribution || []
  const chartDistribution: TopicDistributionItem[] = rawDist.map((d) => ({
    topic_id: d.topic_id,
    topic_index: d.topic_index,
    auto_label: d.display_label || (d as any).auto_label || `Topic #${d.topic_index + 1}`,
    probability: d.probability,
  }))

  const rawLabels = issue.labels || []
  const labelNames: string[] = rawLabels.map((l) => (typeof l === "string" ? l : l.name))

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to={`/app/analyses/${analysisId}/topics`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">#{issue.number}</span>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{issue.title}</h1>
              <Badge variant="outline" className="uppercase text-[10px]">
                {issue.state || "open"}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {issue.author && (
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  {issue.author}
                </span>
              )}
              {issue.created_at_github && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {new Date(issue.created_at_github).toLocaleDateString()}
                </span>
              )}
              {typeof issue.comments_count === "number" && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  {issue.comments_count} comments
                </span>
              )}
            </div>
          </div>
        </div>

        {issue.html_url && (
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              <span>Open on GitHub</span>
            </a>
          </Button>
        )}
      </div>

      {/* GitHub Labels if available */}
      {labelNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="size-3.5 text-muted-foreground mr-1" />
          {labelNames.map((name) => (
            <Badge key={name} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}

      {/* Topic Distribution Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart: Top 5 + Other */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="size-4 text-primary" />
              Topic Probability Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Estimated topic mixture proportions representing the model's soft assignment across topics for this issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {chartDistribution.length > 0 ? (
              <TopicDistributionChart distribution={chartDistribution} />
            ) : (
              <p className="text-xs text-muted-foreground py-8">
                No topic distribution assigned.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Detailed Probability List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inferred Topic Proportions</CardTitle>
            <CardDescription>
              Full probability vector summing to 1.0.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartDistribution.map((item, idx) => (
                <div key={item.topic_index} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      to={`/app/analyses/${analysisId}/topics/${item.topic_index}`}
                      className="font-medium hover:underline flex items-center gap-1.5"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                        {item.topic_index + 1}
                      </span>
                      <span>{item.auto_label}</span>
                    </Link>
                    <span className="font-mono font-medium">
                      {(item.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? "bg-primary" : "bg-primary/50"
                      }`}
                      style={{ width: `${item.probability * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default IssueDetailPage
