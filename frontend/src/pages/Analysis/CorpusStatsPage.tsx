import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  AlertCircle,
  Database,
  Layers,
  Table as TableIcon,
  RefreshCw,
} from "lucide-react"

import { AnalysisHeader } from "@/components/analysis/AnalysisHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalysis, useCorpusStats } from "@/hooks/useApi"

export function CorpusStatsPage() {
  const { analysisId } = useParams<{ analysisId: string }>()

  const {
    data: analysis,
    isLoading: analysisLoading,
  } = useAnalysis(analysisId || "")

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch,
  } = useCorpusStats(analysisId || "")

  const [activeSampleIndex, setActiveSampleIndex] = useState(0)

  if (!analysisId) {
    return <div className="p-8 text-center text-muted-foreground">Missing analysis ID.</div>
  }

  const isLoading = analysisLoading || statsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (statsError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Failed to load corpus statistics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {statsError instanceof Error ? statsError.message : "Statistics unavailable."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="size-4" /> Try Again
        </Button>
      </div>
    )
  }

  const samples = stats.samples || []
  const currentSample = samples[activeSampleIndex] || samples[0]
  const topTerms = stats.top_terms || []
  const dtm = stats.document_term_matrix_preview

  return (
    <div className="space-y-6">
      <AnalysisHeader analysis={analysis} analysisId={analysisId} activeTab="corpus" />

      {/* Top Level Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Issues Fetched</CardDescription>
            <CardTitle className="text-2xl">{stats.num_issues_fetched}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Raw issues collected via GitHub API
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Retained Documents</CardDescription>
            <CardTitle className="text-2xl text-primary">{stats.num_documents}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.num_dropped} dropped (length &lt; 8 tokens)
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Vocabulary Size</CardDescription>
            <CardTitle className="text-2xl">{stats.vocab_size}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Unique unigrams retained
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Tokens</CardDescription>
            <CardTitle className="text-2xl">{stats.total_tokens.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Avg {stats.avg_tokens_per_doc.toFixed(1)} / doc ({stats.min_tokens_per_doc} – {stats.max_tokens_per_doc})
          </CardContent>
        </Card>
      </div>

      {/* Preprocessing Inspector & Top Terms Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Preprocessing Pipeline Sample Viewer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  NLP Preprocessing Pipeline Inspector
                </CardTitle>
                <CardDescription>
                  Trace transformation stages from raw GitHub markdown to Gensim Bag-of-Words
                </CardDescription>
              </div>
              {samples.length > 0 && (
                <div className="flex items-center gap-1">
                  {samples.slice(0, 5).map((s, idx) => (
                    <Button
                      key={s.issue_number}
                      variant={activeSampleIndex === idx ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setActiveSampleIndex(idx)}
                    >
                      #{s.issue_number}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentSample ? (
              <div className="space-y-4 text-xs">
                {/* Stage 1: Raw */}
                <div className="space-y-1 rounded-md border p-3 bg-muted/20">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                    1. Raw GitHub Issue Body (#{currentSample.issue_number})
                  </span>
                  <p className="text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto text-xs font-normal">
                    {currentSample.raw || "No raw text available"}
                  </p>
                </div>

                {/* Stage 2: Cleaned */}
                <div className="space-y-1 rounded-md border p-3 bg-muted/20">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                    2. Cleaned (Markdown, HTML & Code Blocks Stripped)
                  </span>
                  <p className="text-muted-foreground max-h-20 overflow-y-auto text-xs font-normal">
                    {currentSample.cleaned || "No cleaned text available"}
                  </p>
                </div>

                {/* Stage 3: Stopword Filtered & Lemmatized */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 rounded-md border p-3 bg-muted/20">
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      3. Lemmatized Tokens
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                      {currentSample.lemmatized?.map((token, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-secondary/60 px-2 py-0.5 text-[11px] font-medium border border-border/40"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stage 4: BoW */}
                  <div className="space-y-1 rounded-md border p-3 bg-muted/20">
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      4. Gensim Bag-of-Words
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                      {currentSample.bow?.map((item: any, i: number) => {
                        const term = item.term || item[0]
                        const count = item.count || item[1]
                        return (
                          <span
                            key={i}
                            className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium"
                          >
                            {term}: {count}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No sample issue traces available.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Vocabulary Terms */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="size-4 text-primary" />
              Top Corpus Terms
            </CardTitle>
            <CardDescription>Highest document frequency unigrams</CardDescription>
          </CardHeader>
          <CardContent>
            {topTerms.length > 0 ? (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b text-muted-foreground sticky top-0 bg-card">
                    <tr>
                      <th className="py-1.5 pr-2 font-medium">Term</th>
                      <th className="py-1.5 px-2 font-medium text-right">Doc Freq</th>
                      <th className="py-1.5 pl-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y tabular-nums">
                    {topTerms.slice(0, 25).map((t) => (
                      <tr key={t.term}>
                        <td className="py-1.5 pr-2 font-semibold text-foreground">{t.term}</td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">{t.document_frequency}</td>
                        <td className="py-1.5 pl-2 text-right text-primary">{t.total_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No term frequencies recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Document-Term Matrix (DTM) Preview */}
      {dtm && dtm.terms && dtm.terms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TableIcon className="size-4 text-primary" />
              Document-Term Matrix (DTM) Preview
            </CardTitle>
            <CardDescription>
              Sparse token frequency snapshot across representative corpus documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border tabular-nums">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="py-2 px-3 text-left font-sans">Issue #</th>
                    {dtm.terms.map((term) => (
                      <th key={term} className="py-2 px-2 font-medium text-foreground">
                        {term}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dtm.rows.map((row) => (
                    <tr key={row.issue_number} className="hover:bg-muted/30">
                      <td className="py-2 px-3 text-left font-sans font-medium text-muted-foreground">
                        #{row.issue_number}
                      </td>
                      {row.counts.map((cnt, i) => (
                        <td
                          key={i}
                          className={`py-2 px-2 ${
                            cnt > 0 ? "font-bold text-primary bg-primary/5" : "text-muted-foreground/40"
                          }`}
                        >
                          {cnt}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
export default CorpusStatsPage
