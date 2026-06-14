import { useState } from "react"
import { UploadCloud, FileText, Database, Siren, Bell, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/context/DashboardContext"
import { SectionHeading } from "@/components/shared/SectionHeading"

const ingestModes = [
  { id: "document" as const, label: "Document", icon: FileText, desc: "Add maintenance documents, SOPs, and reports to the RAG knowledge base" },
  { id: "sensor" as const, label: "Sensor", icon: Database, desc: "Ingest raw sensor readings for anomaly detection and health scoring" },
  { id: "fault" as const, label: "Fault Event", icon: Siren, desc: "Record fault events and system failures for pattern analysis" },
  { id: "alert" as const, label: "Alert", icon: Bell, desc: "Manually create or ingest automated alerts" },
  { id: "spare" as const, label: "Spare Part", icon: Package, desc: "Manage spare parts inventory and lead times" },
]

export default function IngestPage() {
  const { equipment } = useDashboard()
  const [activeMode, setActiveMode] = useState<typeof ingestModes[number]["id"]>(("document"))
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? "")
  const [textContent, setTextContent] = useState("")
  const [jsonContent, setJsonContent] = useState("{\n  \"temperature_c\": 85,\n  \"vibration_mm_s\": 4.2\n}")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const selectedEquipment = equipment.find((e) => e.id === equipmentId)
  const activeModeData = ingestModes.find((m) => m.id === activeMode)!

  const handleSubmit = async () => {
    setSubmitting(true)
    setResult(null)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000))
    setResult(`Successfully ingested ${activeModeData.label.toLowerCase()} data for ${selectedEquipment?.name ?? "equipment"}.`)
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeading kicker="Data Pipeline" title="Ingest Plant Data" detail="Add documents, sensor data, fault events, and more" />

      {/* Mode selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {ingestModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 text-center",
              activeMode === mode.id
                ? "border-sg-teal bg-sg-teal/5"
                : "border-sg-stone bg-white hover:border-sg-teal/25"
            )}
          >
            <mode.icon size={20} className={activeMode === mode.id ? "text-sg-teal" : "text-sg-slate"} />
            <span className={cn("text-xs font-bold", activeMode === mode.id ? "text-sg-teal" : "text-sg-slate")}>
              {mode.label}
            </span>
          </button>
        ))}
      </div>

      {/* Ingest form */}
      <div className="panel p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-sg-dark flex items-center gap-2">
            <activeModeData.icon size={16} className="text-sg-teal" />
            Ingest {activeModeData.label}
          </h3>
          <p className="text-xs text-sg-slate mt-1">{activeModeData.desc}</p>
        </div>

        <div className="space-y-4">
          {/* Equipment selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Target Equipment</label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="field-control w-full text-sm"
            >
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.name} — {eq.area}</option>
              ))}
            </select>
          </div>

          {/* Content input based on mode */}
          {activeMode === "document" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Document Content</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste maintenance documentation, SOP text, or failure reports here..."
                className="field-control w-full h-32 text-sm resize-none"
              />
            </div>
          )}

          {activeMode === "sensor" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Sensor Readings (JSON)</label>
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="field-control w-full h-40 text-sm font-mono resize-none"
              />
              <p className="text-[10px] text-sg-slate mt-1">Enter JSON object with sensor names as keys and numeric values.</p>
            </div>
          )}

          {(activeMode === "fault" || activeMode === "alert") && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Description</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={`Describe the ${activeMode} event...`}
                className="field-control w-full h-24 text-sm resize-none"
              />
            </div>
          )}

          {activeMode === "spare" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Part Name</label>
                <input type="text" className="field-control w-full text-sm" placeholder="Bearing kit SE-4400" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Stock Count</label>
                <input type="number" className="field-control w-full text-sm" placeholder="5" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Lead Time (days)</label>
                <input type="number" className="field-control w-full text-sm" placeholder="14" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sg-slate mb-1.5">Supplier</label>
                <input type="text" className="field-control w-full text-sm" placeholder="SKF Industries" />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sg-teal hover:bg-sg-teal-hover text-white text-xs font-bold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <UploadCloud size={16} />
              {submitting ? "Ingesting..." : `Ingest ${activeModeData.label}`}
            </button>
            {result && (
              <span className="text-xs font-semibold text-sg-teal">{result}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
