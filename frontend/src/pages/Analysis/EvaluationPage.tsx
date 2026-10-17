import { useParams } from "react-router-dom"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  CheckCircle2,
  Award,
} from "lucide-react"

import { AnalysisHeader } from "@/components/analysis/AnalysisHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalysis, useEvaluation } from "@/hooks/useApi"

export function EvaluationPage() {
  const { analysisId } = useParams<{ analysisId: string }>()

  const {
    data: analysis,
    isLoading: analysisLoading,
  } = useAnalysis(analysisId || "")

  const {
    data: evaluation,
    isLoading: evalLoading,
    error: evalError,
    refetch,
  } = useEvaluation(analysisId || "")

  if (!analysisId) {
    return <div className="p-8 text-center text-muted-foreground">Missing analysis ID.</div>
  }

  const isLoading = analysisLoading || evalLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (evalError || !evaluation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Failed to load model evaluation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {evalError instanceof Error ? evalError.message : "Evaluation metrics unavailable."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  const results = evaluation.results || []
  const selectedK = evaluation.selected_k
  const bestK = evaluation.best_k_by_coherence
  const isManual = String(evaluation.k_mode).toLowerCase() === "manual"
  const isSuboptimal = selectedK !== bestK

  const selectedItem = results.find((r) => r.k === selectedK)
  const bestItem = results.find((r) => r.k === bestK)

  return (
    <div className="space-y-6">
      <AnalysisHeader analysis={analysis} analysisId={analysisId} activeTab="evaluation" />

      {/* Manual Override / Suboptimal Notice */}
      {isManual && isSuboptimal && (
        <Card className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <CardHeader className="py-3 px-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Manual Topic Count Override (K = {selectedK})
                </CardTitle>
                <CardDescription className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1">
                  This analysis was trained with a user-specified topic count of <strong>K = {selectedK}</strong> (C_v = {selectedItem?.coherence_cv.toFixed(4) ?? "-"}).
                  The background evaluation sweep indicates that <strong>K = {bestK}</strong> achieved the highest coherence (C_v = {bestItem?.coherence_cv.toFixed(4) ?? "-"}).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Summary KPI Banner */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Model Selection Mode</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="capitalize">{evaluation.k_mode || "Auto"}</span>
              <Badge variant={isManual ? "secondary" : "default"} className="text-[11px]">
                {isManual ? "Manual User Setting" : "Automatic C_v Sweep"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Criterion: {evaluation.criterion === "c_v_coherence" ? "C_v Coherence Maximization" : evaluation.criterion}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Active Model Topic Count</CardDescription>
            <CardTitle className="text-xl flex items-center gap-2">
              K = {selectedK}
              <Badge variant="outline" className="text-[11px] font-mono">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sweep Optimum: <strong className="text-foreground">K = {bestK}</strong> (C_v = {bestItem?.coherence_cv.toFixed(4) ?? "-"})
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Active Model Coherence</CardDescription>
            <CardTitle className="text-xl text-primary font-mono">
              {selectedItem ? selectedItem.coherence_cv.toFixed(4) : "-"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Perplexity: <strong className="text-foreground">{selectedItem ? selectedItem.perplexity.toFixed(1) : "-"}</strong> (Informational fit)
          </CardContent>
        </Card>
      </div>

      {/* Coherence Sweep Curve */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                Topic Coherence (C_v) across Candidate Topic Counts (K)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Gensim CoherenceModel evaluation over candidate K values evaluated using sliding-window NPMI and cosine similarity.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary inline-block" />
                Active Model (K = {selectedK})
              </span>
              {isSuboptimal && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="size-2.5 rounded-full bg-amber-500 inline-block" />
                  Sweep Optimum (K = {bestK})
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={results} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="k"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    label={{
                      value: "Number of Topics (K)",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => Number(v).toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(val: any) => [
                      typeof val === "number" ? val.toFixed(4) : val,
                      "C_v Coherence",
                    ]}
                    labelFormatter={(label) => `K = ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="coherence_cv"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "var(--primary)" }}
                    activeDot={{ r: 6 }}
                  />

                  {/* Active model marker */}
                  {selectedItem && (
                    <ReferenceDot
                      x={selectedItem.k}
                      y={selectedItem.coherence_cv}
                      r={7}
                      fill="var(--primary)"
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  )}

                  {/* Sweep optimum marker if different from active */}
                  {isSuboptimal && bestItem && (
                    <ReferenceDot
                      x={bestItem.k}
                      y={bestItem.coherence_cv}
                      r={7}
                      fill="#f59e0b"
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                {isSuboptimal
                  ? `Active model K = ${selectedK} (C_v = ${selectedItem?.coherence_cv.toFixed(4)}) vs Sweep optimum K = ${bestK} (C_v = ${bestItem?.coherence_cv.toFixed(4)}).`
                  : `Selected model K = ${selectedK} achieves optimal coherence (C_v = ${selectedItem?.coherence_cv.toFixed(4)}).`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No evaluation sweep results recorded.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sweep Results Table & Explanation */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">K-Sweep Results Table</CardTitle>
            <CardDescription className="text-xs">
              Measured coherence and perplexity across candidate topic numbers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Topics (K)</th>
                    <th className="py-2 px-4 font-medium">C_v Coherence</th>
                    <th className="py-2 px-4 font-medium">Perplexity</th>
                    <th className="py-2 pl-4 font-medium text-right">Model Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {results.map((r) => {
                    const isCurrent = r.k === selectedK
                    const isSweepBest = r.k === bestK
                    return (
                      <tr
                        key={r.k}
                        className={
                          isCurrent
                            ? "bg-primary/5 font-semibold"
                            : isSweepBest
                            ? "bg-amber-500/5 font-medium"
                            : ""
                        }
                      >
                        <td className="py-2.5 pr-4">K = {r.k}</td>
                        <td className="py-2.5 px-4 text-primary font-bold">{r.coherence_cv.toFixed(4)}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{r.perplexity.toFixed(1)}</td>
                        <td className="py-2.5 pl-4 text-right">
                          {isCurrent && isSweepBest ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3" /> Active & Optimal
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-primary">
                              <CheckCircle2 className="size-3" /> Active ({isManual ? "Manual" : "Selected"})
                            </span>
                          ) : isSweepBest ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-amber-600 dark:text-amber-400">
                              <Award className="size-3" /> Sweep Optimum
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-sans">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Theoretical Notes */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="size-4 text-muted-foreground" />
              Evaluation Methodology & Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">C_v Topic Coherence:</strong> Evaluated using Gensim's implementation of the C_v measure (Röder et al., 2015). It computes indirect cosine similarity over top-10 words combined with normalized pointwise mutual information (NPMI). Higher scores indicate semantically interpretable, human-coherent word clusters.
            </p>
            <p>
              <strong className="text-foreground">Perplexity:</strong> Measures log-likelihood on the training documents (lower indicates closer statistical fit to the token vocabulary). In topic modeling, lower perplexity does not necessarily correspond to human-interpretable topics; therefore, GitIssue uses C_v coherence as the primary selection criterion.
            </p>
            <p>
              <strong className="text-foreground">Automatic vs Manual K:</strong> In Automatic mode, the model with highest C_v is deployed. In Manual mode, your specified topic count is preserved while the sweep results remain available for comparison.
            </p>
            {evaluation.note && (
              <p className="border-t pt-2 italic text-[11px]">
                {evaluation.note}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default EvaluationPage
