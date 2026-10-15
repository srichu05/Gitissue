import { cn } from "@/lib/utils"
import type { AnalysisStatus } from "@/types"

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dotClassName: string }
> = {
  queued: {
    label: "Queued",
    className: "bg-muted text-muted-foreground",
    dotClassName: "bg-muted-foreground",
  },
  fetching: {
    label: "Fetching Issues",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dotClassName: "bg-blue-500 animate-pulse",
  },
  preprocessing: {
    label: "Preprocessing",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dotClassName: "bg-amber-500 animate-pulse",
  },
  training: {
    label: "Training LDA",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    dotClassName: "bg-purple-500 animate-pulse",
  },
  analyzing: {
    label: "Analyzing",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dotClassName: "bg-indigo-500 animate-pulse",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
    dotClassName: "bg-red-500",
  },
}

interface AnalysisStatusBadgeProps {
  status: AnalysisStatus
  className?: string
}

export function AnalysisStatusBadge({ status, className }: AnalysisStatusBadgeProps) {
  const normalized = (status ? String(status).toLowerCase() : "queued") as keyof typeof STATUS_CONFIG
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.queued
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dotClassName)} />
      {config.label}
    </span>
  )
}
