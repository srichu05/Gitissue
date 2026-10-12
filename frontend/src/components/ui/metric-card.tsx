import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  className?: string
  accent?: boolean
}

export function MetricCard({ label, value, subtext, className, accent }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 flex flex-col gap-1",
        accent && "border-primary/30 bg-primary/5",
        className
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", accent && "text-primary")}>{value}</p>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  )
}
