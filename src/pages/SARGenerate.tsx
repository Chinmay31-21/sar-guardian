import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap, FileText, AlertTriangle, Shield, Sparkles, Eye,
  ScrollText, Brain, Activity, CheckCircle2, Search, ChevronRight,
  AlertCircle, CheckSquare, TrendingUp, Radio, Building2, Layers,
  Download, Printer, Loader2,
} from "lucide-react";
import {
  useSARData,
  type InvestigationPipelineReport,
} from "@/context/SARDataContext";
import { useCSVData } from "@/hooks/useCSVData";
import {
  generateSARReport,
  type FullSARReport,
  type CsvTransaction,
  type NetworkEdge,
} from "@/lib/csvLoader";
import { createSarReportPdfBlob, loadSarPdfLogoDataUrl } from "@/lib/pdfExport";
import { getSHAPFeaturesForText, type Transaction } from "@/data/synthetic";
import SHAPPopup from "@/components/SHAPPopup";
import { cn } from "@/lib/utils";

type GenerationEngine = "trained_model_api" | "rule_engine_fallback";

interface ModelReportResponse {
  report?: Partial<FullSARReport>;
  narrative?: string;
  conclusion?: string;
  modelVersion?: string;
  aiConfidence?: number;
}

const MODEL_ENDPOINT = ((import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  .VITE_SAR_MODEL_ENDPOINT ?? "").trim();

const HIGH_RISK_COUNTRIES = new Set([
  "BVI",
  "CY",
  "PA",
  "BS",
  "KY",
  "RU",
  "LU",
  "MT",
  "AE",
  "HK",
]);

const FLAG_TO_PATTERN: Record<string, string> = {
  structuring: "structuring",
  smurfing: "smurfing",
  round_amounts: "round_amount",
  cross_border: "cross_border",
  high_value: "layering",
  crypto: "crypto",
  trade_based: "trade_based",
};

function toIsoTimestamp(date: string): string {
  if (!date) return new Date().toISOString();
  if (date.includes("T")) {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function toCsvTransaction(txn: Transaction): CsvTransaction {
  const timestamp = toIsoTimestamp(txn.date);
  const parsed = new Date(timestamp);
  const sender = txn.senderAccount || txn.customerId;
  const receiver = txn.receiverAccount || `${txn.customerId}-COUNTERPARTY`;
  const pattern = txn.flagType ? FLAG_TO_PATTERN[txn.flagType] ?? "normal" : "normal";
  const isSuspicious =
    txn.status === "flagged" ||
    txn.status === "under_review" ||
    txn.riskScore >= 70 ||
    pattern !== "normal";

  return {
    sender_account: sender,
    receiver_account: receiver,
    amount: txn.amount,
    type: txn.type || "Wire Transfer",
    merchant_category: "Unknown",
    device: "Platform",
    country: txn.country || "Unknown",
    is_suspicious: isSuspicious,
    pattern,
    transaction_id: txn.id,
    timestamp,
    hour: parsed.getUTCHours(),
    day: parsed.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    is_high_risk_country: HIGH_RISK_COUNTRIES.has(txn.country),
    log_amount: Math.log10(Math.max(txn.amount, 1)),
  };
}

function toNetworkEdge(txn: Transaction): NetworkEdge {
  return {
    entity_a: txn.customerId,
    entity_b: txn.receiverAccount || `${txn.customerId}-COUNTERPARTY`,
    relationship: txn.flagType ? `${txn.flagType}_flow` : "frequent_transactions",
    strength: Math.max(0.2, Math.min(1, txn.riskScore / 100)),
  };
}

function dedupeCsvTransactions(rows: CsvTransaction[]): CsvTransaction[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.transaction_id)) return false;
    seen.add(row.transaction_id);
    return true;
  });
}

function pickNonEmptyArray<T>(incoming: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(incoming) && incoming.length > 0 ? incoming : fallback;
}

function mergeModelReport(base: FullSARReport, payload: ModelReportResponse): FullSARReport {
  const fromModel = payload.report ?? {};

  const merged: FullSARReport = {
    ...base,
    ...fromModel,
    activityDescription:
      payload.narrative ||
      fromModel.activityDescription ||
      base.activityDescription,
    conclusion:
      payload.conclusion ||
      fromModel.conclusion ||
      base.conclusion,
    riskIndicators: pickNonEmptyArray(fromModel.riskIndicators, base.riskIndicators),
    evidenceItems: pickNonEmptyArray(fromModel.evidenceItems, base.evidenceItems),
    regulatoryBreaches: pickNonEmptyArray(fromModel.regulatoryBreaches, base.regulatoryBreaches),
    transactionRows: pickNonEmptyArray(fromModel.transactionRows, base.transactionRows),
    patternsObserved: pickNonEmptyArray(fromModel.patternsObserved, base.patternsObserved),
    riskTypes: pickNonEmptyArray(fromModel.riskTypes, base.riskTypes),
    countriesInvolved: pickNonEmptyArray(fromModel.countriesInvolved, base.countriesInvolved),
    connectedEntities: pickNonEmptyArray(fromModel.connectedEntities, base.connectedEntities),
    relationshipTypes: pickNonEmptyArray(fromModel.relationshipTypes, base.relationshipTypes),
  };

  if (typeof payload.aiConfidence === "number") {
    merged.aiConfidence = Math.max(1, Math.min(99, Math.round(payload.aiConfidence)));
  }
  if (typeof payload.modelVersion === "string" && payload.modelVersion.trim()) {
    merged.modelVersion = payload.modelVersion.trim();
  }

  return merged;
}

