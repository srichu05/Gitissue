import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { TrendDataPoint, Topic } from "@/types"

interface TrendChartProps {
  data: TrendDataPoint[]
  topics: Pick<Topic, "topic_index" | "auto_label" | "label">[]
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
]

export function TrendChart({ data, topics }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          formatter={(v: any) => [`${v}%`, ""]}
        />
        <Legend
          formatter={(v) => {
            const topic = topics.find((t) => `topic_${t.topic_index}` === v)
            return (
              <span style={{ fontSize: 11, color: "var(--foreground)" }}>
                {topic?.label ?? topic?.auto_label ?? v}
              </span>
            )
          }}
        />
        {topics.map((topic, i) => (
          <Area
            key={topic.topic_index}
            type="monotone"
            dataKey={`topic_${topic.topic_index}`}
            stackId="1"
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.7}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
