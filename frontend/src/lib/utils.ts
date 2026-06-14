import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)
}

export function formatPercent(value?: number, options?: { digits?: number; floor?: boolean }): string {
  if (typeof value !== "number") return "Training"
  const digits = options?.digits ?? 2
  const percent = options?.floor ? Math.floor(value * 100) : value * 100
  return `${new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(percent)}%`
}

export function compactTime(value?: string): string {
  if (!value) return "Waiting"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function compactDate(value?: string): string {
  if (!value) return "Waiting"
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function riskBarColor(risk: string): string {
  if (risk === "critical") return "bg-sg-red"
  if (risk === "high") return "bg-sg-orange"
  if (risk === "medium") return "bg-sg-amber"
  return "bg-sg-teal"
}

export function riskTextColor(risk: string): string {
  if (risk === "critical") return "text-sg-red"
  if (risk === "high") return "text-sg-orange"
  if (risk === "medium") return "text-sg-amber"
  return "text-sg-teal"
}