async function generateReportWithEngine(
  entity: string,
  csvData: NonNullable<ReturnType<typeof useCSVData>["data"]>,
  liveTransactions: Transaction[]
): Promise<{ report: FullSARReport; engine: GenerationEngine; engineNote: string }> {
  const liveCsvTransactions = liveTransactions.map(toCsvTransaction);
  const mergedTransactions = dedupeCsvTransactions([
    ...liveCsvTransactions,
    ...csvData.transactions,
  ]);
  const mergedEdges = [
    ...liveTransactions.map(toNetworkEdge),
    ...csvData.networkEdges,
  ];

  const baseReport = generateSARReport(
    entity,
    csvData.externalRisk,
    mergedEdges,
    mergedTransactions,
    csvData.historicalSARs
  );

  if (!MODEL_ENDPOINT) {
    return {
      report: {
        ...baseReport,
        modelVersion: `${baseReport.modelVersion} / Local Rules Engine`,
      },
      engine: "rule_engine_fallback",
      engineNote: "No trained model endpoint configured. Set VITE_SAR_MODEL_ENDPOINT to enable model inference.",
    };
  }

  const entityTransactions = mergedTransactions
    .filter((t) => t.sender_account === entity || t.receiver_account === entity)
    .slice(0, 500);
  const entityEdges = mergedEdges
    .filter((e) => e.entity_a === entity || e.entity_b === entity)
    .slice(0, 300);
  const entityRisk = csvData.externalRisk.filter((r) => r.entity === entity).slice(0, 100);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(MODEL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        entityId: entity,
        baselineReport: baseReport,
        context: {
          transactions: entityTransactions,
          networkEdges: entityEdges,
          externalRisk: entityRisk,
          historicalSARs: csvData.historicalSARs.slice(0, 75),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Model endpoint returned ${response.status}`);
    }

    const payload = (await response.json()) as ModelReportResponse;
    const mergedReport = mergeModelReport(baseReport, payload);

    if (!mergedReport.modelVersion || mergedReport.modelVersion === baseReport.modelVersion) {
      mergedReport.modelVersion = `${baseReport.modelVersion} + Trained Model API`;
    }

    return {
      report: mergedReport,
      engine: "trained_model_api",
      engineNote: `Trained model response received from ${MODEL_ENDPOINT}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown model endpoint error";
    return {
      report: {
        ...baseReport,
        modelVersion: `${baseReport.modelVersion} / Local Rules Engine`,
      },
      engine: "rule_engine_fallback",
      engineNote: `Model endpoint unavailable (${message}). Fallback generator used.`,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

// ─── Audit Messages ────────────────────────────────────────────────────────────

function buildAuditMessages(
  entity: string,
  report: FullSARReport,
  engine: GenerationEngine,
  engineNote: string
) {
  const engineMessage =
    engine === "trained_model_api"
      ? `Trained model endpoint active: ${report.modelVersion}`
      : `Local rules fallback active: ${report.modelVersion}`;

  return [
    { type: "ai_decision" as const, message: engineMessage },
    { type: "ai_decision" as const, message: engineNote },
    { type: "ai_decision" as const, message: `Entity profile retrieved: ${entity} — Risk ${report.riskCategory} (${report.riskScore}/100)` },
    { type: "transaction" as const, message: `${report.txnCount} transaction records retrieved — ${report.suspiciousTxnCount} flagged` },
    { type: "ai_decision" as const, message: `Risk typologies identified: ${report.riskTypes.join(", ") || "General suspicious activity"}` },
    { type: "transaction" as const, message: `Aggregate suspicious amount: $${report.totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} across ${report.countriesInvolved.length} jurisdiction(s)` },
    { type: "ai_decision" as const, message: `Network analysis: ${report.networkConnections} connected entities via ${report.relationshipTypes.join(", ") || "transaction links"}` },
    { type: "ai_decision" as const, message: `${report.regulatoryBreaches.length} regulatory obligations mapped: ${report.regulatoryBreaches.filter(b => b.severity === "critical").length} critical` },
    { type: "ai_decision" as const, message: `Regulatory Impact Score computed: ${report.regulatoryImpactScore}%` },
    { type: "transaction" as const, message: `${report.evidenceItems.length} evidence items catalogued from monitoring systems` },
    { type: "ai_decision" as const, message: `SAR narrative generated — AI confidence: ${report.aiConfidence}%` },
    { type: "ai_decision" as const, message: `SAR ${report.caseId} ready for human review and approval` },
  ];
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-destructive",
  high: "text-risk-medium",
  medium: "text-amber-500",
  low: "text-muted-foreground",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-destructive/10 border-destructive/20",
  high: "bg-risk-medium/10 border-risk-medium/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  low: "bg-muted border-border",
};

// ─── Section component ────────────────────────────────────────────────────────

function ReportSection({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">{num}</span>
        </div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h3>
      </div>
      <div className="pl-8 space-y-1.5">{children}</div>
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-muted-foreground w-36 shrink-0">{label}:</span>
      <span className={cn("text-foreground font-medium flex-1", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function buildPipelineReport(entity: string, report: FullSARReport): InvestigationPipelineReport {
  const criticalRules = report.regulatoryBreaches.filter((b) => b.severity === "critical").length;
  const highRules = report.regulatoryBreaches.filter((b) => b.severity === "high").length;
  const topPattern = report.patternsObserved[0]?.replace(/_/g, " ") ?? "anomalous behaviour";

  return {
    entityId: entity,
    generatedAt: new Date().toISOString(),
    suspiciousTxnCount: report.suspiciousTxnCount,
    totalSuspiciousAmount: report.totalAmount,
    modules: [
      {
        layer: 0,
        title: "External Context Agent",
        detail: `External intelligence fused from ${report.riskTypes.length || 1} risk sources for ${entity}.`,
        outcome: "Global affairs context attached for authenticity checks.",
        evidence: report.evidenceItems.slice(0, 2),
      },
      {
        layer: 1,
        title: "Data Intake + Preprocessing",
        detail: `${report.txnCount} transactions normalized; ${report.suspiciousTxnCount} suspicious rows retained for analysis.`,
        outcome: "CSV evidence cleaned, transformed, and prepared for scoring.",
        evidence: [
          `${report.txnCount} rows parsed`,
          `${report.countriesInvolved.length} jurisdictions profiled`,
        ],
      },
      {
        layer: 2,
        title: "Behaviour Modelling (XGBOOST)",
        detail: `Primary typology match: ${topPattern}. Risk score baseline: ${report.riskScore}/100.`,
        outcome: "Behavioural model generated risk signals for suspicious activity.",
        evidence: report.patternsObserved.slice(0, 3),
      },
      {
        layer: 3,
        title: "Anomaly Detection (XGBOOST)",
        detail: `${report.suspiciousTxnCount} anomalies flagged across ${report.networkConnections} linked entities.`,
        outcome: "High-confidence anomalies escalated for investigation.",
        evidence: [
          `${report.networkConnections} network connections`,
          `${report.aiConfidence}% anomaly confidence`,
        ],
      },
      {
        layer: 4,
        title: "Risk Attribution",
        detail: `${criticalRules} critical and ${highRules} high regulatory obligations attributed.`,
        outcome: "Risk signals mapped to regulatory exposure and rule triggers.",
        evidence: report.regulatoryBreaches.slice(0, 2).map((b) => `${b.ref} (${b.severity})`),
      },
      {
        layer: 5,
        title: "Context Assembly (RAG)",
        detail: `Evidence pack assembled with ${report.evidenceItems.length} anchors and historical precedent.`,
        outcome: "Context bundle prepared to reduce hallucinations in narrative synthesis.",
        evidence: [
          `${report.evidenceItems.length} evidence anchors`,
          report.historicalPrecedent || "No historical precedent available",
        ],
      },
      {
        layer: 6,
        title: "LLM Reasoning (LLAMA)",
        detail: `Reasoning generated with ${report.modelVersion}; confidence ${report.aiConfidence}%.`,
        outcome: "Explainable rationale created for each trigger and breach.",
        evidence: [
          `${report.regulatoryBreaches.length} mapped obligations`,
          `${report.riskIndicators.length} risk indicators`,
        ],
      },
      {
        layer: 7,
        title: "SAR Generation",
        detail: `Draft SAR ${report.caseId} generated with 9-section structured report.`,
        outcome: "Decision-ready SAR narrative produced from verified data.",
        evidence: [
          `${report.caseId}`,
          `${report.transactionRows.length} transaction evidence rows`,
        ],
      },
      {
        layer: 8,
        title: "Human in the Loop (HIL)",
        detail: "Compliance workflow enforces checklist review before filing approval.",
        outcome: "Human oversight step ready for analyst validation.",
        evidence: [
          "Checklist + reviewer attestation",
          "Manual sign-off required before filing",
        ],
      },
      {
        layer: 9,
        title: "Governance & Audit",
        detail: "Pipeline events and rationale logged for immutable audit trail.",
        outcome: "Governance-grade traceability preserved for regulators.",
        evidence: [
          `${report.dateGenerated} generation timestamp`,
          `${report.modelVersion} model attribution`,
        ],
      },
    ],
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SARGenerate() {
  const [searchParams] = useSearchParams();
  const {
    transactions,
    addSAR,
    beginInvestigation,
    completeInvestigationSAR,
    pipelinesByEntity,
    activeInvestigationEntity,
  } = useSARData();
  const { data: csvData } = useCSVData();

  const preselect = searchParams.get("entity");

  const [searchQ, setSearchQ] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(preselect);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<FullSARReport | null>(null);
  const [pipelineReport, setPipelineReport] = useState<InvestigationPipelineReport | null>(null);
  const [activeTab, setActiveTab] = useState("report");
  const [generationEngine, setGenerationEngine] = useState<GenerationEngine>("rule_engine_fallback");
  const [engineNote, setEngineNote] = useState(
    MODEL_ENDPOINT
      ? `Endpoint configured: ${MODEL_ENDPOINT}`
      : "No VITE_SAR_MODEL_ENDPOINT configured. Local rules engine is active."
  );
  const [auditLog, setAuditLog] = useState<{ type: "ai_decision" | "transaction"; message: string; id: number }[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; filename: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfLogoDataUrl, setPdfLogoDataUrl] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<{ text: string; top: number; left: number } | null>(null);
  const auditEndRef = useRef<HTMLDivElement>(null);
  const pdfPreviewFrameRef = useRef<HTMLIFrameElement>(null);
  const autoGenerateStartedRef = useRef<string | null>(null);

  // Build entity list from flagged context transactions
  const entityClusters = useMemo(() => {
    const grouped: Record<string, { count: number; totalAmount: number; maxRisk: number }> = {};
    for (const t of transactions) {
      if (t.status !== "flagged" && t.status !== "under_review") continue;
      if (!grouped[t.customerId]) grouped[t.customerId] = { count: 0, totalAmount: 0, maxRisk: 0 };
      grouped[t.customerId].count++;
      grouped[t.customerId].totalAmount += t.amount;
      grouped[t.customerId].maxRisk = Math.max(grouped[t.customerId].maxRisk, t.riskScore);
    }
    return Object.entries(grouped)
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.maxRisk - a.maxRisk);
  }, [transactions]);

  const filteredEntities = useMemo(() => {
    if (!searchQ) return entityClusters;
    return entityClusters.filter((e) => e.id.toLowerCase().includes(searchQ.toLowerCase()));
  }, [entityClusters, searchQ]);

  useEffect(() => {
    auditEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [auditLog]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const preferredLogo = await loadSarPdfLogoDataUrl("/barclays.png");
      const fallbackLogo = preferredLogo ?? await loadSarPdfLogoDataUrl("/barclays-logo.png");

      if (!cancelled) {
        setPdfLogoDataUrl(fallbackLogo);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreview?.url) {
        URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview?.url]);

  useEffect(() => {
    if (!selectedEntity || report || generating) return;
    const existing = pipelinesByEntity[selectedEntity];
    if (existing) {
      setPipelineReport(existing);
    }
  }, [selectedEntity, pipelinesByEntity, report, generating]);

  const handleGenerate = useCallback(async (entityId?: string) => {
    const entity = entityId ?? selectedEntity;
    if (!entity || !csvData) return;

    beginInvestigation(entity, "sar_generate");

    setGenerating(true);
    setProgress(0);
    setReport(null);
    setPipelineReport(null);
    setAuditLog([]);
    setSubmittedId(null);
    setPdfPreview(null);
    setPreviewLoading(false);
    setActiveTab("report");
    setEngineNote(
      MODEL_ENDPOINT
        ? `Attempting trained model endpoint: ${MODEL_ENDPOINT}`
        : "No trained model endpoint configured. Using local rules engine."
    );

    const warmupInterval = setInterval(() => {
      setProgress((p) => Math.min(72, p + Math.random() * 6 + 2));
    }, 200);

    try {
      const {
        report: generatedReport,
        engine,
        engineNote: nextEngineNote,
      } = await generateReportWithEngine(entity, csvData, transactions);
      clearInterval(warmupInterval);

      setGenerationEngine(engine);
      setEngineNote(nextEngineNote);

      const generatedPipeline = buildPipelineReport(entity, generatedReport);

      const auditMessages = buildAuditMessages(entity, generatedReport, engine, nextEngineNote);
      let idx = 0;

      const auditInterval = setInterval(() => {
        if (idx < auditMessages.length) {
          setAuditLog((prev) => [...prev, { ...auditMessages[idx], id: idx }]);
          idx++;
        }
      }, 230);

      const progInterval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(progInterval);
            clearInterval(auditInterval);
            setGenerating(false);
            setReport(generatedReport);
            setPipelineReport(generatedPipeline);
            return 100;
          }
          return Math.min(100, p + Math.random() * 12 + 4);
        });
      }, 220);
    } catch (error) {
      clearInterval(warmupInterval);
      setGenerating(false);
      setProgress(0);
      setGenerationEngine("rule_engine_fallback");
      setEngineNote(
        `Generation failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
      setAuditLog([
        {
          id: 0,
          type: "ai_decision",
          message: `SAR generation failed for ${entity}. Please retry.`,
        },
      ]);
    }
  }, [beginInvestigation, csvData, selectedEntity, transactions]);

  // Auto-generate when preselected via URL
  useEffect(() => {
    if (!preselect || !csvData || report || generating || autoGenerateStartedRef.current === preselect) {
      return;
    }

    autoGenerateStartedRef.current = preselect;
    setSelectedEntity(preselect);

    const timeoutId = window.setTimeout(() => {
      void handleGenerate(preselect);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [preselect, csvData, report, generating, handleGenerate]);

  function handleSubmitToQueue() {
    if (!report) return;
    const id = addSAR({
      customerName: report.entityId,
      customerId: report.entityId,
      narrative: `SAR Report: ${report.caseId}\n\nRegulatory Impact Score: ${report.regulatoryImpactScore}%\n\n${report.activityDescription}\n\nConclusion: ${report.conclusion}`,
      riskBreakdown: report.regulatoryBreaches.slice(0, 3).map((b) => ({
        label: b.rule,
        value: b.confidence,
      })),
      triggerRules: report.regulatoryBreaches.slice(0, 4).map((b) => ({
        id: b.ref,
        name: b.rule,
        confidence: b.confidence,
      })),
      evidenceAnchors: report.evidenceItems.slice(0, 4),
      timelineEvents: [
        { date: new Date().toISOString().split("T")[0], event: `SAR ${report.caseId} generated by SAR Guardian AI` },
        { date: new Date().toISOString().split("T")[0], event: `Regulatory Impact Score: ${report.regulatoryImpactScore}% — ${report.regulatoryBreaches.filter(b => b.severity === "critical").length} critical obligations` },
      ],
    });
    completeInvestigationSAR(report.entityId, id, pipelineReport || undefined);
    setSubmittedId(id);
  }

  function handleClosePdfPreview() {
    setPdfPreview(null);
    setPreviewLoading(false);
  }

  function handlePrintPdfPreview() {
    if (!pdfPreview) return;

    const previewWindow = pdfPreviewFrameRef.current?.contentWindow;
    if (previewWindow) {
      previewWindow.focus();
      previewWindow.print();
      return;
    }

    window.open(pdfPreview.url, "_blank");
  }

  function handlePreviewPdf() {
    if (!report || exportingPdf) return;

    setExportingPdf(true);
    try {
      const { blob, filename } = createSarReportPdfBlob(report, {
        engine: generationEngine,
        engineNote,
        logoDataUrl: pdfLogoDataUrl,
      });

      setPreviewLoading(true);
      setPdfPreview({
        url: URL.createObjectURL(blob),
        filename,
      });
    } catch (error) {
      setAuditLog((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "ai_decision",
          message: `PDF preview failed: ${error instanceof Error ? error.message : "unknown error"}`,
        },
      ]);
    } finally {
      setExportingPdf(false);
    }
  }

  const riskCategoryColor = (cat: string) =>
    cat === "Critical" ? "text-destructive" :
    cat === "High" ? "text-risk-medium" :
    cat === "Medium" ? "text-amber-500" : "text-green-500";

  return (
    <div className="space-y-4 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SAR Report Generator</h1>
        <p className="text-sm text-muted-foreground">
          Barclays Financial Intelligence Unit · 9-section regulatory filing · AI-powered with human approval
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Left: Entity Selector ────────────────────────────────────────────── */}
        <div className="space-y-3">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Flagged Entities ({entityClusters.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search entity ID…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 pr-1">
                  {filteredEntities.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No flagged entities yet.<br />Live updates will appear here.
                    </p>
                  )}
                  {filteredEntities.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEntity(e.id)}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg transition-colors border",
                        selectedEntity === e.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/40 border-transparent hover:bg-muted text-foreground",
                        activeInvestigationEntity === e.id && "ring-1 ring-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-mono truncate">{e.id}</span>
                        <span className={cn(
                          "text-[9px] font-bold shrink-0",
                          e.maxRisk >= 80 ? "text-destructive" :
                          e.maxRisk >= 60 ? "text-risk-medium" : "text-amber-500"
                        )}>
                          {e.maxRisk}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground">{e.count} txns</span>
                        <span className="text-[9px] text-muted-foreground">${(e.totalAmount / 1000).toFixed(0)}K</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <Button
                onClick={() => handleGenerate()}
                disabled={!selectedEntity || generating || !csvData}
                className="w-full gap-2 mt-1"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? "Generating…" : !csvData ? "Loading data…" : "Generate SAR"}
              </Button>

              {generating && (
                <div className="space-y-1.5 pt-1">
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground text-center">
                    SAR Gen AI · Processing…
                  </p>
                </div>
              )}

              <div
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  generationEngine === "trained_model_api"
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-amber-500/10 border-amber-500/20"
                )}
              >
                <p
                  className={cn(
                    "text-[10px] font-semibold",
                    generationEngine === "trained_model_api"
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-700 dark:text-amber-400"
                  )}
                >
                  {generationEngine === "trained_model_api"
                    ? "Trained model endpoint in use"
                    : "Fallback generator in use"}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">{engineNote}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: SAR Document ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          {!report && !generating && (
            <Card className="shadow-card h-full flex items-center justify-center min-h-[500px]">
              <div className="text-center space-y-4 px-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Select an entity to generate a SAR</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The AI will generate a full 9-section Barclays FIU-standard report with regulatory breach mapping and impact score.
                  </p>
                </div>
                {entityClusters.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No flagged entities yet. Live monitoring will populate the list as suspicious transactions arrive.
                  </p>
                )}
              </div>
            </Card>
          )}

          {generating && (
            <Card className="shadow-card h-full flex items-center justify-center min-h-[500px]">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">Generating SAR Report</p>
                  <p className="text-xs text-muted-foreground">Barclays FIU · {selectedEntity}</p>
                </div>
                <div className="w-64 space-y-1.5">
                  <Progress value={Math.min(progress, 100)} className="h-2.5" />
                  <p className="text-[10px] text-muted-foreground">{Math.round(progress)}% complete</p>
                </div>
              </div>
            </Card>
          )}

          {report && !generating && (
            <Card className="shadow-card">
              {/* Report header */}
              <CardHeader className="pb-0 border-b border-border">
                <div className="space-y-3">
                  {/* Letterhead */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground uppercase tracking-widest">
                            {report.reportingInstitution}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{report.reportingUnit}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {submittedId ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Submitted: {submittedId}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={handlePreviewPdf}
                            disabled={exportingPdf}
                          >
                            <Eye className="w-3.5 h-3.5" /> {exportingPdf ? "Preparing..." : "Preview PDF"}
                          </Button>
                          <Button size="sm" className="gap-1.5 text-xs" onClick={handleSubmitToQueue}>
                            <Shield className="w-3.5 h-3.5" /> Submit for Review
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Case info bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 bg-muted/30 rounded-lg px-3">
                    {[
                      { label: "Case ID", value: report.caseId, mono: true },
                      { label: "Date Generated", value: report.dateGenerated },
                      { label: "AI Confidence", value: `${report.aiConfidence}%` },
                      { label: "Regulatory Impact", value: `${report.regulatoryImpactScore}%` },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                        <p className={cn("text-sm font-bold mt-0.5", f.mono && "font-mono")}>{f.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2 pb-1">
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> SAR Filing Required
                    </Badge>
                    <Badge
                      className={cn("text-[10px] gap-1 border", SEVERITY_BG[report.riskCategory.toLowerCase()])}
                      variant="outline"
                    >
                      <span className={riskCategoryColor(report.riskCategory)}>
                        {report.riskCategory} Risk — {report.riskScore}/100
                      </span>
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                      {report.regulatoryBreaches.length} regulatory obligations
                    </Badge>
                    <Badge
                      variant={generationEngine === "trained_model_api" ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      Engine: {generationEngine === "trained_model_api" ? "Trained Model API" : "Rules Fallback"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Model: {report.modelVersion.split("/")[0]}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground pb-1">{engineNote}</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
                  <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="report" className="text-xs gap-1">
                      <FileText className="w-3 h-3" /> Full Report
                    </TabsTrigger>
                    <TabsTrigger value="regulatory" className="text-xs gap-1">
                      <Shield className="w-3 h-3" /> Regulatory Mapping ({report.regulatoryBreaches.length})
                    </TabsTrigger>
                    <TabsTrigger value="impact" className="text-xs gap-1">
                      <TrendingUp className="w-3 h-3" /> Impact Score
                    </TabsTrigger>
                    <TabsTrigger value="pipeline" className="text-xs gap-1">
                      <Layers className="w-3 h-3" /> Pipeline Modules
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="text-xs gap-1">
                      <ScrollText className="w-3 h-3" /> Audit Trail
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>

                  {/* ── Full Report ─────────────────────────────────────────── */}
                  <TabsContent value="report">
                    <ScrollArea className="h-[580px] pr-3">
                      <div className="space-y-5 text-sm">

                        {/* Header divider */}
                        <div className="text-center py-2 border-y border-dashed border-border">
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
                            Suspicious Activity Report (SAR)
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            CONFIDENTIAL — FOR REGULATORY SUBMISSION ONLY
                          </p>
                        </div>

                        <ReportSection num={1} title="Subject Information">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <FieldRow label="Entity / Account" value={report.entityId} mono />
                            <FieldRow label="Case ID" value={report.caseId} mono />
                            <FieldRow
                              label="Risk Category"
                              value={
                                <span className={riskCategoryColor(report.riskCategory)}>
                                  {report.riskCategory} ({report.riskScore}/100)
                                </span>
                              }
                            />
                            <FieldRow label="KYC Status" value={report.kycStatus} />
                            <FieldRow label="Primary Country" value={report.primaryCountry} />
                            <FieldRow label="Reporting Institution" value={report.reportingInstitution} />
                          </div>
                          {report.riskTypes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {report.riskTypes.map((rt) => (
                                <span key={rt} className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">
                                  {rt}
                                </span>
                              ))}
                            </div>
                          )}
                        </ReportSection>

                        <ReportSection num={2} title="Transaction Summary">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <FieldRow label="Review Period" value={`${report.periodStart} to ${report.periodEnd}`} />
                            <FieldRow label="Total Amount" value={`$${report.totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
                            <FieldRow label="Transaction Count" value={`${report.txnCount} total / ${report.suspiciousTxnCount} suspicious`} />
                            <FieldRow label="Max Single Transaction" value={`$${report.maxSingleAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
                            <FieldRow label="Average Transaction" value={`$${report.avgAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
                            <FieldRow label="Jurisdictions Involved" value={report.countriesInvolved.join(", ")} />
                          </div>
                          {report.transactionRows.length > 0 && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-border">
                              <table className="w-full text-[10px]">
                                <thead className="bg-muted/50">
                                  <tr>
                                    {["Date", "Amount", "Type", "From", "To", "Risk Indicator"].map((h) => (
                                      <th key={h} className="px-2 py-1.5 text-left font-semibold text-muted-foreground">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {report.transactionRows.map((row, i) => (
                                    <tr key={i} className="hover:bg-muted/30">
                                      <td className="px-2 py-1.5 font-mono">{row.date}</td>
                                      <td className="px-2 py-1.5 font-mono font-semibold">${row.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                                      <td className="px-2 py-1.5 capitalize">{row.type}</td>
                                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{row.from}</td>
                                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{row.to}</td>
                                      <td className="px-2 py-1.5 capitalize text-risk-medium">{row.indicator}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </ReportSection>

                        <ReportSection num={3} title="Suspicious Activity Description">
                          <p
                            className="text-xs text-foreground leading-relaxed cursor-pointer hover:bg-primary/5 px-2 py-1 rounded-md transition-colors"
                            onClick={(e) => {
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setSelectedLine({ text: report.activityDescription.substring(0, 100), top: rect.bottom + window.scrollY + 8, left: Math.min(rect.left, window.innerWidth - 420) });
                            }}
                          >
                            {report.activityDescription}
                          </p>
                          {report.patternsObserved.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[10px] text-muted-foreground">Patterns detected:</span>
                              {report.patternsObserved.map((p) => (
                                <span key={p} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-medium capitalize">
                                  {p.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          )}
                        </ReportSection>

                        <ReportSection num={4} title="AML Regulatory Breach Mapping">
                          <p className="text-xs text-muted-foreground mb-2">
                            Regulatory Impact Score: <span className="font-bold text-destructive">{report.regulatoryImpactScore}%</span> — {report.regulatoryBreaches.filter(b => b.severity === "critical").length} critical obligations
                          </p>
                          <div className="space-y-1.5">
                            {report.regulatoryBreaches.slice(0, 5).map((b, i) => (
                              <div key={i} className={cn("flex items-start justify-between gap-2 p-2 rounded-lg border", SEVERITY_BG[b.severity])}>
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <Shield className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", SEVERITY_COLOR[b.severity])} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground">{b.rule}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground">{b.ref}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{b.trigger}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className={cn("text-[9px] shrink-0", SEVERITY_COLOR[b.severity])}>
                                  {b.severity.toUpperCase()}
                                </Badge>
                              </div>
                            ))}
                            {report.regulatoryBreaches.length > 5 && (
                              <button
                                className="text-xs text-primary hover:underline pl-2"
                                onClick={() => setActiveTab("regulatory")}
                              >
                                View all {report.regulatoryBreaches.length} obligations →
                              </button>
                            )}
                          </div>
                        </ReportSection>

                        <ReportSection num={5} title="Network & Entity Relationships">
                          <FieldRow label="Connected Entities" value={`${report.networkConnections} direct connections`} />
                          <FieldRow label="Relationship Types" value={report.relationshipTypes.join(", ") || "Transaction linkages"} />
                          {report.connectedEntities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {report.connectedEntities.slice(0, 8).map((id) => (
                                <span key={id} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{id}</span>
                              ))}
                              {report.connectedEntities.length > 8 && (
                                <span className="text-[9px] text-muted-foreground">+{report.connectedEntities.length - 8} more</span>
                              )}
                            </div>
                          )}
                        </ReportSection>

                        <ReportSection num={6} title="Risk Indicators Identified">
                          <ol className="space-y-1">
                            {report.riskIndicators.map((ri, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs">
                                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                                <span className="text-foreground">{ri}</span>
                              </li>
                            ))}
                          </ol>
                        </ReportSection>

                        <ReportSection num={7} title="Evidence Summary">
                          <ul className="space-y-1">
                            {report.evidenceItems.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                                <span className="text-primary shrink-0">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          {report.historicalPrecedent && (
                            <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10 text-[10px] text-muted-foreground">
                              <span className="font-semibold text-primary">Historical Precedent: </span>
                              {report.historicalPrecedent}
                            </div>
                          )}
                        </ReportSection>

                        <ReportSection num={8} title="Conclusion">
                          <p className="text-xs text-foreground leading-relaxed">{report.conclusion}</p>
                        </ReportSection>

                        <ReportSection num={9} title="Filing Instructions">
                          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1.5">
                            <p className="text-xs font-semibold text-destructive">IMMEDIATE ACTION REQUIRED</p>
                            {[
                              "File SAR with FinCEN BSA E-Filing System within 30 calendar days",
                              "Retain all supporting documentation for minimum 5 years",
                              "Do not disclose this filing to the subject entity (tipping off prohibition — 31 USC §5318(g)(2))",
                              "Enhanced monitoring on all connected accounts is recommended",
                              "Escalate to Financial Crimes Investigation Unit if activity continues",
                            ].map((item, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <ChevronRight className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                <span className="text-foreground">{item}</span>
                              </div>
                            ))}
                          </div>
                        </ReportSection>

                        {/* Footer */}
                        <div className="pt-3 border-t border-dashed border-border text-center">
                          <p className="text-[10px] text-muted-foreground">
                            Generated by {report.modelVersion} · {report.dateGenerated} · AI Confidence {report.aiConfidence}% · Pending human review and approval
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* ── Regulatory Mapping ─────────────────────────────────── */}
                  <TabsContent value="regulatory">
                    <ScrollArea className="h-[580px] pr-3">
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Each regulation is mapped to specific evidence from this case with an AI-generated explanation. Click any regulation to view full justification.
                        </p>
                        {report.regulatoryBreaches.map((b, i) => (
                          <div key={i} className={cn("rounded-xl border p-4 space-y-3", SEVERITY_BG[b.severity])}>
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <Shield className={cn("w-5 h-5 mt-0.5 shrink-0", SEVERITY_COLOR[b.severity])} />
                                <div>
                                  <p className="text-sm font-bold text-foreground">{b.rule}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{b.ref}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={cn("text-[9px] font-bold", SEVERITY_COLOR[b.severity])}
                                >
                                  {b.severity.toUpperCase()}
                                </Badge>
                                <span className="text-[10px] font-mono text-muted-foreground">{b.confidence}% confidence</span>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-muted-foreground pl-8">{b.description}</p>

                            {/* Trigger */}
                            <div className="pl-8 space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence Trigger</p>
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-foreground">{b.trigger}</p>
                              </div>
                            </div>

                            {/* AI Explanation */}
                            <div className="pl-8 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Brain className="w-3.5 h-3.5 text-primary" />
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">AI Explanation</p>
                              </div>
                              <div className="p-2.5 rounded-lg bg-background/60 border border-border">
                                <p className="text-xs text-foreground leading-relaxed">{b.explanation}</p>
                              </div>
                            </div>

                            {/* Confidence bar */}
                            <div className="pl-8 space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Rule confidence</span>
                                <span className="font-mono">{b.confidence}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", b.severity === "critical" ? "bg-destructive" : b.severity === "high" ? "bg-risk-medium" : "bg-amber-500")}
                                  style={{ width: `${b.confidence}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* ── Impact Score ───────────────────────────────────────── */}
                  <TabsContent value="impact">
                    <ScrollArea className="h-[580px] pr-3">
                      <div className="space-y-6">
                        {/* Big score gauge */}
                        <div className="text-center py-6 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Regulatory Risk Score</p>
                          <div className="relative inline-flex items-center justify-center">
                            <svg className="w-40 h-40" viewBox="0 0 120 120">
                              <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                              <circle
                                cx="60" cy="60" r="50" fill="none"
                                stroke={report.regulatoryImpactScore >= 80 ? "hsl(var(--destructive))" : report.regulatoryImpactScore >= 60 ? "hsl(var(--risk-medium))" : "#f59e0b"}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${report.regulatoryImpactScore * 3.14} 314`}
                                strokeDashoffset="78.5"
                                transform="rotate(-90 60 60)"
                              />
                              <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="bold" fill="currentColor" className="fill-foreground">
                                {report.regulatoryImpactScore}%
                              </text>
                              <text x="60" y="73" textAnchor="middle" fontSize="8" fill="currentColor" className="fill-muted-foreground">
                                Impact Score
                              </text>
                            </svg>
                          </div>
                          <div className="flex items-center justify-center gap-3 flex-wrap">
                            {[
                              { label: "Critical", count: report.regulatoryBreaches.filter(b => b.severity === "critical").length, color: "text-destructive bg-destructive/10" },
                              { label: "High", count: report.regulatoryBreaches.filter(b => b.severity === "high").length, color: "text-risk-medium bg-risk-medium/10" },
                              { label: "Medium", count: report.regulatoryBreaches.filter(b => b.severity === "medium").length, color: "text-amber-500 bg-amber-500/10" },
                            ].map((s) => (
                              <div key={s.label} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold", s.color)}>
                                {s.count} {s.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Triggered rules list */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Triggered Rules</p>
                          {report.regulatoryBreaches.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border">
                              <CheckSquare className={cn("w-4 h-4 shrink-0", SEVERITY_COLOR[b.severity])} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{b.rule}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{b.ref}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[9px] font-mono text-muted-foreground">{b.confidence}%</span>
                                <Badge variant="outline" className={cn("text-[9px]", SEVERITY_COLOR[b.severity])}>
                                  {b.severity}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Risk indicators */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Indicators</p>
                          {report.riskIndicators.map((ri, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                              <AlertTriangle className="w-3.5 h-3.5 text-risk-medium shrink-0 mt-0.5" />
                              <span className="text-xs text-foreground">{ri}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* ── Pipeline Modules ───────────────────────────────────── */}
                  <TabsContent value="pipeline">
                    <ScrollArea className="h-[580px] pr-3">
                      {!pipelineReport ? (
                        <div className="py-20 text-center space-y-3">
                          <Layers className="w-10 h-10 mx-auto text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">
                            Generate a SAR to view per-layer pipeline reporting.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-muted/40 border border-border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entity</p>
                              <p className="text-sm font-mono font-semibold text-foreground mt-1">{pipelineReport.entityId}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/40 border border-border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Suspicious Txns</p>
                              <p className="text-sm font-semibold text-foreground mt-1">{pipelineReport.suspiciousTxnCount}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/40 border border-border">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Flagged Amount</p>
                              <p className="text-sm font-semibold text-foreground mt-1">
                                ${pipelineReport.totalSuspiciousAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {pipelineReport.modules.map((module) => (
                              <div key={module.layer} className="rounded-lg border border-border bg-card p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                      Layer {module.layer}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">{module.title}</p>
                                  </div>
                                  <Badge variant="outline" className="text-[10px]">Completed</Badge>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed">{module.detail}</p>
                                <div className="p-2 rounded-md bg-primary/5 border border-primary/10">
                                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Outcome</p>
                                  <p className="text-xs text-foreground mt-1">{module.outcome}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {module.evidence.map((item, idx) => (
                                    <span
                                      key={`${module.layer}-${idx}`}
                                      className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* ── Audit Trail ────────────────────────────────────────── */}
                  <TabsContent value="audit">
                    <ScrollArea className="h-[580px] pr-3">
                      <div className="relative">
                        {auditLog.map((entry, idx) => (
                          <div key={entry.id} className="relative pl-10 pb-5">
                            {idx < auditLog.length - 1 && (
                              <div className="absolute left-[19px] top-9 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 to-primary/10" />
                            )}
                            <div className={cn(
                              "absolute left-0.5 top-0.5 w-8 h-8 rounded-full flex items-center justify-center shadow",
                              entry.type === "ai_decision"
                                ? "bg-gradient-to-br from-purple-500 to-purple-600"
                                : "bg-gradient-to-br from-amber-500 to-amber-600"
                            )}>
                              {entry.type === "ai_decision"
                                ? <Brain className="w-4 h-4 text-white" />
                                : <Activity className="w-4 h-4 text-white" />}
                            </div>
                            <div className={cn(
                              "rounded-lg p-3 shadow-sm border-l-4",
                              entry.type === "ai_decision"
                                ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-500"
                                : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-500"
                            )}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <Badge
                                  variant={entry.type === "ai_decision" ? "secondary" : "warning"}
                                  className="text-[10px]"
                                >
                                  {entry.type === "ai_decision" ? "AI Decision" : "Data Analysis"}
                                </Badge>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {new Date().toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{entry.message}</p>
                              {idx === auditLog.length - 1 && entry.message.includes("ready") && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-500">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="font-semibold">Generation Complete</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div ref={auditEndRef} />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={Boolean(pdfPreview)} onOpenChange={(open) => {
        if (!open) {
          handleClosePdfPreview();
        }
      }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-6xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4 pr-12">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-base">SAR PDF Preview</DialogTitle>
                <DialogDescription className="text-xs">
                  Review the branded Barclays report before printing or downloading.
                </DialogDescription>
                {pdfPreview && (
                  <p className="text-[11px] font-mono text-muted-foreground">{pdfPreview.filename}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={handlePrintPdfPreview}
                  disabled={!pdfPreview || previewLoading}
                >
                  {previewLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  {previewLoading ? "Loading..." : "Print"}
                </Button>
                {pdfPreview && (
                  <Button asChild size="sm" className="gap-1.5 text-xs">
                    <a href={pdfPreview.url} download={pdfPreview.filename}>
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="bg-muted/30 p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              {previewLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rendering PDF preview...
                  </div>
                </div>
              )}

              {pdfPreview && (
                <iframe
                  ref={pdfPreviewFrameRef}
                  src={`${pdfPreview.url}#view=FitH`}
                  title="SAR PDF preview"
                  className="h-[72vh] w-full bg-white"
                  onLoad={() => setPreviewLoading(false)}
                />
              )}
            </div>

            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              The preview matches the file that will be printed or downloaded.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* SHAP popup */}
      {selectedLine && (
        <SHAPPopup
          features={getSHAPFeaturesForText(selectedLine.text)}
          selectedText={selectedLine.text.substring(0, 80)}
          onClose={() => setSelectedLine(null)}
          position={{ top: selectedLine.top, left: selectedLine.left }}
        />
      )}
    </div>
  );
}
