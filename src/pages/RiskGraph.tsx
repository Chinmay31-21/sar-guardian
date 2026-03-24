import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useCSVData } from "@/hooks/useCSVData";
import { useSARData } from "@/context/SARDataContext";
import { generateNarrative, getRegulatoryBreaches } from "@/lib/csvLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  AlertTriangle, Shield, X, CheckSquare, Square,
  FileText, AlertCircle, Loader2, Network, ChevronRight, ArrowRight,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

// ─── Force-directed layout ─────────────────────────────────────────────────────

interface NodePos { x: number; y: number }

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function computeForceLayout(
  nodes: string[],
  edges: { a: string; b: string; w: number }[],
  w: number,
  h: number
): Record<string, NodePos> {
  const n = nodes.length;
  if (n === 0) return {};

  const pos: Record<string, NodePos> = {};
  // Deterministic initial positions using hash-based seeding
  nodes.forEach((id, i) => {
    const seed = hashStr(id);
    pos[id] = {
      x: w * 0.1 + seededRandom(seed) * w * 0.8,
      y: h * 0.1 + seededRandom(seed + 1) * h * 0.8,
    };
  });

  const vel: Record<string, NodePos> = {};
  nodes.forEach((id) => { vel[id] = { x: 0, y: 0 }; });

  const REPULSION = 2500;
  const SPRING_LEN = 90;
  const SPRING_K = 0.04;
  const DAMPING = 0.8;
  const GRAVITY = 0.012;
  const ITERATIONS = 120;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const fx: Record<string, number> = {};
    const fy: Record<string, number> = {};
    nodes.forEach((id) => { fx[id] = 0; fy[id] = 0; });

    // Repulsion (O(n²) — acceptable for ≤50 nodes)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = pos[b].x - pos[a].x;
        const dy = pos[b].y - pos[a].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = REPULSION / (dist * dist);
        fx[a] -= (f * dx) / dist;
        fy[a] -= (f * dy) / dist;
        fx[b] += (f * dx) / dist;
        fy[b] += (f * dy) / dist;
      }
    }

    // Spring attraction
    edges.forEach(({ a, b, w: strength }) => {
      if (!pos[a] || !pos[b]) return;
      const dx = pos[b].x - pos[a].x;
      const dy = pos[b].y - pos[a].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = SPRING_K * (dist - SPRING_LEN) * (0.5 + strength * 0.5);
      fx[a] += (f * dx) / dist;
      fy[a] += (f * dy) / dist;
      fx[b] -= (f * dx) / dist;
      fy[b] -= (f * dy) / dist;
    });

    // Gravity toward center
    nodes.forEach((id) => {
      fx[id] += (w / 2 - pos[id].x) * GRAVITY;
      fy[id] += (h / 2 - pos[id].y) * GRAVITY;
    });

    // Integrate
    nodes.forEach((id) => {
      vel[id].x = (vel[id].x + fx[id]) * DAMPING;
      vel[id].y = (vel[id].y + fy[id]) * DAMPING;
      pos[id].x = Math.max(22, Math.min(w - 22, pos[id].x + vel[id].x));
      pos[id].y = Math.max(22, Math.min(h - 22, pos[id].y + vel[id].y));
    });
  }

  return pos;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getRiskColor(score: number | undefined): string {
  if (score === undefined) return "#6b7280";
  if (score >= 0.75) return "#ef4444";
  if (score >= 0.5) return "#f97316";
  if (score >= 0.25) return "#eab308";
  return "#22c55e";
}

function getRiskLabel(score: number | undefined): "critical" | "high" | "medium" | "low" | "unknown" {
  if (score === undefined) return "unknown";
  if (score >= 0.75) return "critical";
  if (score >= 0.5) return "high";
  if (score >= 0.25) return "medium";
  return "low";
}

const CHECKLIST_ITEMS = [
  "Transaction data has been independently verified against source systems",
  "All connected entities are documented in the case file",
  "Narrative accurately describes the suspicious activity and timeline",
  "Regulatory breach mapping reviewed and confirmed by compliance officer",
  "No exculpatory information has been withheld from this filing",
];

