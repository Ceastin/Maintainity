import { useLocation } from "react-router-dom"
import {
  Bell,
  Menu,
  Pause,
  Play,
  RefreshCw,
  Shield,
  UserCircle,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/context/DashboardContext"
import { ConnectionPill } from "@/components/shared/ConnectionPill"

const pageTitles: Record<string, string> = {
  "/dashboard/overview": "Dashboard Overview",
  "/dashboard/health": "Health Analytics",
  "/dashboard/assets": "Asset Management",
  "/dashboard/alerts": "Alert Center",
  "/dashboard/copilot": "AI Copilot",
  "/dashboard/ingest": "Data Ingestion",
  "/dashboard/maintenance": "Maintenance",
  "/dashboard/reports": "Reports",
}

export function TopBar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { pathname } = useLocation()
  const { apiStatus, live, setLive, busy, notifications, loadDashboard } = useDashboard()
  const title = pageTitles[pathname] ?? "Command Center"

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-sg-stone bg-white/80 backdrop-blur-md px-4 sm:px-6 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-sg-stone text-sg-slate hover:bg-sg-marble lg:hidden transition-colors"
        >
          <Menu size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-sg-dark">{title}</h1>
            <ConnectionPill status={apiStatus} compact />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title={live ? "Pause live stream" : "Resume live stream"}
          onClick={() => setLive((v: boolean) => !v)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200",
            live
              ? "border-sg-teal/30 bg-sg-teal/10 text-sg-teal"
              : "border-sg-stone text-sg-slate hover:border-sg-teal/30 hover:text-sg-teal"
          )}
        >
          {live ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          type="button"
          title="Refresh dashboard"
          onClick={() => void loadDashboard()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sg-stone text-sg-slate hover:bg-sg-marble transition-colors"
        >
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
        </button>

        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sg-stone text-sg-slate hover:bg-sg-marble transition-colors"
        >
          <Bell size={15} />
          {notifications.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sg-red px-1 text-[10px] font-bold text-white">
              {notifications.length}
            </span>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-2 border-l border-sg-stone pl-3 ml-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sg-stone text-sg-slate">
            <UserCircle size={18} />
          </div>
          <span className="text-xs font-semibold text-sg-slate">Maintenance Engineer</span>
        </div>
      </div>
    </header>
  )
}

export function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { pathname } = useLocation()

  const navItems = [
    { label: "Overview", to: "/dashboard/overview" },
    { label: "Health", to: "/dashboard/health" },
    { label: "Assets", to: "/dashboard/assets" },
    { label: "Alerts", to: "/dashboard/alerts" },
    { label: "Copilot", to: "/dashboard/copilot" },
    { label: "Ingest", to: "/dashboard/ingest" },
    { label: "Maintenance", to: "/dashboard/maintenance" },
    { label: "Reports", to: "/dashboard/reports" },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-[280px] bg-sg-dark text-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sg-teal">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold">Maintenance AI</span>
          </div>
          <button onClick={onClose} className="text-sg-slate-light hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              onClick={(e) => {
                e.preventDefault()
                window.location.href = item.to
                onClose()
              }}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                pathname === item.to
                  ? "bg-white/[0.05] text-white border-l-[3px] border-sg-teal"
                  : "text-sg-slate-light hover:bg-white/[0.03] hover:text-white"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
