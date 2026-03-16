import { motion } from "framer-motion";
import { ChevronRight, Clock, User, FileText } from "lucide-react";

const cases = [
  { id: "CASE-2024-081", entity: "Entity Alpha_X", type: "Structuring", risk: 98.2, status: "In Progress", analyst: "A. Sharma", created: "2024-10-26" },
  { id: "CASE-2024-079", entity: "Entity Alpha_NY", type: "Layering", risk: 91.5, status: "Under Review", analyst: "J. Chen", created: "2024-10-25" },
  { id: "CASE-2024-074", entity: "Entity Beta_LDN", type: "Mule Account", risk: 87.3, status: "SAR Drafted", analyst: "A. Sharma", created: "2024-10-24" },
  { id: "CASE-2024-071", entity: "Entity Gamma_HK", type: "Rapid Movement", risk: 82.1, status: "Pending", analyst: "M. Rodriguez", created: "2024-10-23" },
  { id: "CASE-2024-068", entity: "Entity Delta_SG", type: "Structuring", risk: 76.8, status: "In Progress", analyst: "A. Sharma", created: "2024-10-22" },
];

const evidence = [
  { type: "Transaction", id: "TXN-44821", amount: "$245,000", date: "2024-10-25", flag: "Structuring" },
  { type: "Transaction", id: "TXN-44819", amount: "$9,900", date: "2024-10-25", flag: "Below Threshold" },
  { type: "Transaction", id: "TXN-44815", amount: "$9,850", date: "2024-10-24", flag: "Below Threshold" },
  { type: "Wire Transfer", id: "WT-11203", amount: "$1.2M", date: "2024-10-24", flag: "Cross-Border" },
  { type: "Transaction", id: "TXN-44810", amount: "$9,950", date: "2024-10-23", flag: "Below Threshold" },
];

const timeline = [
  { time: "14:02:01", event: "Alert triggered by XGBoost model v4.2", type: "alert" },
  { time: "14:05:22", event: "AI Review initiated — RAG search complete", type: "ai" },
  { time: "14:12:45", event: "Analyst A. Sharma assigned to case", type: "analyst" },
  { time: "14:18:30", event: "Entity network graph generated", type: "ai" },
  { time: "14:25:10", event: "Evidence objects compiled (5 transactions)", type: "system" },
  { time: "14:32:00", event: "SAR narrative draft generated", type: "ai" },
];

export function CaseInvestigation() {
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
        {/* Case List */}
        <div className="panel flex flex-col">
          <div className="panel-header">
            <span>Active Cases</span>
            <span className="text-[10px] font-mono text-primary">{cases.length} OPEN</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {cases.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="px-3 py-2.5 border-b border-border hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-muted-foreground">{c.id}</span>
                  <span className="font-display text-sm font-bold tracking-tighter text-destructive">{c.risk}</span>
                </div>
                <p className="text-xs font-medium text-foreground">{c.entity}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm risk-badge-high font-mono">{c.type}</span>
                  <span className="text-[10px] text-muted-foreground">{c.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  <User className="w-2.5 h-2.5" /> {c.analyst}
                  <Clock className="w-2.5 h-2.5 ml-2" /> {c.created}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Evidence Viewer */}
        <div className="panel flex flex-col">
          <div className="panel-header">
            <span>Evidence Viewer — CASE-2024-081</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Flagged Transactions</span>
            </div>
            {evidence.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="px-3 py-2 border-b border-border hover:bg-muted/20 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-foreground">{e.id}</span>
                  <span className="font-display text-sm font-semibold text-foreground">{e.amount}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{e.type} · {e.date}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm risk-badge-mid font-mono">{e.flag}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Investigation Timeline */}
        <div className="panel flex flex-col">
          <div className="panel-header">
            <span>Investigation Timeline</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            <div className="relative">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
              {timeline.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="relative pl-5 pb-4"
                >
                  <div className={`absolute left-0 top-1.5 w-[10px] h-[10px] rounded-full border-2 ${
                    t.type === "alert" ? "border-destructive bg-destructive/20" :
                    t.type === "ai" ? "border-accent bg-accent/20" :
                    t.type === "analyst" ? "border-compliance bg-compliance/20" :
                    "border-primary bg-primary/20"
                  }`} />
                  <span className="font-mono text-[10px] text-muted-foreground">[{t.time}]</span>
                  <p className="text-xs text-foreground mt-0.5">{t.event}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