const RELATIONSHIP_COLORS: Record<string, string> = {
  crypto_exchange_interaction: "#8b5cf6",
  frequent_transactions: "#3b82f6",
  shared_beneficiary: "#ec4899",
  common_ownership: "#f97316",
  shell_company_link: "#ef4444",
  correspondent_bank: "#6b7280",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RiskGraph() {
  const { data, isLoading } = useCSVData();
  const {
    createOrUpdateSARForEntity,
    beginInvestigation,
    completeInvestigationSAR,
    activeInvestigationEntity,
    highlightedEntities,
    transactions: liveTransactions,
  } = useSARData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [manuallySuspiciousNodes, setManuallySuspiciousNodes] = useState<string[]>([]);
  const [excludedNodes, setExcludedNodes] = useState<string[]>([]);
  const [sarModal, setSarModal] = useState<string | null>(null); // entityId
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));
  const [sarActiveTab, setSarActiveTab] = useState("narrative");
  const [generatedSarId, setGeneratedSarId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const SVG_W = 900;
  const SVG_H = 560;

  useEffect(() => {
    const entityFromQuery = searchParams.get("entity");
    const openSar = searchParams.get("action") === "sar";
    if (!entityFromQuery) return;
    
    // Only update if it is different
    if (selectedNode !== entityFromQuery) {
      setSelectedNode(entityFromQuery);
      beginInvestigation(entityFromQuery, "risk_graph");
    }

    if (openSar && !sarModal && entityFromQuery) {
      beginInvestigation(entityFromQuery, "risk_graph");
      setSarModal(entityFromQuery);
      setChecklist(CHECKLIST_ITEMS.map(() => false));
      setSarActiveTab("narrative");
      setGeneratedSarId(null);
    }
  }, [searchParams, beginInvestigation, selectedNode, sarModal]);

  // ─── Build graph from CSV ────────────────────────────────────────────────────

  const { topNodes, filteredEdges, combinedEdges, riskByEntity, txnCountByEntity } = useMemo(() => {
    if (!data) {
      return {
        topNodes: [],
        filteredEdges: [],
        combinedEdges: [],
        riskByEntity: {},
        txnCountByEntity: {},
      };
    }

    const liveEdges = liveTransactions.slice(0, 1200).map((t) => ({
      entity_a: t.customerId,
      entity_b: t.receiverAccount || t.senderAccount || `${t.customerId}-DST`,
      relationship: t.flagType ? `${t.flagType}_flow` : "frequent_transactions",
      strength: Math.max(0.2, Math.min(1, t.riskScore / 100)),
    }));

    const combinedEdges = [...data.networkEdges, ...liveEdges].filter(
      (e) => !excludedNodes.includes(e.entity_a) && !excludedNodes.includes(e.entity_b)
    );

    // Connection count per entity
    const connCount: Record<string, number> = {};
    for (const e of combinedEdges) {
      connCount[e.entity_a] = (connCount[e.entity_a] ?? 0) + 1;
      connCount[e.entity_b] = (connCount[e.entity_b] ?? 0) + 1;
    }

    // Max risk score per entity from external risk dataset and live context transactions
    const riskByEntity: Record<string, number> = {};
    for (const r of data.externalRisk) {
      riskByEntity[r.entity] = Math.max(riskByEntity[r.entity] ?? 0, r.risk_score);
    }
    for (const t of liveTransactions) {
      riskByEntity[t.customerId] = Math.max(riskByEntity[t.customerId] ?? 0, t.riskScore / 100);
      if (t.receiverAccount) {
        riskByEntity[t.receiverAccount] = Math.max(riskByEntity[t.receiverAccount] ?? 0, t.riskScore / 120);
      }
    }
    manuallySuspiciousNodes.forEach((node) => {
      riskByEntity[node] = Math.max(riskByEntity[node] ?? 0, 0.85);
    });

    // Base graph: top entities by connection density
    let baseTopNodes = Object.entries(connCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 48)
      .map(([id]) => id);

    const focusEntity = activeInvestigationEntity || selectedNode;
    
    if (focusEntity) {
      // Trace out the suspicious chain: direct connections, plus multi-hop suspicious nodes
      const chainSet = new Set<string>([focusEntity]);
      const queue = [focusEntity];
      let iterations = 0;
      
      while (queue.length > 0 && iterations < 3) {
        const currentLevelSize = queue.length;
        for (let i = 0; i < currentLevelSize; i++) {
          const node = queue.shift()!;
          combinedEdges.forEach((e) => {
            const neighbor = e.entity_a === node ? e.entity_b : (e.entity_b === node ? e.entity_a : null);
            if (neighbor && !chainSet.has(neighbor)) {
              // Add neighbor if it's a direct hop (iterations === 0) OR if it is highly suspicious
              const isSuspicious = (riskByEntity[neighbor] || 0) >= 0.5;
              if (iterations === 0 || isSuspicious) {
                chainSet.add(neighbor);
                queue.push(neighbor);
              }
            }
          });
        }
        iterations++;
      }
      
      // If we have a focus entity, only show the relevant chain!
      baseTopNodes = Array.from(chainSet);
    }

    // Always include investigated/focused entities so investigation context remains visible.
    const topSet = new Set(baseTopNodes);
    if (activeInvestigationEntity) topSet.add(activeInvestigationEntity);
    if (selectedNode) topSet.add(selectedNode);
    highlightedEntities.forEach((id) => topSet.add(id));
    manuallySuspiciousNodes.forEach((id) => topSet.add(id));

    const topNodes = [...topSet]
      .sort((a, b) => (connCount[b] ?? 0) - (connCount[a] ?? 0))
      .slice(0, focusEntity ? 80 : 56);
    const finalSet = new Set(topNodes);

    // Keep only edges between top nodes
    const filteredEdges = combinedEdges.filter(
      (e) => finalSet.has(e.entity_a) && finalSet.has(e.entity_b)
    );

    const txnCountByEntity: Record<string, number> = {};
    for (const t of data.transactions) {
      if (finalSet.has(t.sender_account)) txnCountByEntity[t.sender_account] = (txnCountByEntity[t.sender_account] ?? 0) + 1;
      if (finalSet.has(t.receiver_account)) txnCountByEntity[t.receiver_account] = (txnCountByEntity[t.receiver_account] ?? 0) + 1;
    }
    for (const t of liveTransactions) {
      if (finalSet.has(t.customerId)) txnCountByEntity[t.customerId] = (txnCountByEntity[t.customerId] ?? 0) + 1;
      if (t.receiverAccount && finalSet.has(t.receiverAccount)) {
        txnCountByEntity[t.receiverAccount] = (txnCountByEntity[t.receiverAccount] ?? 0) + 1;
      }
    }

    return { topNodes, filteredEdges, combinedEdges, riskByEntity, txnCountByEntity };
  }, [
    data,
    activeInvestigationEntity,
    highlightedEntities,
    liveTransactions,
    selectedNode,
    excludedNodes,
    manuallySuspiciousNodes,
  ]);

  // Force layout (computed once when nodes/edges change)
  const positions = useMemo(
    () =>
      computeForceLayout(
        topNodes,
        filteredEdges.map((e) => ({ a: e.entity_a, b: e.entity_b, w: e.strength })),
        SVG_W,
        SVG_H
      ),
    [topNodes, filteredEdges]
  );

  const nodeRadius = useCallback(
    (id: string) => {
      const txns = txnCountByEntity[id] ?? 1;
      return Math.max(6, Math.min(18, 6 + txns * 0.4));
    },
    [txnCountByEntity]
  );

  useEffect(() => {
    // We only update selectedNode if it's currently null or different
    if (activeInvestigationEntity && topNodes.includes(activeInvestigationEntity)) {
      if (selectedNode !== activeInvestigationEntity && searchParams.get("entity") !== activeInvestigationEntity) {
        setSelectedNode(activeInvestigationEntity);
      }
    }
  }, [activeInvestigationEntity, topNodes, selectedNode, searchParams]);

  // ─── Selected Entity Details ────────────────────────────────────────────────

  const selectedEntityData = useMemo(() => {
    if (!selectedNode || !data) return null;
    const entityRisk = data.externalRisk.filter((r) => r.entity === selectedNode);
    const connections = combinedEdges.filter(
      (e) => e.entity_a === selectedNode || e.entity_b === selectedNode
    );
    const entityTxns = liveTransactions.filter(
      (t) =>
        t.customerId === selectedNode ||
        t.receiverAccount === selectedNode ||
        t.senderAccount === selectedNode
    );
    const suspiciousCount = entityTxns.filter(
      (t) => t.status === "flagged" || t.status === "under_review"
    ).length;
    const totalAmount = entityTxns.reduce((s, t) => s + t.amount, 0);
    const riskScore = entityRisk.length
      ? Math.max(...entityRisk.map((r) => r.risk_score))
      : riskByEntity[selectedNode];
    const connectedIds = [
      ...new Set(
        connections.map((e) =>
          e.entity_a === selectedNode ? e.entity_b : e.entity_a
        )
      ),
    ];
    return {
      entityRisk,
      connections,
      entityTxns: entityTxns.slice(0, 8),
      suspiciousCount,
      totalAmount,
      riskScore,
      connectedIds,
      riskTypes: [...new Set(entityRisk.map((r) => r.risk_type))],
      relationshipTypes: [...new Set(connections.map((e) => e.relationship))],
    };
  }, [selectedNode, data, combinedEdges, liveTransactions, riskByEntity]);

  const anomalyScores = useMemo(() => {
    if (liveTransactions.length === 0) return [];

    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    const txns = liveTransactions;
    const suspicious = txns.filter((t) => t.status === "flagged" || t.status === "under_review");
    const suspiciousAmount = suspicious.reduce((sum, t) => sum + t.amount, 0);
    const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0) || 1;
    const highRiskCountries = new Set(["BVI", "CY", "PA", "BS", "KY", "RU", "LU", "MT", "AE", "HK"]);
    const highRiskGeo = suspicious.filter((t) => highRiskCountries.has(t.country)).length;

    const senderCounts: Record<string, number> = {};
    txns.forEach((t) => {
      senderCounts[t.customerId] = (senderCounts[t.customerId] ?? 0) + 1;
    });
    const maxSenderCount = Math.max(...Object.values(senderCounts), 1);
    const entitiesWithCriticalRisk = Object.values(riskByEntity).filter((s) => s >= 0.75).length;

    return [
      { category: "Volume Deviation", score: clamp((suspicious.length / txns.length) * 220) },
      { category: "Amount Anomaly", score: clamp((suspiciousAmount / totalAmount) * 180) },
      { category: "Geographic Risk", score: clamp((highRiskGeo / Math.max(suspicious.length, 1)) * 130) },
      { category: "Velocity Alert", score: clamp((maxSenderCount / 30) * 100) },
      {
        category: "Pattern Match",
        score: clamp((suspicious.filter((t) => t.flagType && t.flagType !== "high_value").length / Math.max(suspicious.length, 1)) * 100),
      },
      {
        category: "Network Risk",
        score: clamp((entitiesWithCriticalRisk / Math.max(topNodes.length, 1)) * 220),
      },
    ];
  }, [liveTransactions, riskByEntity, topNodes.length]);

  const radarData = useMemo(() => {
    if (!data || liveTransactions.length === 0) return [];

    const suspicious = liveTransactions.filter((t) => t.status === "flagged" || t.status === "under_review");
    const countFlag = (flag: string) => suspicious.filter((t) => t.flagType === flag).length;
    const score = (value: number, base: number) => Math.max(15, Math.min(100, Math.round((value / Math.max(base, 1)) * 100)));

    return [
      { subject: "Structuring", A: score(countFlag("structuring"), suspicious.length * 0.2) },
      { subject: "Layering", A: score(countFlag("high_value"), suspicious.length * 0.18) },
      { subject: "Integration", A: score(countFlag("cross_border"), suspicious.length * 0.22) },
      { subject: "Trade-Based", A: score(countFlag("trade_based"), suspicious.length * 0.12) },
      {
        subject: "Shell Entity",
        A: score(data.externalRisk.filter((r) => r.risk_type.toLowerCase().includes("shell")).length, data.externalRisk.length * 0.15),
      },
      {
        subject: "Crypto",
        A: score(
          suspicious.filter((t) => t.flagType === "crypto" || t.type.toLowerCase().includes("crypto")).length,
          suspicious.length * 0.12
        ),
      },
    ];
  }, [data, liveTransactions]);

  const deviationMetrics = useMemo(() => {
    if (liveTransactions.length === 0) return [];

    const txns = liveTransactions;
    const suspicious = txns.filter((t) => t.status === "flagged" || t.status === "under_review");
    const highRiskCountries = new Set(["BVI", "CY", "PA", "BS", "KY", "RU", "LU", "MT", "AE", "HK"]);
    const highRiskGeo = txns.filter((t) => highRiskCountries.has(t.country));
    const avgAmount = txns.reduce((s, t) => s + t.amount, 0) / txns.length;
    const suspiciousAvgAmount =
      suspicious.reduce((s, t) => s + t.amount, 0) / Math.max(suspicious.length, 1);
    const roundAmountCount = suspicious.filter((t) => t.flagType === "round_amounts").length;

    const deviationPercent = (current: number, baseline: number) => {
      if (baseline === 0) return 0;
      return ((current - baseline) / baseline) * 100;
    };

    const makeMetric = (label: string, value: number, sigma: number) => {
      const severity = sigma >= 4 ? "high" : "medium";
      return {
        label,
        deviation: `${value >= 0 ? "+" : ""}${Math.round(value)}%`,
        sigma: `${sigma.toFixed(1)}s`,
        severity,
      };
    };

    return [
      makeMetric("Transaction Volume", (suspicious.length / txns.length) * 420, 4.1),
      makeMetric("Average Amount", deviationPercent(suspiciousAvgAmount, avgAmount), 4.6),
      makeMetric("Geographic Spread", (highRiskGeo.length / txns.length) * 300, 3.7),
      makeMetric("Pattern Density", (suspicious.filter((t) => !!t.flagType).length / Math.max(suspicious.length, 1)) * 180, 3.5),
      makeMetric("Round Amount Frequency", (roundAmountCount / Math.max(suspicious.length, 1)) * 260, 4.0),
    ];
  }, [liveTransactions]);

  // ─── SAR Generation ─────────────────────────────────────────────────────────

  const sarNarrative = useMemo(() => {
    if (!sarModal || !data) return "";
    return generateNarrative(
      sarModal,
      data.externalRisk,
      data.networkEdges,
      data.transactions,
      data.historicalSARs
    );
  }, [sarModal, data]);

  const regulatoryBreaches = useMemo(() => {
    if (!sarModal || !data) return [];
    const riskTypes = [
      ...new Set(
        data.externalRisk
          .filter((r) => r.entity === sarModal)
          .map((r) => r.risk_type)
      ),
    ];
    if (!riskTypes.length) riskTypes.push("Suspicious Financial Activity");
    return getRegulatoryBreaches(riskTypes);
  }, [sarModal, data]);

  const allChecked = checklist.every(Boolean);

  function handleOpenModal(entityId: string) {
    beginInvestigation(entityId, "risk_graph");
    setSarModal(entityId);
    setChecklist(CHECKLIST_ITEMS.map(() => false));
    setSarActiveTab("narrative");
    setGeneratedSarId(null);
  }

  function handleGenerateSAR() {
    if (!sarModal || !data || !allChecked) return;
    const entityRisk = data.externalRisk.filter((r) => r.entity === sarModal);
    const riskTypes = [...new Set(entityRisk.map((r) => r.risk_type))];
    const totalAmount = data.transactions
      .filter((t) => t.sender_account === sarModal || t.receiver_account === sarModal)
      .reduce((s, t) => s + t.amount, 0);

    const id = createOrUpdateSARForEntity({
      customerName: sarModal,
      customerId: sarModal,
      narrative: sarNarrative,
      triggerRules: regulatoryBreaches.slice(0, 3).map((b) => ({
        id: b.ref,
        name: b.rule,
        confidence: 85 + Math.floor(Math.random() * 12),
      })),
      riskBreakdown: riskTypes.slice(0, 3).map((rt, i) => ({
        label: rt,
        value: Math.round((entityRisk.find((r) => r.risk_type === rt)?.risk_score ?? 0.7) * 100),
      })),
      evidenceAnchors: [
        "Network graph correlation analysis",
        "External risk intelligence feeds",
        ...entityRisk.slice(0, 2).map((r) => `${r.source}: ${r.risk_type}`),
      ],
      timelineEvents: [
        {
          date: new Date().toISOString().split("T")[0],
          event: "SAR generated from network graph investigation",
        },
        {
          date: new Date().toISOString().split("T")[0],
          event: `Human review completed — approved by compliance officer`,
        },
      ],
    });
    completeInvestigationSAR(sarModal, id);
    setGeneratedSarId(id);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Risk Attribution & Network Graph</h1>
        <p className="text-sm text-muted-foreground">
          Live entity network · FATF typology mapping · Regulatory triggers · SAR generation
        </p>
      </div>

      {activeInvestigationEntity && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <AlertTriangle className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">
            Investigation highlight active for {activeInvestigationEntity}. Entity topology and links are pinned in this graph.
          </span>
        </div>
      )}

      <Tabs defaultValue="network">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="network" className="text-xs gap-1">
            <Network className="w-3 h-3" /> Connection Graph
          </TabsTrigger>
          <TabsTrigger value="anomaly" className="text-xs">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="typology" className="text-xs">Typology Mapping</TabsTrigger>
          <TabsTrigger value="regulatory" className="text-xs">Regulatory Triggers</TabsTrigger>
        </TabsList>

        {/* ── Network Graph ─────────────────────────────────────────────────── */}
        <TabsContent value="network" className="mt-4">
          {isLoading ? (
            <Card className="shadow-card">
              <CardContent className="flex items-center justify-center py-24">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Loading network data from CSV datasets…</p>
                  <p className="text-[10px] text-muted-foreground">4,000 transactions · 1,197 connections · external risk feeds</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Graph canvas */}
              <div className="xl:col-span-2">
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Entity Connection Network</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {topNodes.length} entities · {filteredEdges.length} connections · Click node to investigate
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {[
                        { color: "#ef4444", label: "Critical" },
                        { color: "#f97316", label: "High" },
                        { color: "#eab308", label: "Medium" },
                        { color: "#22c55e", label: "Low" },
                        { color: "#6b7280", label: "Unknown" },
                      ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                          {l.label}
                        </div>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                      className="w-full bg-muted/20 cursor-crosshair"
                      style={{ height: 480 }}
                      onClick={() => setSelectedNode(null)}
                    >
                      {/* Edges */}
                      {filteredEdges.map((edge, i) => {
                        const pa = positions[edge.entity_a];
                        const pb = positions[edge.entity_b];
                        if (!pa || !pb) return null;
                        const color =
                          RELATIONSHIP_COLORS[edge.relationship] ?? "#6b7280";
                        return (
                          <line
                            key={i}
                            x1={pa.x}
                            y1={pa.y}
                            x2={pb.x}
                            y2={pb.y}
                            stroke={color}
                            strokeWidth={Math.max(0.5, edge.strength * 2)}
                            strokeOpacity={
                              selectedNode &&
                              edge.entity_a !== selectedNode &&
                              edge.entity_b !== selectedNode
                                ? 0.08
                                : 0.35
                            }
                          />
                        );
                      })}

                      {/* Nodes */}
                      {topNodes.map((id) => {
                        const p = positions[id];
                        if (!p) return null;
                        const risk = riskByEntity[id];
                        const color = getRiskColor(risk);
                        const r = nodeRadius(id);
                        const isSelected = selectedNode === id;
                        const isActiveInvestigation = activeInvestigationEntity === id;
                        const isHighlighted = highlightedEntities.includes(id);
                        const isConnected =
                          selectedNode &&
                          filteredEdges.some(
                            (e) =>
                              (e.entity_a === selectedNode && e.entity_b === id) ||
                              (e.entity_b === selectedNode && e.entity_a === id)
                          );
                        const dimmed =
                          selectedNode && !isSelected && !isConnected;
                        return (
                          <g
                            key={id}
                            transform={`translate(${p.x},${p.y})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNode(id === selectedNode ? null : id);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {isActiveInvestigation && (
                              <circle
                                r={r + 10}
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                strokeDasharray="2 3"
                                opacity={0.85}
                              />
                            )}
                            {isSelected && (
                              <circle
                                r={r + 6}
                                fill="none"
                                stroke={color}
                                strokeWidth={2}
                                strokeDasharray="4 2"
                                opacity={0.7}
                              />
                            )}
                            <circle
                              r={r}
                              fill={color}
                              fillOpacity={dimmed ? 0.15 : 0.85}
                              stroke={isSelected ? "#fff" : isHighlighted ? "hsl(var(--primary))" : color}
                              strokeWidth={isSelected ? 2 : isHighlighted ? 1.6 : 0.5}
                            />
                            {(isSelected || isActiveInvestigation) && (
                              <text
                                textAnchor="middle"
                                dy={r + 10}
                                fontSize={9}
                                fill="hsl(var(--foreground))"
                                opacity={0.9}
                              >
                                {isActiveInvestigation ? `${id} (investigating)` : id}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </CardContent>
                </Card>

                {/* Relationship legend */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(RELATIONSHIP_COLORS).map(([rel, color]) => (
                    <div key={rel} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="w-3 h-0.5" style={{ background: color }} />
                      {rel.replace(/_/g, " ")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Side Panel */}
              <div className="space-y-3">
                {!selectedNode ? (
                  <Card className="shadow-card">
                    <CardContent className="py-12 text-center space-y-3">
                      <Network className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        Click any node in the graph to investigate an entity
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Node size = transaction volume<br />
                        Node colour = risk level from external intelligence
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-card border-2" style={{ borderColor: getRiskColor(selectedEntityData?.riskScore) }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold truncate">{selectedNode}</CardTitle>
                        <button
                          onClick={() => setSelectedNode(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {selectedEntityData && (
                        <div className="flex gap-2 flex-wrap mt-1">
                          <Badge
                            className="text-[9px]"
                            style={{
                              background: getRiskColor(selectedEntityData.riskScore),
                              color: "#fff",
                            }}
                          >
                            {getRiskLabel(selectedEntityData.riskScore).toUpperCase()} RISK
                          </Badge>
                          {selectedEntityData.riskTypes.slice(0, 2).map((rt) => (
                            <Badge key={rt} variant="outline" className="text-[9px]">
                              {rt}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    {selectedEntityData && (
                      <CardContent className="space-y-3 text-xs">
                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              label: "Risk Score",
                              value: selectedEntityData.riskScore
                                ? `${(selectedEntityData.riskScore * 100).toFixed(0)}%`
                                : "—",
                            },
                            {
                              label: "Connections",
                              value: selectedEntityData.connections.length,
                            },
                            {
                              label: "Suspicious Txns",
                              value: `${selectedEntityData.suspiciousCount} / ${selectedEntityData.entityTxns.length}`,
                            },
                            {
                              label: "Total Volume",
                              value: `$${(selectedEntityData.totalAmount / 1000).toFixed(0)}K`,
                            },
                          ].map((s) => (
                            <div key={s.label} className="p-2 rounded bg-muted/50">
                              <p className="text-[10px] text-muted-foreground">{s.label}</p>
                              <p className="font-semibold">{s.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* External intelligence */}
                        {selectedEntityData.entityRisk.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              External Intelligence
                            </p>
                            {selectedEntityData.entityRisk.slice(0, 3).map((r, i) => (
                              <div key={i} className="p-2 rounded bg-muted/50 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-primary">{r.source}</span>
                                  <span className="text-[10px] text-risk-high font-mono">
                                    {(r.risk_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">{r.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Relationship types */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Relationship Types
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedEntityData.relationshipTypes.map((rt) => (
                              <div
                                key={rt}
                                className="px-1.5 py-0.5 rounded text-[9px] text-white font-medium"
                                style={{ background: RELATIONSHIP_COLORS[rt] ?? "#6b7280" }}
                              >
                                {rt.replace(/_/g, " ")}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Connected entities */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Connected Entities ({selectedEntityData.connectedIds.length})
                          </p>
                          <div className="space-y-1">
                            {selectedEntityData.connectedIds.slice(0, 5).map((id) => (
                              <div
                                key={id}
                                className="flex items-center gap-2 p-1.5 rounded bg-muted/50 transition-colors"
                              >
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: getRiskColor(riskByEntity[id]) }}
                                />
                                <button
                                  className="text-[10px] font-mono flex-1 truncate text-left hover:text-primary"
                                  onClick={() => {
                                    setSelectedNode(id);
                                    beginInvestigation(id, "risk_graph");
                                  }}
                                >
                                  {id}
                                </button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[9px]"
                                  onClick={() => {
                                    setManuallySuspiciousNodes((prev) =>
                                      prev.includes(id) ? prev : [...prev, id]
                                    );
                                    setExcludedNodes((prev) => prev.filter((n) => n !== id));
                                  }}
                                >
                                  Mark Suspicious
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[9px]"
                                  onClick={() => {
                                    setExcludedNodes((prev) =>
                                      prev.includes(id) ? prev : [...prev, id]
                                    );
                                    setManuallySuspiciousNodes((prev) => prev.filter((n) => n !== id));
                                  }}
                                >
                                  Not Related
                                </Button>
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2 pt-1">
                          <Button
                            size="sm"
                            className="w-full text-xs"
                            variant="destructive"
                            onClick={() => navigate(`/sar/generate?entity=${encodeURIComponent(selectedNode)}&action=draft`)}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1.5" />
                            File and Generate SAR Draft
                          </Button>
                          <Button
                            size="sm"
                            className="w-full text-xs"
                            variant="outline"
                            onClick={() => navigate(`/transactions?q=${encodeURIComponent(selectedNode)}`)}
                          >
                            <ArrowRight className="w-3 h-3 mr-1.5" />
                            View Transactions
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Network stats card */}
                <Card className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Network Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {[
                      {
                        label: "Total Entities",
                        value: new Set([
                          ...combinedEdges.map((e) => e.entity_a),
                          ...combinedEdges.map((e) => e.entity_b),
                        ]).size,
                      },
                      { label: "Total Connections", value: combinedEdges.length },
                      {
                        label: "High-Risk Entities",
                        value: Object.values(riskByEntity).filter((s) => s >= 0.75).length,
                      },
                      {
                        label: "External Risk Hits",
                        value: data?.externalRisk.length ?? 0,
                      },
                      {
                        label: "Suspicious Transactions",
                        value: liveTransactions.filter((t) => t.status === "flagged" || t.status === "under_review").length,
                      },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-semibold tabular-nums">{s.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Anomaly Detection ─────────────────────────────────────────────── */}
        <TabsContent value="anomaly" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Statistical Anomaly Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={anomalyScores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="category" type="category" fontSize={11} stroke="hsl(var(--muted-foreground))" width={120} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Deviation Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deviationMetrics.map((d) => (
                  <div key={d.label} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                    <span className="text-sm text-foreground">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-risk-high">{d.deviation}</span>
                      <Badge variant={d.severity === "high" ? "riskHigh" : "riskMedium"} className="text-[9px]">{d.sigma}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Live CSV stats */}
          {data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                {
                  label: "Suspicious Transactions",
                  value: liveTransactions.filter((t) => t.status === "flagged" || t.status === "under_review").length,
                  color: "text-risk-high",
                },
                {
                  label: "High-Risk Country Txns",
                  value: liveTransactions.filter((t) => ["BVI", "CY", "PA", "BS", "KY", "RU", "LU", "MT", "AE", "HK"].includes(t.country)).length,
                  color: "text-risk-medium",
                },
                { label: "External Risk Entities", value: data.externalRisk.length, color: "text-primary" },
                { label: "Network Connections", value: combinedEdges.length, color: "text-foreground" },
              ].map(s => (
                <Card key={s.label} className="shadow-card">
                  <CardContent className="p-3 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Typology Mapping ──────────────────────────────────────────────── */}
        <TabsContent value="typology" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">ML Typology Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                    <Radar name="Risk" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  FATF Typology Distribution
                  {data && <span className="text-[10px] font-normal text-muted-foreground ml-2">from {data.historicalSARs.length} historical SARs</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data
                  ? (() => {
                      const typoCount: Record<string, number> = {};
                      data.historicalSARs.forEach(s => {
                        typoCount[s.typology] = (typoCount[s.typology] ?? 0) + 1;
                      });
                      return Object.entries(typoCount)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([typology, count]) => {
                          const pct = Math.round((count / data.historicalSARs.length) * 100);
                          return (
                            <div key={typology} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{typology}</span>
                                <span className="font-mono text-muted-foreground">{count} ({pct}%)</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        });
                    })()
                  : <p className="text-xs text-muted-foreground">Loading…</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Regulatory Triggers ───────────────────────────────────────────── */}
        <TabsContent value="regulatory" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Active Regulatory Obligations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { rule: "FinCEN CTR Threshold", status: "triggered", ref: "31 CFR §1010.311", severity: "critical" },
                  { rule: "OFAC Screening", status: "2 fuzzy matches", ref: "Executive Order 13224", severity: "critical" },
                  { rule: "EU 6AMLD Cross-border", status: "threshold exceeded", ref: "Directive 2018/1673", severity: "high" },
                  { rule: "BSA SAR Filing", status: "required", ref: "31 USC §5318(g)", severity: "critical" },
                  { rule: "FATF Grey List Check", status: "3 jurisdictions", ref: "FATF Mutual Evaluation", severity: "high" },
                  { rule: "FATF Recommendation 24", status: "shell entity detected", ref: "FATF R-24 (2022)", severity: "high" },
                ].map((rt) => (
                  <div key={rt.rule} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Shield className={`w-4 h-4 shrink-0 ${rt.severity === "critical" ? "text-risk-high" : "text-risk-medium"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{rt.rule}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{rt.ref}</p>
                      </div>
                    </div>
                    <Badge variant={rt.severity === "critical" ? "destructive" : "warning"} className="text-[10px] capitalize shrink-0">
                      {rt.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {data && (
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Risk Type Distribution (External Intelligence)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const typeCount: Record<string, number> = {};
                    data.externalRisk.forEach(r => {
                      typeCount[r.risk_type] = (typeCount[r.risk_type] ?? 0) + 1;
                    });
                    return Object.entries(typeCount)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([rt, count]) => {
                        const pct = Math.round((count / data.externalRisk.length) * 100);
                        return (
                          <div key={rt} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>{rt}</span>
                              <span className="text-muted-foreground font-mono">{count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      });
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── SAR Generation Modal ────────────────────────────────────────────────── */}
      {sarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !generatedSarId && setSarModal(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">SAR Generation — Human Review Required</h2>
                  <p className="text-xs text-muted-foreground">
                    Subject: <span className="font-mono font-semibold">{sarModal}</span>
                    {" · "}AI-generated draft pending officer approval
                  </p>
                </div>
              </div>
              {!generatedSarId && (
                <button onClick={() => setSarModal(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {generatedSarId ? (
              /* Success screen */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckSquare className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">SAR Generated Successfully</h3>
                  <p className="text-sm text-muted-foreground">
                    Case ID: <span className="font-mono font-bold text-foreground">{generatedSarId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    The SAR has been created and routed to the Review Queue for final compliance officer sign-off before filing.
                  </p>
                  <div className="flex gap-3 justify-center mt-4">
                    <Button onClick={() => { setSarModal(null); setSelectedNode(null); navigate("/sar/queue"); }}>
                      Go to Review Queue
                    </Button>
                    <Button variant="outline" onClick={() => setSarModal(null)}>
                      Continue Investigation
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="border-b border-border px-4 pt-3 shrink-0">
                  <div className="flex gap-1">
                    {[
                      { id: "narrative", label: "Narrative Report", icon: FileText },
                      { id: "regulatory", label: "Regulatory Breaches", icon: Shield },
                      { id: "checklist", label: `Approval Checklist (${checklist.filter(Boolean).length}/${CHECKLIST_ITEMS.length})`, icon: CheckSquare },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSarActiveTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors
                          ${sarActiveTab === t.id
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4">
                    {sarActiveTab === "narrative" && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            AI-generated draft based on CSV datasets, network analysis &amp; external intelligence. Review for accuracy before approving.
                          </p>
                        </div>
                        <pre className="text-[11px] font-mono bg-muted/50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed text-foreground overflow-x-auto">
                          {sarNarrative}
                        </pre>
                      </div>
                    )}

                    {sarActiveTab === "regulatory" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          The following regulations are triggered by the detected risk types for this entity. All must be addressed before filing.
                        </p>
                        {regulatoryBreaches.map((b, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Shield className={`w-4 h-4 shrink-0 ${b.severity === "critical" ? "text-destructive" : b.severity === "high" ? "text-risk-medium" : "text-muted-foreground"}`} />
                                <span className="text-sm font-semibold">{b.rule}</span>
                              </div>
                              <Badge
                                className="text-[9px] capitalize shrink-0"
                                variant={b.severity === "critical" ? "destructive" : "warning"}
                              >
                                {b.severity}
                              </Badge>
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground pl-6">{b.ref}</p>
                            <p className="text-xs text-muted-foreground pl-6">{b.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {sarActiveTab === "checklist" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          All items must be confirmed before generating the SAR. These attestations are recorded in the audit trail.
                        </p>
                        {CHECKLIST_ITEMS.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => setChecklist((prev) => prev.map((v, j) => j === i ? !v : v))}
                            className="w-full flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors"
                          >
                            {checklist[i] ? (
                              <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <span className={`text-sm ${checklist[i] ? "text-foreground" : "text-muted-foreground"}`}>
                              {item}
                            </span>
                          </button>
                        ))}

                        {!allChecked && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-muted-foreground">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <p className="text-xs">
                              {CHECKLIST_ITEMS.length - checklist.filter(Boolean).length} item(s) remaining before SAR can be generated
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Modal footer */}
                <div className="flex items-center justify-between gap-3 p-4 border-t border-border shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setSarModal(null)}>
                    Discard
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSarActiveTab(sarActiveTab === "narrative" ? "regulatory" : sarActiveTab === "regulatory" ? "checklist" : "checklist")}
                    >
                      {sarActiveTab === "checklist" ? "Review Complete" : "Next →"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!allChecked}
                      onClick={handleGenerateSAR}
                      className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      {allChecked ? "Generate SAR" : `Checklist (${checklist.filter(Boolean).length}/${CHECKLIST_ITEMS.length})`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
