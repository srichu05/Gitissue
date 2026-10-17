import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  Network,
  Boxes,
  Lightbulb,
  Settings2,
  Star,
  GitFork,
  Loader2,
} from "lucide-react"
import { Github } from "@/components/ui/github-icon"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { api } from "@/services/api"
import type { Repository } from "@/types"

export function AnalyzePage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState("")
  const [kMode, setKMode] = useState<"auto" | "manual">("auto")
  const [kValue, setKValue] = useState(5)
  const [validatedRepo, setValidatedRepo] = useState<Repository | null>(null)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidUrl = (u: string) =>
    /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(u.trim())

  const handleValidate = async () => {
    setError(null)
    const trimmed = url.trim()
    if (!trimmed) {
      setError("Please enter a GitHub repository URL.")
      return
    }
    if (!isValidUrl(trimmed)) {
      setError("Enter a valid GitHub URL (e.g., https://github.com/owner/repo)")
      return
    }

    try {
      setValidating(true)
      const repo = await api.validateRepository(trimmed)
      setValidatedRepo(repo)
    } catch (err: any) {
      setError(err?.message || "Failed to validate repository. Ensure it is public.")
      setValidatedRepo(null)
    } finally {
      setValidating(false)
    }
  }

  const handleStart = async () => {
    if (!url.trim()) return
    setError(null)
    try {
      setSubmitting(true)
      const res = await api.createAnalysis({
        repository_url: url.trim(),
        k_mode: kMode,
        num_topics: kMode === "manual" ? kValue : undefined,
      })
      navigate(`/app/analyses/${res.analysis_id}`)
    } catch (err: any) {
      setError(err?.message || "Failed to initiate analysis job.")
    } finally {
      setSubmitting(false)
    }
  }

  const pipeline = [
    { icon: Github, label: "GitHub API" },
    { icon: FileText, label: "Issue Extraction" },
    { icon: Network, label: "NLP Lemmatization" },
    { icon: Boxes, label: "LDA Sampling" },
    { icon: Lightbulb, label: "Topic Intelligence" },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analyze Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect a public GitHub repository to discover latent topic structures.
        </p>
      </div>

      {/* URL Input & Metadata Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Repository URL</CardTitle>
          <CardDescription>Enter a public GitHub repository URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">GitHub Repository</Label>
            <div className="flex gap-2">
              <Input
                id="repo-url"
                placeholder="https://github.com/owner/repository"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setValidatedRepo(null)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleValidate()
                  }
                }}
                aria-invalid={Boolean(error)}
              />
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={validating || !url.trim()}
              >
                {validating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Validating...
                  </>
                ) : (
                  "Validate"
                )}
              </Button>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive mt-1.5">
                <AlertCircle className="size-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          {/* Validated repository metadata preview */}
          {validatedRepo && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border bg-muted/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="font-semibold">{validatedRepo.full_name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="size-3.5" /> {validatedRepo.stars?.toLocaleString()}
                  </span>
                  {typeof validatedRepo.forks === "number" && (
                    <span className="flex items-center gap-1">
                      <GitFork className="size-3.5" /> {validatedRepo.forks?.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {validatedRepo.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {validatedRepo.description}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t text-xs">
                <div>
                  <span className="text-muted-foreground">Open Issues Available: </span>
                  <strong className="text-foreground">
                    {validatedRepo.open_issues_count ?? validatedRepo.open_issues ?? 0}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <strong className="text-emerald-600">Public & Accessible</strong>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* K Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="size-4 text-primary" /> Topic Count (K)
          </CardTitle>
          <CardDescription>
            Choose how many latent topic clusters the LDA model should fit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={kMode}
            onValueChange={(v) => setKMode(v as "auto" | "manual")}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Label
              htmlFor="k-auto"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem value="auto" id="k-auto" className="mt-1" />
              <div>
                <span className="font-medium text-sm">Automatic K (Recommended)</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sweeps candidate topic counts from 3 to 10 and selects the optimal model maximizing C_v topic coherence.
                </p>
              </div>
            </Label>
            <Label
              htmlFor="k-manual"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem value="manual" id="k-manual" className="mt-1" />
              <div>
                <span className="font-medium text-sm">Manual K</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Specify exact number of topics (3 to 15) to train directly without model selection sweep.
                </p>
              </div>
            </Label>
          </RadioGroup>

          {kMode === "manual" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Selected Number of Topics</Label>
                <Badge variant="secondary" className="font-mono">K = {kValue}</Badge>
              </div>
              <Slider
                value={[kValue]}
                onValueChange={(v) => setKValue(v[0])}
                min={3}
                max={15}
                step={1}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>3 topics</span>
                <span>15 topics</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">NLP Processing Pipeline</CardTitle>
          <CardDescription>Automated asynchronous transformation flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-center">
            {pipeline.map((step) => (
              <div key={step.label} className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-muted/20 border">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background border shadow-xs">
                  <step.icon className="size-4 text-primary" />
                </div>
                <span className="text-[11px] font-medium leading-tight">{step.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/app")}>
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          disabled={!validatedRepo || submitting}
          className="gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Queueing Analysis...</span>
            </>
          ) : (
            <>
              <span>Start Analysis</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
export default AnalyzePage
