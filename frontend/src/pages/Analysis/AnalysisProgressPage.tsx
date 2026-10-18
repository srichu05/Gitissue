import { useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Github } from "@/components/ui/github-icon"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalysis } from "@/hooks/useApi"

interface PipelineStage {
  key: string
  label: string
  description: string
}

const STAGES: PipelineStage[] = [
  { key: "queued", label: "Queued", description: "Analysis job is waiting to execute" },
  { key: "fetching", label: "Fetching Issues", description: "Collecting issue bodies from GitHub API" },
  { key: "preprocessing", label: "Preprocessing", description: "Cleaning markdown, tokenization, lemmatization" },
  { key: "training", label: "Training LDA Model", description: "Running collapsed Gibbs sampling across candidate K" },
  { key: "analyzing", label: "Topic Inference", description: "Inferring posterior issue topic distributions" },
  { key: "completed", label: "Completed", description: "Analysis ready to explore" },
]

export function AnalysisProgressPage() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const navigate = useNavigate()

  const {
    data: analysis,
    isLoading,
    error,
    refetch,
  } = useAnalysis(analysisId || "", true)

  const currentStatus = String(analysis?.status || "queued").toLowerCase()
  const isCompleted = currentStatus === "completed"
  const isFailed = currentStatus === "failed"

  // Automatically forward to topics if already completed
  useEffect(() => {
    if (isCompleted && analysisId) {
      // Allow user to see 100% briefly, or navigate
    }
  }, [isCompleted, analysisId])

  if (!analysisId) {
    return <div className="p-8 text-center text-muted-foreground">Missing analysis ID.</div>
  }

  if (isLoading && !analysis) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (error && !analysis) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h2 className="text-lg font-semibold">Failed to track analysis</h2>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Unable to retrieve status."}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="size-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  // Find index in stages
  let stageIndex = STAGES.findIndex((s) => s.key === currentStatus)
  if (stageIndex === -1) {
    stageIndex = isCompleted ? STAGES.length - 1 : 0
  }

  const rawProgress = analysis?.progress_percent ?? analysis?.progress ?? 0
  const progressPercent = isCompleted ? 100 : Math.min(Math.max(rawProgress, 5), 99)
  const repoName =
    analysis?.repository_full_name || analysis?.repository?.full_name || "Repository"
  const currentMsg =
    analysis?.status_message ||
    analysis?.current_stage_message ||
    STAGES[stageIndex]?.description ||
    "Processing..."

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Repository header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analysis Progress</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Github className="size-4" />
            <span className="font-medium text-foreground">{repoName}</span>
            <Badge variant="secondary" className="text-[11px] font-medium tracking-wide">
              ID: {analysisId.slice(0, 8)}
            </Badge>
          </div>
        </div>

        {isCompleted && (
          <Button onClick={() => navigate(`/app/analyses/${analysisId}/topics`)}>
            View Results <ArrowRight className="size-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Failure banner */}
      {isFailed && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertCircle className="size-4" />
              Analysis Failed
            </CardTitle>
            <CardDescription className="text-xs text-destructive/80">
              {analysis?.error_message ||
                analysis?.error ||
                "The analysis job encountered an error while processing issues."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/analyze")}
              className="text-xs"
            >
              Start New Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress overview */}
      {!isFailed && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                {isCompleted ? "Analysis Complete" : STAGES[stageIndex]?.label}
              </span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="mt-3 text-xs text-muted-foreground">
              {isCompleted
                ? "All pipeline stages completed successfully. Your topic intelligence is ready."
                : currentMsg}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stage stepper */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">NLP & LDA Pipeline Execution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {STAGES.map((stage, i) => {
            const isDone = isCompleted || i < stageIndex
            const isCurrent = !isCompleted && !isFailed && i === stageIndex
            const isPending = !isCompleted && i > stageIndex

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                  isCurrent ? "bg-primary/5 border border-primary/20" : ""
                }`}
              >
                <div className="shrink-0">
                  {isDone && <CheckCircle2 className="size-5 text-emerald-500" />}
                  {isCurrent && <Loader2 className="size-5 animate-spin text-primary" />}
                  {isPending && <Circle className="size-5 text-muted-foreground/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isPending ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </div>
                {isDone && (
                  <Badge variant="secondary" className="text-xs text-emerald-700 bg-emerald-50">
                    Done
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="text-xs">Running</Badge>
                )}
              </motion.div>
            )
          })}
        </CardContent>
      </Card>

      {/* Results CTA */}
      {isCompleted && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-semibold text-foreground">Results Ready to Explore</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Discovered {analysis?.num_topics ?? analysis?.k ?? "topics"} from{" "}
                  {analysis?.num_documents ?? analysis?.issue_count ?? "issues"}.
                </p>
              </div>
              <Button asChild>
                <Link to={`/app/analyses/${analysisId}/topics`}>
                  Explore Topics <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
export default AnalysisProgressPage
