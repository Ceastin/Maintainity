import { useEffect, useState, type MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  Database,
  Gauge,
  Layers,
  LayoutDashboard,
  Shield,
  Zap,
} from "lucide-react"
import EmberSurface from "@/components/landing/EmberSurface"

const featureCards = [
  {
    icon: Activity,
    title: "Real-Time Anomaly Scoring",
    desc: "Weighted multi-signal anomaly evaluations comparing temp, speed, torque, vibration, and flow rate against baseline values.",
  },
  {
    icon: Brain,
    title: "Adaptive Ensemble Classifier",
    desc: "Dynamically trains ExtraTrees and RandomForest classifiers to predict failure modes and severity.",
  },
  {
    icon: Bot,
    title: "Retrieval-Augmented Guidance",
    desc: "Semantic search contexts over SOP logs with OpenAI embeddings and local TF-IDF fallback.",
  },
  {
    icon: Database,
    title: "Live Telemetry Ingestion",
    desc: "Continuously streams machine signals into the dashboard with synchronized backend updates and status tracking.",
  },
  {
    icon: Gauge,
    title: "Predictive Maintenance Planning",
    desc: "Turns model outputs into practical action windows, maintenance priorities, and operational recommendations.",
  },
]

const telemetryItems = [
  { label: "Stream Step", value: "1,247" },
  { label: "Logs Ingested", value: "842,391" },
  { label: "Active Classifier", value: "ExtraTrees" },
  { label: "RAG Embeddings", value: "text-embedding-3-small" },
  { label: "Anomaly Threshold", value: "0.47" },
  { label: "Fleet Health", value: "94.2%" },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLaunch = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsLaunching(true)
    setTimeout(() => navigate("/dashboard"), 1200)
  }

  return (
    <div className="min-h-screen bg-sg-marble text-sg-dark overflow-x-hidden relative">
      {isLaunching && (
        <div className="fixed inset-0 z-[100] bg-sg-marble/95 flex flex-col items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sg-orange shadow-lg mb-4">
            <Shield size={24} className="text-white" />
          </div>
          <h3 className="font-extrabold text-lg tracking-tight text-sg-dark mb-1">Mitigity AI</h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate mb-8">
            Launching Console
          </p>
          <div className="w-64 h-1.5 bg-sg-stone rounded-full overflow-hidden">
            <div className="h-full bg-sg-orange rounded-full animate-pulse" style={{ width: "70%" }} />
          </div>
          <p className="text-xs text-sg-slate font-mono mt-3">Connecting to FastAPI backend...</p>
        </div>
      )}

      <header
        className={`fixed z-50 transition-[top,left,width,transform,background-color,border-radius,box-shadow,padding,backdrop-filter] duration-500 ease-in-out ${
          scrolled
            ? "top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl bg-white/95 backdrop-blur-md border border-sg-stone shadow-xl rounded-2xl py-3"
            : "top-0 left-0 right-0 w-full bg-transparent py-5 rounded-none shadow-none border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sg-teal shadow-md">
              <Shield size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-sg-dark">
              Mitigity <span className="text-sg-black font-medium">AI</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-sg-black">
            
          </nav>

          <button
            onClick={handleLaunch}
            className="px-4 py-2 bg-sg-teal hover:bg-sg-orange-hover text-white text-xs font-bold rounded-md shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5"
          >
            Dashboard <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <section className="relative pt-36 pb-16 md:pt-44 md:pb-24 w-full">
        <EmberSurface />

        <div className="text-center max-w-3xl mx-auto mb-14 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sg-stone text-[10px] uppercase font-bold tracking-widest text-sg-teal mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-sg-teal animate-pulse" />
            Reliability Platform v1.5
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-sg-dark leading-[1.1] mb-6">
            Industrial intelligence for{" "}
            <span className="text-sg-teal">steel plant reliability</span>
          </h1>

          <p className="text-sm sm:text-base text-sg-dark-secondary leading-relaxed max-w-2xl mx-auto mb-8">
            Mitigity AI unites real-time multi-signal anomaly thresholds, auto-selecting ensemble
            tree classifiers, and semantic RAG search to prevent outages, estimate remaining useful
            life (RUL), and plan automated actions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLaunch}
              className="w-full sm:w-auto px-6 py-3 bg-sg-teal hover:bg-sg-orange-hover text-white text-xs font-bold rounded-md shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <LayoutDashboard size={16} /> Enter Operations Dashboard
            </button>
            <a
              href="#architecture"
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-sg-marble text-sg-dark text-xs font-bold rounded-md border border-sg-stone transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Layers size={16} /> Explore Blueprint
            </a>
          </div>
        </div>

        <div className="relative max-w-3xl mx-auto z-10">
          <div className="relative overflow-hidden rounded-2xl border border-sg-stone bg-white shadow-2xl">

            {/* Glow */}
            <div className="absolute -top-20 right-0 h-48 w-48 rounded-full bg-sg-orange/10 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-48 w-48 rounded-full bg-sg-teal/10 blur-3xl" />

            {/* Browser Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-sg-stone bg-sg-marble">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>

              <div className="px-3 py-0.5 rounded-full bg-white border border-sg-stone text-[9px] font-mono text-sg-slate">
                Mitigity-ai.live
              </div>

              <div className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </div>
            </div>

            <div className="p-4 bg-sg-marble">

              {/* KPI Cards */}
              <div className="grid grid-cols-5 gap-3 mb-4">

                {[
                  ["Health", "94.2%", "text-emerald-500"],
                  ["Risk", "Low", "text-sky-500"],
                  ["Assets", "126", "text-sg-orange"],
                  ["Alerts", "03", "text-amber-500"],
                  ["RUL", "412h", "text-violet-500"],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-sg-stone bg-white p-3"
                  >
                    <p className="text-[9px] uppercase text-sg-slate mb-1">
                      {label}
                    </p>

                    <p className={`text-sm font-bold ${color}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-3 gap-3">

                {/* Live Chart */}
                <div className="col-span-2 rounded-lg border border-sg-stone bg-white p-3 h-32">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-semibold text-sg-dark">
                      Equipment Health Trend
                    </div>

                    <div className="text-[9px] text-emerald-500 font-bold">
                      +4.8%
                    </div>
                  </div>

                  <div className="flex items-end gap-1 h-16">
                    {[30,45,35,60,55,75,65,90,70,85].map((h,i)=>(
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-sg-teal to-sg-orange animate-pulse"
                        style={{
                          height:`${h}%`,
                          animationDelay:`${i*100}ms`
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-2 flex justify-between text-[8px] text-sg-slate">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="rounded-lg border border-sg-stone bg-white p-3 h-32">

                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md bg-sg-orange/10 flex items-center justify-center">
                      #
                    </div>

                    <span className="text-[10px] font-semibold">
                      AI Insights
                    </span>
                  </div>

                  <div className="space-y-2">

                    <div className="rounded bg-emerald-50 px-2 py-1 text-[8px] text-emerald-700">
                      Bearing vibration normal
                    </div>

                    <div className="rounded bg-amber-50 px-2 py-1 text-[8px] text-amber-700">
                      Torque anomaly detected
                    </div>

                    <div className="rounded bg-sky-50 px-2 py-1 text-[8px] text-sky-700">
                      RUL updated: +17 hrs
                    </div>

                  </div>
                </div>

              </div>

              {/* Bottom Live Activity Feed */}
              <div className="mt-3 rounded-lg border border-sg-stone bg-white px-3 py-2">
                <div className="flex items-center justify-between">

                  <span className="text-[10px] font-semibold text-sg-dark">
                    Live Activity
                  </span>

                  <span className="text-[8px] text-emerald-500 font-bold">
                    STREAMING
                  </span>
                </div>

                <div className="mt-2 flex gap-2 overflow-hidden">

                  {[
                    "Sensor #24 synced",
                    "Model retrained",
                    "RAG query executed",
                    "Anomaly score updated",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-full bg-sg-orange/10 px-2 py-1 text-[8px] text-sg-dark"
                    >
                      {item}
                    </div>
                  ))}

                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 max-w-7xl mx-auto px-6 border-t border-sg-stone">
  <div className="text-center mb-12">
    <p className="kicker mb-2">Core Capabilities</p>
    <h2 className="text-2xl sm:text-3xl font-extrabold text-sg-dark tracking-tight">
      Designed for high-intensity steel plant diagnostics
    </h2>
  </div>

  <div className="overflow-x-auto pb-3">
    <div className="flex gap-6 min-w-max">
      {featureCards.map((card) => (
        <div
          key={card.title}
          className="group bg-white border border-sg-stone rounded-2xl p-6 transition-all duration-200 hover:border-sg-orange/30 hover:shadow-elevated w-[320px] flex-shrink-0"
          style={{ borderTop: "3px solid transparent" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderTop = "3px solid #2CBFAE"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderTop = "3px solid transparent"
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-sg-orange/10 border border-sg-teal/20 flex items-center justify-center text-sg-teal mb-4 group-hover:scale-105 transition-transform">
            <card.icon size={20} />
          </div>
          <h3 className="text-sm font-bold text-sg-dark mb-2">{card.title}</h3>
          <p className="text-xs text-sg-slate leading-relaxed">{card.desc}</p>
        </div>
      ))}
    </div>
  </div>
</section>

      <section id="telemetry" className="py-12 bg-sg-dark overflow-hidden">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase font-bold tracking-widest text-sg-slate mb-1">
            Live System Telemetry
          </p>
          <p className="text-xs text-sg-slate-light">Real-time metrics from the FastAPI backend</p>
        </div>
        <div className="relative">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...telemetryItems, ...telemetryItems, ...telemetryItems].map((item, i) => (
              <div key={i} className="inline-flex items-center mx-8">
                <span className="text-[10px] uppercase font-bold tracking-wider text-sg-slate mr-2">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-white font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="py-20 max-w-7xl mx-auto px-6 border-t border-sg-stone">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="kicker mb-2">Technical Blueprints</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-sg-dark tracking-tight mb-4">
              Decoupled hybrid pipeline architecture
            </h2>
            <p className="text-xs text-sg-slate leading-relaxed mb-6">
              Traces a telemetry signal's path from plant equipment logs into scoring, ML
              classification, and Expert Rule heuristics. The system dynamically selects between
              ExtraTrees and RandomForest classifiers based on real-time validation metrics.
            </p>
            <ul className="space-y-3">
              {[
                "Telemetry Mapping: Maps raw UCI parameters to assets",
                "Parallel Scorers: ML, anomaly, and rule outputs run concurrently",
                "Vector Corpus: Embeds manuals to supplement logic via RAG",
                "Auto-Tick Stream: 6-second live data refresh cycle",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-sg-slate">
                  <Zap size={14} className="text-sg-teal mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-sg-stone p-6 shadow-card">
            <div className="space-y-3">
              {[
                { label: "Sensor Ingestion", icon: Database, color: "bg-sg-teal/10 text-sg-teal border-sg-teal/20" },
                { label: "Anomaly Detection", icon: Activity, color: "bg-sg-amber/10 text-sg-amber border-sg-amber/20" },
                { label: "ML Classification", icon: Brain, color: "bg-sg-orange/10 text-sg-orange border-sg-orange/20" },
                { label: "RAG Evidence", icon: Bot, color: "bg-sg-teal/10 text-sg-dark-secondary border-sg-teal/20" },
                { label: "Recommendation", icon: Gauge, color: "bg-sg-stone text-sg-dark-secondary border-sg-stone" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${step.color}`}>
                    <step.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sg-dark">{step.label}</span>
                      <span className="text-[10px] font-mono text-sg-slate">Step {i + 1}</span>
                    </div>
                    <div className="h-1.5 bg-sg-stone rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-sg-teal rounded-full"
                        style={{ width: `${(i + 1) * 20}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 max-w-5xl mx-auto px-6">
        <div className="relative rounded-2xl bg-white border border-sg-stone p-8 md:p-12 text-center overflow-hidden shadow-card">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sg-orange/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sg-orange/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-2xl font-extrabold text-sg-dark mb-3">
              Ready to simulate rolling mill health?
            </h3>
            <p className="text-sg-slate text-xs max-w-xl mx-auto mb-6">
              Access the Operations Dashboard console to view live mock telemetry streams, trigger
              artificial fault scenarios, and explore wizard recommendation pipelines.
            </p>
            <button
              onClick={handleLaunch}
              className="px-7 py-3.5 bg-sg-teal hover:bg-sg-orange-hover text-white font-bold text-sm rounded-md shadow-sm transition-all duration-200 active:scale-[0.98] inline-flex items-center gap-2"
            >
              Launch Platform Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <footer className="py-10 border-t border-sg-stone bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-sg-teal">
              <Shield size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm text-sg-dark">Mitigity AI</span>
          </div>
          <p className="text-xs text-sg-slate">
            &copy; {new Date().getFullYear()} Mitigity AI. Built for the Steel Industry.
          </p>
        </div>
      </footer>
    </div>
  )
}