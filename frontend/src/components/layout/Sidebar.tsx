import { NavLink } from "react-router-dom"
import {
  Activity,
  Database,
  Factory,
  FileText,
  Gauge,
  Home,
  MessageSquare,
  Siren,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Overview", icon: Home, to: "/dashboard/overview" },
  { label: "Health", icon: Gauge, to: "/dashboard/health" },
  { label: "Assets", icon: Factory, to: "/dashboard/assets" },
  { label: "Alerts", icon: Siren, to: "/dashboard/alerts" },
  { label: "Copilot", icon: MessageSquare, to: "/dashboard/copilot" },
  { label: "Ingest", icon: Database, to: "/dashboard/ingest" },
  { label: "Maintenance", icon: Wrench, to: "/dashboard/maintenance" },
  { label: "Reports", icon: FileText, to: "/dashboard/reports" },
]

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col bg-sg-dark text-white h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sg-teal shadow-lg">
          <ShieldLogo size={20} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-normal text-white">Maintenance AI</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "relative flex h-10 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold transition-all duration-200",
                isActive
                  ? "border-transparent bg-white/[0.05] text-white"
                  : "border-transparent text-sg-slate-light hover:bg-white/[0.03] hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-sg-teal" />
                )}
                <item.icon size={17} className={isActive ? "text-sg-teal" : "text-sg-slate-light"} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-[10px] text-sg-slate">
          <Activity size={12} />
          <span>Maintenance AI v1.5</span>
        </div>
      </div>
    </aside>
  )
}

function ShieldLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
