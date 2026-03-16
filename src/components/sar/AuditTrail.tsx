import { motion } from "framer-motion";

const logs = [
  { time: "14:02:01", event: "XGBOOST_ANOMALY_DETECT", detail: "Model v4.2 | Risk: 98.2 | Entity: Alpha_X", hash: "a3f2c1d8" },
  { time: "14:02:03", event: "ALERT_GENERATED", detail: "THR_081 | Priority: CRITICAL | Auto-escalated", hash: "b7e4a2f1" },
  { time: "14:05:22", event: "RAG_SEARCH_COMPLETE", detail: "3 historical matches | Confidence: 0.94", hash: "c9d1e3a5" },
  { time: "14:08:15", event: "CASE_CREATED", detail: "CASE-2024-081 | Analyst: A. Sharma assigned", hash: "d2f5b8c3" },
  { time: "14:12:45", event: "ENTITY_GRAPH_GENERATED", detail: "7 nodes | 7 edges | 3 shell companies identified", hash: "e1a4d7f2" },
  { time: "14:18:30", event: "EVIDENCE_COMPILED", detail: "5 transactions | 1 wire transfer | Total: $1.37M", hash: "f3b2c9e8" },
  { time: "14:22:00", event: "LLM_GENERATE_NARRATIVE", detail: "Sections: 4/6 | Model: GPT-4 | Prompt v3.1", hash: "a7c5d1b4" },
  { time: "14:25:10", event: "COMPLIANCE_VALIDATE", detail: "5W Check: 4/5 passed | Missing: WHY detail", hash: "b8d3e2f6" },
  { time: "14:32:00", event: "ANALYST_EDIT_SECTION_3", detail: "Suspicious Behaviour — 2 modifications", hash: "c4e1f5a9" },
  { time: "14:35:45", event: "LLM_REGENERATE_SECTION", detail: "Section: Typology | Context: analyst edits applied", hash: "d6f2a3b7" },
  { time: "14:40:22", event: "SAR_DRAFT_SAVED", detail: "Version 3 | Size: 4.2KB | Status: Under Review", hash: "e9a5c8d1" },
  { time: "14:45:00", event: "SUPERVISOR_REVIEW_REQ", detail: "Escalated to J. Chen for final approval", hash: "f1b7d4e3" },
];

const eventColors: Record<string, string> = {
  XGBOOST: "text-destructive",
  ALERT: "text-destructive",
  RAG: "text-accent",
  LLM: "text-accent",
  CASE: "text-primary",
  ENTITY: "text-primary",
  EVIDENCE: "text-primary",
  COMPLIANCE: "text-compliance",
  ANALYST: "text-foreground",
  SAR: "text-compliance",
  SUPERVISOR: "text-risk-mid",
};

function getEventColor(event: string) {
  const prefix = event.split("_")[0];
  return eventColors[prefix] || "text-muted-foreground";
}

export function AuditTrail() {
  return (
    <div className="h-full flex flex-col">
      <div className="panel flex-1 flex flex-col">
        <div className="panel-header">
          <span>Immutable Audit Trail — CASE-2024-081</span>
          <span className="text-[10px] font-mono text-muted-foreground">{logs.length} ENTRIES</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-2">
            {logs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 px-3 py-1.5 hover:bg-muted/20 transition-colors font-mono text-[11px] border-b border-border/50"
              >
                <span className="text-muted-foreground shrink-0 w-16">[{log.time}]</span>
                <span className={`shrink-0 w-52 font-medium ${getEventColor(log.event)}`}>{log.event}</span>
                <span className="text-foreground/70 flex-1">{log.detail}</span>
                <span className="text-muted-foreground/50 shrink-0 text-[9px]">SHA:{log.hash}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="px-4 py-2 border-t border-border flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">AUDIT_INTEGRITY: VERIFIED</span>
          <span className="text-[10px] font-mono text-compliance">■ COMPLIANT</span>
        </div>
      </div>
    </div>
  );
}
