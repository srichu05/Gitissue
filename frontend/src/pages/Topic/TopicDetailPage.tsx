import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
  ArrowLeft,
  Edit2,
  Check,
  RotateCcw,
  ExternalLink,
  Tag,
  BarChart3,
  ListOrdered,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

import { TopicWordChart } from "@/components/charts/TopicWordChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useTopic, useRepresentativeIssues, useUpdateTopicLabel } from "@/hooks/useApi"

export function TopicDetailPage() {
  const { analysisId, topicIndex } = useParams<{ analysisId: string; topicIndex: string }>()

  const {
    data: topic,
    isLoading: topicLoading,
    error: topicError,
    refetch: refetchTopic,
  } = useTopic(analysisId || "", topicIndex || "")

  const {
    data: issuesData,
    isLoading: issuesLoading,
  } = useRepresentativeIssues(topic?.id || "", analysisId, 20)

  const updateLabelMutation = useUpdateTopicLabel()

  const [isEditing, setIsEditing] = useState(false)
  const [labelInput, setLabelInput] = useState("")

  useEffect(() => {
    if (topic) {
      setLabelInput(topic.human_label || topic.label || "")
    }
  }, [topic])

  if (!analysisId || !topicIndex) {
    return <div className="p-8 text-center text-muted-foreground">Missing route parameters.</div>
  }

  if (topicLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (topicError || !topic) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Failed to load topic details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {topicError instanceof Error ? topicError.message : "Topic could not be found."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchTopic()} className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  const displayLabel = topic.display_label || topic.human_label || topic.label || topic.auto_label
  const isHumanLabeled = Boolean(topic.human_label || topic.label)

  const handleSaveLabel = () => {
    if (!labelInput.trim()) return
    updateLabelMutation.mutate(
      {
        analysisId,
        topicId: topic.id,
        label: labelInput.trim(),
      },
      {
        onSuccess: () => setIsEditing(false),
      }
    )
  }

  const handleResetLabel = () => {
    updateLabelMutation.mutate(
      {
        analysisId,
        topicId: topic.id,
        label: null,
      },
      {
        onSuccess: () => {
          setLabelInput("")
          setIsEditing(false)
        },
      }
    )
  }

  const representativeIssues = issuesData?.items || []

  return (
    <div className="space-y-6">
      {/* Navigation and Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to={`/app/analyses/${analysisId}/topics`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                {topic.topic_index + 1}
              </span>
              <h1 className="text-2xl font-bold tracking-tight">{displayLabel}</h1>
              <Badge variant={isHumanLabeled ? "default" : "secondary"}>
                {isHumanLabeled ? "Human Labeled" : "Auto Labeled"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Auto: {topic.auto_label}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="rounded-md border bg-card px-3 py-1.5 shadow-sm">
            <span>Prevalence: </span>
            <strong className="text-foreground">{(topic.prevalence * 100).toFixed(1)}%</strong>
          </div>
          <div className="rounded-md border bg-card px-3 py-1.5 shadow-sm">
            <span>Dominant Issues: </span>
            <strong className="text-foreground">{topic.dominant_issue_count}</strong>
          </div>
        </div>
      </div>

      {/* Label Edit Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="size-4 text-primary" />
              Customize Topic Label
            </CardTitle>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 h-8">
                <Edit2 className="size-3.5" />
                <span>Edit Label</span>
              </Button>
            )}
          </div>
          <CardDescription>
            Assign a human-readable interpretation to this latent topic cluster.
          </CardDescription>
        </CardHeader>
        {isEditing && (
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g., Performance / Hydration bugs"
                maxLength={60}
                className="max-w-md"
              />
              <Button
                size="sm"
                onClick={handleSaveLabel}
                disabled={updateLabelMutation.isPending}
                className="gap-1"
              >
                <Check className="size-3.5" />
                <span>Save</span>
              </Button>
              {isHumanLabeled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetLabel}
                  disabled={updateLabelMutation.isPending}
                  className="gap-1"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset to Auto</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
            {updateLabelMutation.isError && (
              <p className="text-xs text-destructive">
                Failed to update label. Please try again.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Word Probabilities and Representative Issues Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 15 Words Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Top 15 Word Probabilities
            </CardTitle>
            <CardDescription className="text-xs">
              Marginal term probability of each vocabulary word conditioned on this topic cluster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topic.top_words && topic.top_words.length > 0 ? (
              <TopicWordChart words={topic.top_words} topN={15} />
            ) : (
              <p className="text-xs text-muted-foreground">No top words available.</p>
            )}
          </CardContent>
        </Card>

        {/* Representative Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="size-4 text-primary" />
              Representative Issues
            </CardTitle>
            <CardDescription className="text-xs">
              Issues with highest posterior probability of membership in this topic cluster.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {issuesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : representativeIssues.length > 0 ? (
              <div className="divide-y">
                {representativeIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{issue.number}
                        </span>
                        <Link
                          to={`/app/analyses/${analysisId}/issues/${issue.id}`}
                          className="font-medium text-sm hover:underline truncate"
                        >
                          {issue.title}
                        </Link>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {issue.state || "open"}
                        </Badge>
                        <span>
                          Topic Match:{" "}
                          <strong className="text-foreground">
                            {issue.probability
                              ? `${(issue.probability * 100).toFixed(1)}%`
                              : "-"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      title="View on GitHub"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No representative issues found for this topic.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default TopicDetailPage
