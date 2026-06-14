import { useState, useRef, useEffect } from "react"
import { Bot, Send, User, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Activity } from "lucide-react"
import { useDashboard } from "@/context/DashboardContext"
import { SectionHeading } from "@/components/shared/SectionHeading"

// Defined the strict type for the backend trace
interface NodeTraceItem {
  node: string
  status: "complete" | "fallback" | "warning"
  summary: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  nodeTrace?: NodeTraceItem[]
}

// Component to render the pipeline analysis drawer
const NodeTraceView = ({ trace }: { trace: NodeTraceItem[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="mt-3 border border-sg-stone rounded-lg overflow-hidden bg-white shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-sg-marble/50 text-sg-dark hover:bg-sg-marble transition-colors"
      >
        <span className="flex items-center gap-2">
          <Activity size={12} /> Pipeline Analysis
        </span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      
      {isOpen && (
        <div className="p-2 space-y-1 bg-white">
          {trace.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11px] py-1 border-b border-sg-stone/50 last:border-0">
              <div className="mt-0.5">
                {item.status === "complete" ? (
                  <CheckCircle size={10} className="text-green-500" />
                ) : (
                  <AlertTriangle size={10} className="text-amber-500" />
                )}
              </div>
              <div>
                <span className="font-bold text-sg-dark capitalize">{item.node.replace('_', ' ')}</span>
                <p className="text-sg-slate leading-tight">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CopilotPage() {
  const { sendChat, selectedEquipmentName } = useDashboard()
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: `Hello! I'm the Maintenance AI Maintenance Wizard. Ask me anything about ${selectedEquipmentName ?? "your equipment"}.` }
  ])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setSending(true)
    
    try {
      const response = await sendChat(userMsg)
      
      // FIX: Safely map backend data to the NodeTraceItem[] type
      const traceData: NodeTraceItem[] = (response.recommendation?.node_trace || []).map((item: any) => ({
        node: String(item.node || "process"),
        status: (item.status === "complete" || item.status === "fallback" || item.status === "warning") 
          ? item.status 
          : "complete",
        summary: String(item.summary || "")
      }))

      setMessages((prev) => [
        ...prev, 
        { 
          role: "assistant", 
          content: response.message,
          nodeTrace: traceData 
        }
      ])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing your request." }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fade-in">
      <div className="mb-4">
        <SectionHeading
          kicker="AI Assistant"
          title="Maintenance Wizard"
          detail={selectedEquipmentName ? `Context: ${selectedEquipmentName}` : "No asset selected"}
        />
      </div>

      <div className="panel flex-1 flex flex-col overflow-hidden">
        {/* Chat messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sg-teal/10 border border-sg-teal/20">
                  <Bot size={16} className="text-sg-teal" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-sg-dark text-white"
                    : "bg-sg-marble border border-sg-stone text-sg-dark"
                }`}
              >
                {msg.content}
                
                {/* Render pipeline analysis if trace data exists */}
                {msg.nodeTrace && msg.nodeTrace.length > 0 && <NodeTraceView trace={msg.nodeTrace} />}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sg-stone">
                  <User size={16} className="text-sg-dark" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sg-teal/10 border border-sg-teal/20">
                <Bot size={16} className="text-sg-teal animate-pulse" />
              </div>
              <div className="bg-sg-marble border border-sg-stone rounded-xl px-4 py-3 text-sm text-sg-slate">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-sg-stone p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Maintenance Wizard..."
              className="field-control flex-1 text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-sg-teal px-4 text-white transition-all hover:bg-sg-teal-hover active:scale-[0.98] disabled:opacity-50 text-xs font-bold"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
