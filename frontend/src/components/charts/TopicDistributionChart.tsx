import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { TopicDistributionItem } from "@/types"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
]

interface TopicDistributionChartProps {
  distribution: TopicDistributionItem[]
}

export function TopicDistributionChart({ distribution }: TopicDistributionChartProps) {
  const top5 = distribution.slice(0, 5)
  const otherProb = distribution.slice(5).reduce((sum, d) => sum + d.probability, 0)

  const data = [
    ...top5.map((d) => ({
      name: d.auto_label,
      value: Number((d.probability * 100).toFixed(1)),
    })),
    ...(otherProb > 0.01
      ? [{ name: "Other", value: Number((otherProb * 100).toFixed(1)) }]
      : []),
  ]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          formatter={(v: any) => [`${v}%`, "Probability"]}
        />
        <Legend
          formatter={(v) => <span style={{ fontSize: 11, color: "var(--foreground)" }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
