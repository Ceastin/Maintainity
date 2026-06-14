"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { EquipmentHealth } from "@/lib/types"

const colors = ["#14B8A6", "#EAB308", "#EF4444", "#F97316", "#38BDF8"]

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

export function HealthChart({ health }: { health: EquipmentHealth }) {
  const metricKeys = Object.keys(health.latest_reading.metrics)
  const rows = health.trend.map((reading) => {
    const time = new Date(reading.timestamp)
    return {
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      ...Object.fromEntries(
        metricKeys.map((key) => [key, normalizeToLimit(reading.metrics[key], health.equipment.thresholds[key])])
      ),
    }
  })

  return (
    <div className="panel h-[380px] w-full p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="kicker">Telemetry trend</p>
          <h3 className="mt-1 text-base font-bold text-sg-dark">{health.equipment.name}</h3>
          <p className="mt-1 text-xs font-semibold text-sg-slate">Signals shown as percent of their limit</p>
        </div>
        <span className="card-muted px-2 py-1 text-xs font-semibold text-sg-slate">
          {rows.length} samples
        </span>
      </div>
      <div className="mt-4 h-[260px] relative">
        {/* Data grid background */}
        <div className="absolute inset-0 data-grid-bg opacity-50 rounded pointer-events-none" />
        {/* Scanline */}
        <div className="absolute inset-y-0 w-[2px] bg-sg-orange/20 animate-scan pointer-events-none z-10" />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 22, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,25,23,0.06)" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#78716C", fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#78716C", fontSize: 12 }}
              width={42}
              domain={[0, 140]}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="4 4" opacity={0.4} />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                borderColor: "#F2EFE9",
                borderRadius: 10,
                boxShadow: "0px 4px 6px rgba(28, 25, 23, 0.04), 0px 12px 16px rgba(28, 25, 23, 0.08)",
                color: "#1C1917",
              }}
              labelStyle={{ color: "#1C1917", fontWeight: 700 }}
              formatter={(value, name) => [`${Number(value).toFixed(0)}%`, name]}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="line"
              wrapperStyle={{ fontSize: 12, fontWeight: 700, color: "#78716C" }}
            />
            {metricKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={labelMetric(key)}
                stroke={colors[index % colors.length]}
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
