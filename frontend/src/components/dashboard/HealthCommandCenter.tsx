"use client"

import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts"
import {  ArrowUpRight, TriangleAlert } from "lucide-react"
import type { EquipmentHealth } from "@/lib/types"

function labelMetric(metric: string) {
  return metric
    .replace("_c", "")
    .replace("_a", "")
    .replace("_rpm", "")
    .replace("_mm_s", "")
    .replace("_m3_h", "")
    .replace("_bar", "")
    .replace("_ppm", "")
    .replaceAll("_", " ")
}

function normalizeToLimit(value: number, threshold?: Record<string, number>) {
  if (!threshold) return value
  if (typeof threshold.max === "number" && threshold.max > 0) {
    return Math.round((value / threshold.max) * 100)
  }
  if (typeof threshold.min === "number" && threshold.min > 0) {
    return Math.round((value / threshold.min) * 100)
  }
  return value
}

function rollingAverage(values: number[], window = 5) {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length)
  })
}

function statusTone(score: number) {
  if (score >= 100) return "Critical"
  if (score >= 85) return "Watch"
  return "Stable"
}

export function HealthCommandCenter({ health }: { health: EquipmentHealth }) {
  const metricKeys = Object.keys(health.latest_reading.metrics)
  const [selectedMetric, setSelectedMetric] = useState(metricKeys[0] ?? "")

  const metricSummaries = useMemo(() => {
    return metricKeys
      .map((key) => {
        const series = health.trend.map((reading) =>
          normalizeToLimit(reading.metrics[key], health.equipment.thresholds[key])
        )

        const latest = series.at(-1) ?? 0
        const prev = series.at(-2) ?? latest
        const first = series[0] ?? latest
        const avg = Math.round(series.reduce((a, b) => a + b, 0) / Math.max(series.length, 1))
        const delta = latest - prev
        const drift = latest - first
        const headroom = Math.max(0, 100 - latest)

        const risk =
          Math.max(0, latest - 100) * 2 +
          Math.max(0, latest - 85) * 0.8 +
          Math.max(0, delta) * 0.4 +
          Math.max(0, drift) * 0.2

        return {
          key,
          label: labelMetric(key),
          series,
          latest,
          prev,
          avg,
          delta,
          drift,
          headroom,
          risk,
        }
      })
      .sort((a, b) => b.risk - a.risk)
  }, [health, metricKeys])

  const focusMetric =
    metricSummaries.find((m) => m.key === selectedMetric) ?? metricSummaries[0]

  const focusSeries = focusMetric?.series ?? []
  const focusRows = focusSeries.map((value, i) => ({
    time: new Date(health.trend[i].timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value,
    avg: rollingAverage(focusSeries, 5)[i],
    warn: 85,
    crit: 100,
  }))

  const overallAvg =
    metricSummaries.length > 0
      ? Math.round(
          metricSummaries.reduce((sum, metric) => sum + metric.latest, 0) / metricSummaries.length
        )
      : 0

  const leadRisk = metricSummaries[0]
  const watchCount = metricSummaries.filter((m) => m.latest >= 85 && m.latest < 100).length
  const criticalCount = metricSummaries.filter((m) => m.latest >= 100).length

  return (
    <div className="panel w-full p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-xl">
          <p className="kicker">Telemetry command center</p>
          <h3 className="mt-1 text-base font-bold text-sg-dark">{health.equipment.name}</h3>
          <p className="mt-1 text-xs font-semibold text-sg-slate">
            Controller view: health score, headroom, leading risk, and live drift
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 xl:min-w-[420px]">
          <div className="card-muted rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate">Average load</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-extrabold text-sg-dark">{overallAvg}%</span>
              <span className="text-[11px] font-semibold text-sg-slate">of limit</span>
            </div>
          </div>

          <div className="card-muted rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate">Top risk</p>
            <div className="mt-2 flex items-center gap-2">
              <TriangleAlert size={16} className={leadRisk?.latest >= 100 ? "text-red-500" : "text-sg-orange"} />
              <span className="text-sm font-bold text-sg-dark truncate">
                {leadRisk?.label ?? "—"}
              </span>
            </div>
          </div>

          <div className="card-muted rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate">Status</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  criticalCount > 0
                    ? "bg-red-500"
                    : watchCount > 0
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              <span className="text-sm font-bold text-sg-dark">
                {criticalCount > 0 ? "Critical" : watchCount > 0 ? "Watch" : "Stable"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-2xl border border-sg-stone bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate">
                Focus metric
              </p>
              <h4 className="mt-1 text-sm font-bold text-sg-dark">
                {focusMetric?.label ?? "No metric selected"}
              </h4>
              <p className="mt-1 text-xs text-sg-slate">
                Latest: {focusMetric?.latest ?? 0}% · Headroom: {focusMetric?.headroom ?? 0}% ·
                Trend: {focusMetric?.delta ?? 0 >= 0 ? "+" : ""}
                {focusMetric?.delta ?? 0}%
              </p>
            </div>

            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="field-control w-full md:w-[220px]"
            >
              {metricSummaries.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 h-[300px] relative">
            <div className="absolute inset-0 data-grid-bg opacity-40 rounded-xl pointer-events-none" />
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={focusRows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,25,23,0.06)" vertical={false} />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#78716C", fontSize: 12 }}
                  minTickGap={18}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#78716C", fontSize: 12 }}
                  width={42}
                  domain={[0, 140]}
                  tickFormatter={(value) => `${value}%`}
                />
                <ReferenceLine y={85} stroke="#EAB308" strokeDasharray="4 4" opacity={0.45} />
                <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="4 4" opacity={0.45} />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    borderColor: "#F2EFE9",
                    borderRadius: 12,
                    boxShadow:
                      "0px 4px 6px rgba(28, 25, 23, 0.04), 0px 12px 16px rgba(28, 25, 23, 0.08)",
                    color: "#1C1917",
                  }}
                  labelStyle={{ color: "#1C1917", fontWeight: 700 }}
                  formatter={(value, name) => [`${Number(value).toFixed(0)}%`, name]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={focusMetric?.label ?? "Metric"}
                  stroke="#2CBFAE"
                  strokeWidth={2.8}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="Rolling average"
                  stroke="#F97316"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-sg-stone bg-sg-marble p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate">
                Risk ranking
              </p>
              <h4 className="mt-1 text-sm font-bold text-sg-dark">Most important signals first</h4>
            </div>
            <div className="rounded-full bg-white border border-sg-stone px-2.5 py-1 text-[10px] font-bold text-sg-slate">
              {health.trend.length} samples
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {metricSummaries.slice(0, 4).map((metric) => {
              const trendTone =
                metric.latest >= 100 ? "bg-red-500" : metric.latest >= 85 ? "bg-amber-500" : "bg-emerald-500"

              return (
                <div key={metric.key} className="rounded-2xl border border-sg-stone bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${trendTone}`} />
                        <span className="text-sm font-bold text-sg-dark truncate">{metric.label}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-sg-slate">
                        Latest {metric.latest}% · Avg {metric.avg}% · Drift {metric.drift >= 0 ? "+" : ""}
                        {metric.drift}%
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-sg-dark">{metric.headroom}% headroom</p>
                      <p className="text-[10px] text-sg-slate">{statusTone(metric.latest)}</p>
                    </div>
                  </div>

                  <div className="mt-3 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metric.series.map((value, i) => ({ value, index: i }))}>
                        <defs>
                          <linearGradient id={`spark-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2CBFAE" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#2CBFAE" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#2CBFAE"
                          fill={`url(#spark-${metric.key})`}
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 min-w-max pb-1">
          {metricSummaries.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`w-[180px] flex-shrink-0 rounded-2xl border p-3 text-left transition-all duration-200 ${
                selectedMetric === metric.key
                  ? "border-sg-orange bg-white shadow-lg"
                  : "border-sg-stone bg-white hover:border-sg-teal/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sg-slate truncate">
                  {metric.label}
                </span>
                <ArrowUpRight
                  size={14}
                  className={
                    metric.latest >= 100
                      ? "text-red-500"
                      : metric.latest >= 85
                      ? "text-amber-500"
                      : "text-sg-teal"
                  }
                />
              </div>

              <div className="mt-2 flex items-end justify-between">
                <div>
                  <p className="text-lg font-extrabold text-sg-dark">{metric.latest}%</p>
                  <p className="text-[10px] text-sg-slate">
                    {metric.delta >= 0 ? "+" : ""}
                    {metric.delta}% change
                  </p>
                </div>
                <span className="text-[10px] font-bold text-sg-slate">{metric.headroom}% free</span>
              </div>

              <div className="mt-2 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.series.map((value, i) => ({ value, index: i }))}>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={selectedMetric === metric.key ? "#F97316" : "#2CBFAE"}
                      fill="transparent"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}