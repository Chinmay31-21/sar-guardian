import { useState, useMemo } from "react";
import { useSARData } from "@/context/SARDataContext";
import { getRegulatoryBreaches } from "@/lib/csvLoader";
import type { SARReport, SARStatus } from "@/data/synthetic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock, User, Shield, X, FileText, CheckSquare, Square,
  AlertCircle, AlertTriangle, ThumbsUp, ThumbsDown, RotateCcw,
  ChevronRight, Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/context/ProfileContext";

// ─── Types ─────────────────────────────────────────────────────────────────────

const COLUMNS: { status: SARStatus; label: string; color: string; borderColor: string }[] = [
  { status: "draft", label: "Draft", color: "bg-muted/60", borderColor: "border-muted-foreground/20" },
  { status: "review", label: "In Review", color: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  { status: "approved", label: "Approved", color: "bg-primary/10", borderColor: "border-primary/30" },
  { status: "filed", label: "Filed", color: "bg-green-500/10", borderColor: "border-green-500/30" },
];

const APPROVAL_CHECKLIST = [
  "Narrative accurately describes all suspicious transactions and patterns",
  "Regulatory citations have been reviewed and confirmed by compliance",
  "All connected entities are documented with supporting evidence",
  "No exculpatory facts have been omitted from the filing",
  "Risk score and typology classification have been independently verified",
];

const REJECT_REASONS = [
  "Insufficient evidence for filing threshold",
  "Narrative requires additional detail on transaction timeline",
  "Missing beneficial ownership documentation",
  "Regulatory citations incomplete or incorrect",
  "Requires further investigation before filing",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function priorityVariant(p: string): "riskHigh" | "riskMedium" | "riskLow" {
  if (p === "high") return "riskHigh";
  if (p === "medium") return "riskMedium";
  return "riskLow";
}

function statusIcon(status: SARStatus) {
  switch (status) {
    case "filed": return <Shield className="w-3 h-3 text-green-500" />;
    case "approved": return <ThumbsUp className="w-3 h-3 text-primary" />;
    case "review": return <AlertCircle className="w-3 h-3 text-amber-500" />;
    default: return <FileText className="w-3 h-3 text-muted-foreground" />;
  }
}

// Build regulatory breaches from SAR trigger rules
function getBreachesForSar(sar: SARReport) {
  const riskTypes = sar.triggerRules
    ? sar.triggerRules.map((r) => {
        if (r.name.toLowerCase().includes("struct")) return "Offshore Structuring";
        if (r.name.toLowerCase().includes("crypto")) return "Crypto Laundering Indicator";
        if (r.name.toLowerCase().includes("shell") || r.name.toLowerCase().includes("offshore")) return "Shell Company Transfer";
        if (r.name.toLowerCase().includes("trade")) return "Trade Finance Fraud";
        return "Suspicious Financial Activity";
      })
    : ["Suspicious Financial Activity"];
  return getRegulatoryBreaches([...new Set(riskTypes)]);
}

// ─── SAR Detail Panel ──────────────────────────────────────────────────────────

interface SARDetailProps {
  sar: SARReport;
  onClose: () => void;
  onApprove: (sar: SARReport) => void;
  onReject: (sar: SARReport, reason: string) => void;
  onRequestChanges: (sar: SARReport) => void;
  onMarkFiled: (sar: SARReport) => void;
}

function SARDetail({ sar, onClose, onApprove, onReject, onRequestChanges, onMarkFiled }: SARDetailProps) {
  const [activeTab, setActiveTab] = useState<"narrative" | "regulatory" | "checklist" | "timeline">("narrative");
  const [checklist, setChecklist] = useState(APPROVAL_CHECKLIST.map(() => false));
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [showRejectPicker, setShowRejectPicker] = useState(false);

  const breaches = useMemo(() => getBreachesForSar(sar), [sar]);
  const allChecked = checklist.every(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              sar.status === "review" ? "bg-amber-500/10" :
              sar.status === "approved" ? "bg-primary/10" : "bg-muted"
            )}>
              <Gavel className={cn(
                "w-5 h-5",
                sar.status === "review" ? "text-amber-500" :
                sar.status === "approved" ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{sar.id}</h2>
                <Badge variant={priorityVariant(sar.priority)} className="text-[9px]">{sar.priority}</Badge>
                <Badge variant="outline" className="text-[9px] capitalize">{sar.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {sar.customerName} · Assigned to {sar.assignedTo} · Confidence {sar.confidenceScore}%
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-4 pt-3 shrink-0">
          <div className="flex gap-1 flex-wrap">
            {[
              { id: "narrative" as const, label: "Narrative", icon: FileText },
              { id: "regulatory" as const, label: `Regulatory (${breaches.length})`, icon: Shield },
              { id: "checklist" as const, label: `Checklist (${checklist.filter(Boolean).length}/${APPROVAL_CHECKLIST.length})`, icon: CheckSquare },
              { id: "timeline" as const, label: "Timeline", icon: Clock },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors
                  ${activeTab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">

            {/* ── Narrative ──────────────────────────────────────────────── */}
            {activeTab === "narrative" && (
              <>
                {/* Risk breakdown */}
                {sar.riskBreakdown && sar.riskBreakdown.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {sar.riskBreakdown.map((rb) => (
                      <div key={rb.label} className="p-2 rounded-lg bg-muted/50 text-center">
                        <p className="text-lg font-bold text-risk-high tabular-nums">{rb.value}%</p>
                        <p className="text-[10px] text-muted-foreground">{rb.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trigger rules */}
                {sar.triggerRules && sar.triggerRules.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Triggered Rules
                    </p>
                    {sar.triggerRules.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-risk-medium shrink-0" />
                          <span className="text-xs font-medium">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-muted-foreground">{r.id}</span>
                          <Badge variant="outline" className="text-[9px]">{r.confidence}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Narrative text */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    SAR Narrative
                  </p>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <pre className="text-xs font-sans whitespace-pre-wrap leading-relaxed text-foreground">
                      {sar.narrative}
                    </pre>
                  </div>
                </div>

                {/* Evidence anchors */}
                {sar.evidenceAnchors && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Evidence Anchors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sar.evidenceAnchors.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Regulatory Breaches ────────────────────────────────────── */}
            {activeTab === "regulatory" && (
              <>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    The following regulatory obligations are triggered by the risk types identified. Compliance officer must confirm each citation.
                  </p>
                </div>
                {breaches.map((b, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Shield className={cn(
                          "w-4 h-4 shrink-0",
                          b.severity === "critical" ? "text-destructive" : "text-risk-medium"
                        )} />
                        <span className="text-sm font-semibold">{b.rule}</span>
                      </div>
                      <Badge
                        variant={b.severity === "critical" ? "destructive" : "warning"}
                        className="text-[9px] capitalize shrink-0"
                      >
                        {b.severity}
                      </Badge>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground pl-6">{b.ref}</p>
                    <p className="text-xs text-muted-foreground pl-6 leading-relaxed">{b.description}</p>
                  </div>
                ))}
              </>
            )}

            {/* ── Approval Checklist ────────────────────────────────────── */}
            {activeTab === "checklist" && (
              <>
                <p className="text-xs text-muted-foreground">
                  Complete all attestation items before approving. Your confirmation will be recorded in the audit trail with timestamp and identity.
                </p>
                {APPROVAL_CHECKLIST.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setChecklist((prev) => prev.map((v, j) => j === i ? !v : v))}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                      checklist[i] ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50 hover:bg-muted border border-transparent"
                    )}
                  >
                    {checklist[i] ? (
                      <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <span className={cn("text-sm", checklist[i] ? "text-foreground" : "text-muted-foreground")}>
                      {item}
                    </span>
                  </button>
                ))}

                {!allChecked && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted text-muted-foreground">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-xs">
                      {APPROVAL_CHECKLIST.length - checklist.filter(Boolean).length} item(s) must be confirmed to enable approval
                    </p>
                  </div>
                )}

                {allChecked && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckSquare className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                      All items confirmed. You may now approve this SAR for filing.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── Timeline ────────────────────────────────────────────────── */}
            {activeTab === "timeline" && (
              <div className="space-y-1">
                {(sar.timelineEvents ?? []).map((ev, i) => (
                  <div key={i} className="flex gap-3 py-2">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      {i < (sar.timelineEvents?.length ?? 1) - 1 && (
                        <div className="w-0.5 bg-border flex-1 mt-1" />
                      )}
                    </div>
                    <div className="pb-2">
                      <p className="text-xs text-foreground">{ev.event}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{ev.date}</p>
                    </div>
                  </div>
                ))}
                {(!sar.timelineEvents || sar.timelineEvents.length === 0) && (
                  <p className="text-xs text-muted-foreground py-4 text-center">No timeline events recorded.</p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        {(sar.status === "review" || sar.status === "approved") && (
          <div className="border-t border-border p-4 shrink-0">
            {showRejectPicker ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Select reason for returning SAR:</p>
                {REJECT_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRejectReason(r)}
                    className={cn(
                      "w-full text-left text-xs p-2.5 rounded-lg transition-colors",
                      rejectReason === r ? "bg-destructive/10 border border-destructive/30" : "bg-muted/50 hover:bg-muted border border-transparent"
                    )}
                  >
                    {r}
                  </button>
                ))}
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowRejectPicker(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!rejectReason}
                    onClick={() => { if (rejectReason) { onReject(sar, rejectReason); onClose(); } }}
                  >
                    Return for Revision
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setShowRejectPicker(true)}
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => { onRequestChanges(sar); onClose(); }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Request Changes
                  </Button>
                </div>
                <div className="flex gap-2">
                  {sar.status === "review" && (
                    <Button
                      size="sm"
                      className="text-xs gap-1"
                      disabled={!allChecked}
                      onClick={() => { onApprove(sar); onClose(); }}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      {allChecked ? "Approve SAR" : `Checklist (${checklist.filter(Boolean).length}/${APPROVAL_CHECKLIST.length})`}
                    </Button>
                  )}
                  {sar.status === "approved" && (
                    <Button
                      size="sm"
                      className="text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => { onMarkFiled(sar); onClose(); }}
                    >
                      <Shield className="w-3 h-3" />
                      Mark as Filed
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReviewQueue() {
  const { sarReports, approveSAR, rejectSAR, updateSARStatus } = useSARData();
  const { profile } = useProfile();
  const [selectedSAR, setSelectedSAR] = useState<SARReport | null>(null);

  const columns = useMemo(
    () => COLUMNS.map((col) => ({
      ...col,
      items: sarReports.filter((s) => s.status === col.status),
    })),
    [sarReports]
  );

  const totalReview = sarReports.filter((s) => s.status === "review").length;
  const totalFiled = sarReports.filter((s) => s.status === "filed").length;
  const urgentCount = sarReports.filter((s) => s.status === "review" && s.daysRemaining <= 2).length;

  return (
    <div className="space-y-4 animate-slide-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SAR Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Human approval workflow · Narrative review · Regulatory breach mapping · Audit trail
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">{urgentCount} urgent</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{totalReview} in review</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">{totalFiled} filed</span>
          </div>
        </div>
      </div>

      {/* Quick-action banner for urgent items */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {urgentCount} SAR{urgentCount > 1 ? "s" : ""} expiring within 48 hours — immediate review required
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto text-xs shrink-0"
            onClick={() => {
              const urgent = sarReports.find((s) => s.status === "review" && s.daysRemaining <= 2);
              if (urgent) setSelectedSAR(urgent);
            }}
          >
            Review Now
          </Button>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.status} className="space-y-3">
            {/* Column header */}
            <div className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-lg border",
              col.color, col.borderColor
            )}>
              <div className="flex items-center gap-2">
                {statusIcon(col.status)}
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">{col.items.length}</Badge>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {col.items.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[10px] text-muted-foreground">No items</p>
                </div>
              )}
              {col.items.map((sar) => (
                <Card
                  key={sar.id}
                  className={cn(
                    "shadow-card hover:shadow-elevated transition-all cursor-pointer",
                    sar.status === "review" && sar.daysRemaining <= 2 && "border-destructive/40 bg-destructive/5"
                  )}
                  onClick={() => setSelectedSAR(sar)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{sar.id}</span>
                      <Badge variant={priorityVariant(sar.priority)} className="text-[9px]">
                        {sar.priority}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">{sar.customerName}</p>

                    {/* Risk breakdown mini-bars */}
                    {sar.riskBreakdown && sar.riskBreakdown.length > 0 && (
                      <div className="space-y-0.5">
                        {sar.riskBreakdown.slice(0, 2).map((rb) => (
                          <div key={rb.label} className="flex items-center gap-1.5">
                            <span className="text-[9px] text-muted-foreground w-16 truncate shrink-0">{rb.label}</span>
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-risk-high rounded-full"
                                style={{ width: `${rb.value}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground shrink-0">{rb.value}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <User className="w-3 h-3" /> {sar.assignedTo}
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {sar.confidenceScore}% confidence
                      </span>
                      {sar.daysRemaining > 0 && (
                        <span className={cn(
                          "flex items-center gap-1 font-medium",
                          sar.daysRemaining <= 2 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          <Clock className="w-3 h-3" /> {sar.daysRemaining}d left
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span className="font-mono">{sar.modelUsed}</span>
                      {sar.status === "review" && (
                        <span className="flex items-center gap-0.5 text-primary font-medium">
                          Review <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Process explanation */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Approval Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {[
              { label: "1. Network Graph Flags Suspicious Entity", color: "bg-muted-foreground" },
              { label: "2. AI Generates Narrative & Regulatory Map", color: "bg-amber-500" },
              { label: "3. Officer Reviews & Completes Checklist", color: "bg-primary" },
              { label: "4. SAR Approved → Filed with FinCEN", color: "bg-green-500" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <ArrowIcon />}
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", step.color)} />
                  <span>{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SAR Detail Modal */}
      {selectedSAR && (
        <SARDetail
          sar={selectedSAR}
          onClose={() => setSelectedSAR(null)}
          onApprove={(sar) => approveSAR(sar.id, profile.name || "Compliance Officer")}
          onReject={(sar, reason) => rejectSAR(sar.id, reason)}
          onRequestChanges={(sar) => rejectSAR(sar.id, "Changes requested by reviewer")}
          onMarkFiled={(sar) => updateSARStatus(sar.id, "filed")}
        />
      )}
    </div>
  );
}

function ArrowIcon() {
  return <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />;
}
