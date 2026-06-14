import { useState, Suspense } from "react"
import { Outlet } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar, MobileNav } from "@/components/layout/TopBar"
import { useDashboard } from "@/context/DashboardContext"
import { LoadingPanel } from "@/components/shared/LoadingPanel"

export default function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { initialLoading, error, loadDashboard } = useDashboard()

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-sg-marble flex flex-col items-center justify-center">
        <div className="max-w-md w-full px-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sg-orange shadow-lg mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3 className="font-extrabold text-lg tracking-tight text-sg-dark mb-1">
            Maintenance AI
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate mb-6">
            Operations Database Hydration
          </p>

          {error ? (
            <div className="space-y-4 w-full">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-mono">
                Error: {error}
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="px-5 py-2.5 bg-sg-dark text-white text-xs font-semibold rounded-lg hover:bg-sg-dark-secondary transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-64 h-1.5 bg-sg-stone rounded-full overflow-hidden mb-4">
                <div className="h-full bg-sg-orange rounded-full transition-all duration-300" style={{ width: "60%" }} />
              </div>
              <p className="text-xs text-sg-slate font-mono">Initializing command center...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sg-marble">
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenuOpen={() => setMobileNavOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={window.location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense fallback={<LoadingPanel label="page" />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </section>
      </div>
    </div>
  )
}
