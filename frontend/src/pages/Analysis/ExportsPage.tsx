import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  Download,
  FileText,
  FileCode,
  Table,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"

import { AnalysisHeader } from "@/components/analysis/AnalysisHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalysis } from "@/hooks/useApi"
import { api } from "@/services/api"

type ExportType = "report_md" | "report_json" | "topic_words_csv" | "doc_topics_csv"

interface ExportOption {
  type: ExportType
  title: string
  description: string
  filename: string
  icon: typeof FileText
  badge: string
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    type: "report_md",
    title: "Markdown Topic Interpretation Report",
    description:
      "Comprehensive academic and executive report in GitHub-flavored Markdown detailing discovered topics, top words, representative issues, and corpus statistics.",
    filename: "report.md",
    icon: FileText,
    badge: "Markdown",
  },
  {
    type: "report_json",
    title: "JSON Topic Interpretation Report",
    description:
      "Structured machine-readable JSON containing full analysis metadata, topic distributions, evaluation results, and vocabulary frequencies.",
    filename: "report.json",
    icon: FileCode,
    badge: "JSON",
  },
  {
    type: "topic_words_csv",
    title: "Topic-Words Matrix (CSV)",
    description:
      "Tabular CSV export containing top-15 ranked words per topic along with their exact posterior probabilities (beta matrix).",
    filename: "topic_words.csv",
    icon: Table,
    badge: "CSV",
  },
  {
    type: "doc_topics_csv",
    title: "Document-Topic Assignments (CSV)",
    description:
      "Complete issue-level topic probability distribution matrix (theta matrix) mapping every retained GitHub issue to all topics.",
    filename: "doc_topics.csv",
    icon: Table,
    badge: "CSV",
  },
]

export function ExportsPage() {
  const { analysisId } = useParams<{ analysisId: string }>()

  const {
    data: analysis,
    isLoading,
  } = useAnalysis(analysisId || "")

  const [downloading, setDownloading] = useState<Record<string, boolean>>({})
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({})
  const [errorMap, setErrorMap] = useState<Record<string, string | null>>({})

  if (!analysisId) {
    return <div className="p-8 text-center text-muted-foreground">Missing analysis ID.</div>
  }

  const handleDownload = async (type: ExportType) => {
    try {
      setDownloading((prev) => ({ ...prev, [type]: true }))
      setErrorMap((prev) => ({ ...prev, [type]: null }))

      await api.exportFile(analysisId, type)

      setDownloaded((prev) => ({ ...prev, [type]: true }))
      setTimeout(() => {
        setDownloaded((prev) => ({ ...prev, [type]: false }))
      }, 4000)
    } catch (err: any) {
      console.error(`Export ${type} error:`, err)
      setErrorMap((prev) => ({
        ...prev,
        [type]: err?.message || "Failed to download export file.",
      }))
    } finally {
      setDownloading((prev) => ({ ...prev, [type]: false }))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AnalysisHeader analysis={analysis} analysisId={analysisId} activeTab="exports" />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Export Analysis Artifacts</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Download structured reports and raw probability matrices for downstream analytics or archival.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {EXPORT_OPTIONS.map((opt) => {
          const isPending = Boolean(downloading[opt.type])
          const isDone = Boolean(downloaded[opt.type])
          const errorMsg = errorMap[opt.type]

          return (
            <Card key={opt.type} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <opt.icon className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold leading-snug">
                        {opt.title}
                      </CardTitle>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {opt.filename}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {opt.badge}
                  </span>
                </div>
                <CardDescription className="text-xs mt-2.5 leading-relaxed">
                  {opt.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                {errorMsg && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  variant={isDone ? "secondary" : "outline"}
                  className="w-full gap-2 text-xs"
                  onClick={() => handleDownload(opt.type)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Generating Export...</span>
                    </>
                  ) : isDone ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      <span>Downloaded Successfully</span>
                    </>
                  ) : (
                    <>
                      <Download className="size-3.5" />
                      <span>Download {opt.badge}</span>
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
export default ExportsPage
