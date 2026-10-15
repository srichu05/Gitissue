import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { TopicWord } from "@/types"

interface TopicWordChartProps {
  words: TopicWord[]
  topN?: number
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function TopicWordChart({ words, topN = 15 }: TopicWordChartProps) {
  const data = words
    .slice(0, topN)
    .map((w) => ({ word: w.word, probability: Number((w.probability * 100).toFixed(2)) }))
    .reverse()

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="word"
          width={100}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--foreground)", fontFamily: "monospace" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          formatter={(v: any) => [`${v}%`, "Probability"]}
        />
        <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
