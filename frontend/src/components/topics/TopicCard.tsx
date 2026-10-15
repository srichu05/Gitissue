import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Topic } from "@/types"

interface TopicCardProps {
  topic: Topic
  onClick?: () => void
  className?: string
}

const TOPIC_COLORS = [
  "bg-chart-1/10 border-chart-1/30 text-[oklch(0.45_0.18_264)]",
  "bg-chart-2/10 border-chart-2/30 text-[oklch(0.45_0.14_200)]",
  "bg-chart-3/10 border-chart-3/30 text-[oklch(0.4_0.12_170)]",
  "bg-chart-4/10 border-chart-4/30 text-[oklch(0.4_0.1_240)]",
  "bg-chart-5/10 border-chart-5/30 text-[oklch(0.4_0.08_290)]",
]

export function TopicCard({ topic, onClick, className }: TopicCardProps) {
  const colorClass = TOPIC_COLORS[topic.topic_index % TOPIC_COLORS.length]
  const displayLabel = topic.display_label || topic.human_label || topic.label || topic.auto_label
  const isLabeled = Boolean(topic.human_label || topic.label)
  const previewWords = (topic.top_words || []).slice(0, 5).map((w) => w.word)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-4 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold border",
              colorClass
            )}
          >
            {topic.topic_index + 1}
          </span>
          <div>
            <p className="font-semibold text-sm leading-tight">{displayLabel}</p>
            {topic.label && (
              <p className="text-xs text-muted-foreground">{topic.auto_label}</p>
            )}
          </div>
        </div>
        {isLabeled && (
          <Badge variant="secondary" className="text-xs shrink-0">
            Labeled
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Prevalence</span>
          <span className="font-medium text-foreground">
            {(topic.prevalence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${topic.prevalence * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{topic.dominant_issue_count} dominant issues</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {previewWords.map((word) => (
          <span
            key={word}
            className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground bg-muted/50"
          >
            {word}
          </span>
        ))}
      </div>
    </button>
  )
}
