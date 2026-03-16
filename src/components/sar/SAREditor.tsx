import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, AlertCircle, Copy, FileDown } from "lucide-react";

const sarSections = [
  {
    id: "summary",
    title: "Executive Summary",
    content: "This Suspicious Activity Report documents a series of transactions involving Entity Alpha_X (Account #4482-1903) that exhibit characteristics consistent with structuring and layering typologies. Between October 20-26, 2024, seventeen (17) transactions were identified with amounts deliberately maintained below the $10,000 reporting threshold, totaling approximately $168,500.",
    status: "complete" as const,
    sources: ["TXN-44821", "TXN-44819", "TXN-44815"],
  },
  {
    id: "entity",
    title: "Entity Mapping",
    content: "Entity Alpha_X operates through a network of three (3) shell companies registered in jurisdictions with limited beneficial ownership disclosure. The primary entity is linked to ENTITY_DELTA_NY through intermediate accounts at two correspondent banking relationships.",
    status: "complete" as const,
    sources: ["KYC-ALPHA", "ENTITY-GRAPH-081"],
  },
  {
    id: "behavior",
    title: "Suspicious Behaviour Analysis",
    content: "XGBoost anomaly detection model (v4.2) identified a 47.2% deviation from peer group 'Retail_SME' in transaction velocity metrics. Behavioural indicators include: (1) rapid sequential deposits below CTR threshold, (2) immediate wire transfers to high-risk jurisdictions within 24 hours of deposit, (3) circular fund flow patterns through shell company accounts.",
    status: "review" as const,
    sources: ["XGBOOST-ANOMALY-081", "VECT_DB-MATCH-3"],
  },
  {
    id: "transactions",
    title: "Transaction Analysis",
    content: "Analysis of the transaction timeline reveals a pattern of structured deposits made across 5 branch locations over a 6-day period. Individual transaction amounts ranged from $9,100 to $9,950, with a mean of $9,912. Wire transfer WT-11203 ($1.2M) to correspondent bank in Hong Kong occurred within 18 hours of the final structured deposit.",
    status: "draft" as const,
    sources: ["TXN-44810", "TXN-44815", "TXN-44819", "WT-11203"],
  },
  {
    id: "typology",
    title: "Typology Explanation",
    content: "",
    status: "pending" as const,
    sources: [],
  },
  {
    id: "justification",
    title: "Evidence Justification",
    content: "",
    status: "pending" as const,
    sources: [],
  },
];

const fiveW = [
  { label: "WHO", detail: "Entity Alpha_X, ENTITY_DELTA_NY", complete: true },
  { label: "WHAT", detail: "Structuring, layering, cross-border transfers", complete: true },
  { label: "WHEN", detail: "October 20-26, 2024", complete: true },
  { label: "WHERE", detail: "NY, Hong Kong, London", complete: true },
  { label: "WHY", detail: "Suspected money laundering via shell companies", complete: false },
];

const statusStyles = {
  complete: "text-compliance border-compliance/30 bg-compliance/10",
  review: "text-risk-mid border-risk-mid/30 bg-risk-mid/10",
  draft: "text-primary border-primary/30 bg-primary/10",
  pending: "text-muted-foreground border-border bg-muted/20",
};

export function SAREditor() {
  const [activeSection, setActiveSection] = useState("summary");

  return (
    <div className="h-full flex gap-2 overflow-hidden">
      {/* SAR Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="panel flex-1 flex flex-col">
          <div className="panel-header">
            <span>SAR Narrative — CASE-2024-081</span>
            <div className="flex gap-2">
              <button className="text-[10px] font-mono px-2 py-1 rounded-sm bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Generate Section
              </button>
              <button className="text-[10px] font-mono px-2 py-1 rounded-sm bg-muted text-foreground border border-border hover:bg-muted/80 transition-colors flex items-center gap-1">
                <FileDown className="w-3 h-3" /> Export XML
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {sarSections.map((section, i) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`mb-4 p-3 rounded-sm border cursor-pointer transition-all ${
                  activeSection === section.id ? "glow-border bg-muted/20" : "border-border hover:border-primary/20"
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">{section.title}</h3>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm border ${statusStyles[section.status]}`}>
                    {section.status}
                  </span>
                </div>
                {section.content ? (
                  <>
                    <p className="text-xs text-foreground/80 leading-relaxed">{section.content}</p>
                    {section.sources.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {section.sources.map(src => (
                          <span key={src} className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent border border-accent/20 cursor-pointer hover:bg-accent/20 transition-colors">
                            📎 {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <span className="font-mono text-[11px] text-muted-foreground">NO_CONTENT_GENERATED</span>
                    <br />
                    <button className="mt-2 text-[10px] font-mono px-3 py-1 rounded-sm bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Generate
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 5W Validation + Controls */}
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <div className="panel flex-1 flex flex-col">
          <div className="panel-header">
            <span>5W Compliance Check</span>
          </div>
          <div className="p-3 space-y-2">
            {fiveW.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className={`p-2 rounded-sm border ${item.complete ? "border-compliance/30 bg-compliance/5" : "border-border bg-muted/10"}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {item.complete ? (
                    <Check className="w-3 h-3 text-compliance" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-risk-mid" />
                  )}
                  <span className="font-display text-xs font-semibold text-foreground">{item.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground pl-4">{item.detail}</p>
              </motion.div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-muted-foreground">COMPLETENESS</span>
              <span className="text-xs font-display font-bold text-risk-mid">80%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(var(--compliance)), hsl(var(--risk-mid)))" }}
                initial={{ width: 0 }}
                animate={{ width: "80%" }}
                transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
          </div>
        </div>

        <div className="panel p-3">
          <div className="space-y-2">
            <button className="w-full text-[11px] font-mono py-2 rounded-sm bg-compliance/10 text-compliance border border-compliance/30 hover:bg-compliance/20 transition-colors flex items-center justify-center gap-1.5">
              <Check className="w-3 h-3" /> Approve SAR
            </button>
            <button className="w-full text-[11px] font-mono py-2 rounded-sm bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5">
              <Copy className="w-3 h-3" /> Submit to Regulator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
