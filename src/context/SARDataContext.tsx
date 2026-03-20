import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  transactions as seedTransactions,
  sarReports as seedSARs,
  customers as seedCustomers,
  SARReport,
  Transaction,
  Customer,
  RiskLevel,
  SARStatus,
  FlagType,
} from "@/data/synthetic";
import { useCsvLiveFeed } from "@/hooks/useCSVData";
import {
  detectAllThreatsFromData,
  summarizeThreats,
  type DetectedThreat,
  type ThreatSummary,
} from "@/lib/threatDetection";

// ─── Live Feed ─────────────────────────────────────────────────────────────────

export type FeedSeverity = "critical" | "high" | "medium" | "low";

export interface LiveFeedItem {
  id: string;
  source: string;
  title: string;
  description: string;
  severity: FeedSeverity;
  timestamp: Date;
  entityName?: string;
  amount?: number;
  currency?: string;
  country?: string;
  read: boolean;
}

const MONITORING_SOURCES = [
  "FinCEN FBAR Feed",
  "SWIFT Compliance Monitor",
  "Interpol Financial Link",
  "Refinitiv World-Check",
  "Europol SIENA",
  "OFAC SDN Real-time",
  "Acuris Risk Intelligence",
  "EDD Trusted Network",
  "TransUnion AML",
  "Barclays Internal Monitor",
];

const FEED_TEMPLATES: {
  title: string;
  desc: (entity: string, amount: string, country: string) => string;
  severity: FeedSeverity;
}[] = [
  {
    title: "New Cross-Border Wire Detected",
    desc: (e, a, c) => `${e} initiated ${a} wire to ${c} — jurisdiction flagged on FATF grey list`,
    severity: "high",
  },
  {
    title: "Structuring Pattern Alert",
    desc: (e, a) => `${e} made 3 consecutive deposits below $10K totalling ${a} — CTR avoidance suspected`,
    severity: "critical",
  },
  {
    title: "KYC Anomaly Flagged",
    desc: (e) => `${e} KYC documents expire in 48hrs — ${e} shows recent high-value activity`,
    severity: "high",
  },
  {
    title: "Crypto Conversion Chain",
    desc: (e, a) => `${e}: BTC→XMR→USDT conversion chain of ${a} detected across 4 wallets`,
    severity: "high",
  },
  {
    title: "Velocity Breach — Rule R-407",
    desc: (e, a) => `${e} surpassed 10-transaction hourly velocity. Amount: ${a} in 60 min`,
    severity: "critical",
  },
  {
    title: "Entity Match — Interpol Link",
    desc: (e, _, c) => `Possible name match for ${e} on Interpol financial crimes watchlist (${c})`,
    severity: "critical",
  },
  {
    title: "Round-Amount Cluster",
    desc: (e, a) => `${e}: 6 transactions of exactly ${a} to separate shell accounts`,
    severity: "medium",
  },
  {
    title: "Trade Invoice Mismatch",
    desc: (e, a, c) => `${e}: Letter of Credit ${a} — declared vs market value discrepancy +340% from ${c}`,
    severity: "medium",
  },
  {
    title: "New Account Rapid Funding",
    desc: (e, a) => `New account under ${e} received ${a} within 48hrs of opening — no business rationale`,
    severity: "high",
  },
  {
    title: "OFAC Screening Hit",
    desc: (e, _, c) => `Fuzzy match: ${e} vs OFAC SDN list entity in ${c} — investigation required`,
    severity: "critical",
  },
];

const ENTITY_NAMES = [
  "Elena Petrov", "James Morgan", "Chen Volkov", "Aisha Al-Rashid",
  "Ivan Schmidt", "Fatima Santos", "Carlos Kim", "Priya Mueller",
  "Robert Tanaka", "Maria Ibrahim", "Thomas Patel", "Yuki Garcia",
];
const COUNTRIES = ["BVI", "CY", "PA", "BS", "KY", "RU", "SG", "HK", "AE", "LU"];
const CURRENCIES = ["USD", "EUR", "GBP", "BTC", "ETH"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function formatAmount(n: number, currency: string) {
  if (currency === "BTC") return `${(n / 50000).toFixed(2)} BTC`;
  if (currency === "ETH") return `${(n / 3000).toFixed(1)} ETH`;
  return `$${n.toLocaleString()}`;
}

function generateFeedItem(index: number): LiveFeedItem {
  const template = randomFrom(FEED_TEMPLATES);
  const entity = randomFrom(ENTITY_NAMES);
  const amount = randomBetween(15000, 4500000);
  const currency = randomFrom(CURRENCIES);
  const country = randomFrom(COUNTRIES);
  return {
    id: `FEED-${Date.now()}-${index}`,
    source: randomFrom(MONITORING_SOURCES),
    title: template.title,
    description: template.desc(entity, formatAmount(amount, currency), country),
    severity: template.severity,
    timestamp: new Date(),
    entityName: entity,
    amount,
    currency,
    country,
    read: false,
  };
}

// Seed 6 initial feed items (slightly aged)
function seedFeed(): LiveFeedItem[] {
  return Array.from({ length: 6 }, (_, i) => ({
    ...generateFeedItem(i),
    timestamp: new Date(Date.now() - (6 - i) * 45_000),
    read: i > 3,
  }));
}

// ─── Context ───────────────────────────────────────────────────────────────────

export interface SARDataStats {
  totalFlagged: number;
  highRiskCustomers: number;
  expiredKYC: number;
  sarsByStatus: { status: string; count: number; color: string }[];
  typologyBreakdown: { name: string; value: number; color: string }[];
  geoBreakdown: { country: string; transactions: number }[];
  riskDistribution: { name: string; value: number; color: string }[];
  weeklyTrend: { day: string; sars: number; txns: number }[];
  totalAmountFlagged: number;
  avgRiskScore: number;
}

export type InvestigationSource =
  | "flagged_clusters"
  | "sar_generate"
  | "risk_graph"
  | "search";

export interface InvestigationPipelineModule {
  layer: number;
  title: string;
  detail: string;
  outcome: string;
  evidence: string[];
}

export interface InvestigationPipelineReport {
  entityId: string;
  generatedAt: string;
  suspiciousTxnCount: number;
  totalSuspiciousAmount: number;
  modules: InvestigationPipelineModule[];
}

export interface InvestigationRecord {
  entityId: string;
  firstInvestigatedAt: string;
  lastInvestigatedAt: string;
  source: InvestigationSource;
  investigations: number;
  status: "active" | "sar_generated" | "filed";
  latestSarId?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Away" | "Disabled";
  createdAt: string;
}

const INITIAL_SYSTEM_USERS: SystemUser[] = [
  {
    id: "USR-0001",
    name: "J. Morrison",
    email: "j.morrison@barclays.com",
    role: "Senior Analyst",
    status: "Active",
    createdAt: "2026-01-10",
  },
  {
    id: "USR-0002",
    name: "S. Chen",
    email: "s.chen@barclays.com",
    role: "Analyst",
    status: "Active",
    createdAt: "2026-01-11",
  },
  {
    id: "USR-0003",
    name: "A. Petrov",
    email: "a.petrov@barclays.com",
    role: "Compliance Officer",
    status: "Active",
    createdAt: "2026-01-08",
  },
  {
    id: "USR-0004",
    name: "M. Garcia",
    email: "m.garcia@barclays.com",
    role: "Analyst",
    status: "Active",
    createdAt: "2026-01-14",
  },
  {
    id: "USR-0005",
    name: "R. Kim",
    email: "r.kim@barclays.com",
    role: "Senior Analyst",
    status: "Away",
    createdAt: "2026-01-16",
  },
];

interface SARDataContextValue {
  sarReports: SARReport[];
  transactions: Transaction[];
  customers: Customer[];
  // SAR actions
  addSAR: (sar: Partial<SARReport> & { customerName: string; customerId: string }) => string;
  approveSAR: (id: string, approver: string) => void;
  rejectSAR: (id: string, reason: string) => void;
  updateSARStatus: (id: string, status: SARStatus) => void;
  // Transaction actions
  addTransaction: (t: Omit<Transaction, "id">) => void;
  // Cluster management
  resolvedClusters: string[];
  resolveCluster: (clusterId: string) => void;
  // Investigation state
  activeInvestigationEntity: string | null;
  investigations: InvestigationRecord[];
  pipelinesByEntity: Record<string, InvestigationPipelineReport>;
  highlightedEntities: string[];
  beginInvestigation: (entityId: string, source?: InvestigationSource) => void;
  completeInvestigationSAR: (
    entityId: string,
    sarId: string,
    pipeline?: InvestigationPipelineReport
  ) => void;
  // Threat intelligence
  threats: DetectedThreat[];
  threatSummary: ThreatSummary;
  // User management
  systemUsers: SystemUser[];
  addSystemUser: (user: Omit<SystemUser, "id" | "createdAt">) => string;
  // Live feed
  liveFeed: LiveFeedItem[];
  unreadFeedCount: number;
  markFeedRead: () => void;
  // Derived stats (auto-updated)
  stats: SARDataStats;
}

const TYPOLOGY_LABELS: Record<string, string> = {
  structuring: "Structuring",
  round_amounts: "Round Amounts",
  cross_border: "Cross-Border",
  crypto: "Crypto Laundering",
  high_value: "High Value",
  smurfing: "Smurfing",
  trade_based: "Trade-Based ML",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--muted-foreground))",
  review: "hsl(var(--risk-medium))",
  approved: "hsl(var(--primary))",
  filed: "hsl(var(--success))",
};

const TYPOLOGY_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--risk-medium))",
  "hsl(var(--risk-high))",
];

function computeStats(
  txns: Transaction[],
  sars: SARReport[],
  custs: Customer[]
): SARDataStats {
  const flagged = txns.filter((t) => t.status === "flagged" || t.status === "under_review");

  // Typology breakdown
  const typoCount: Record<string, number> = {};
  flagged.forEach((t) => {
    if (t.flagType) typoCount[t.flagType] = (typoCount[t.flagType] || 0) + 1;
  });
  const typoTotal = Object.values(typoCount).reduce((s, v) => s + v, 0) || 1;
  const typologyBreakdown = Object.entries(typoCount)
    .sort((a, b) => b[1] - a[1])
    .map(([key, cnt], i) => ({
      name: TYPOLOGY_LABELS[key] || key,
      value: Math.round((cnt / typoTotal) * 100),
      color: TYPOLOGY_COLORS[i % TYPOLOGY_COLORS.length],
    }));

  // Geo breakdown
  const geoCount: Record<string, number> = {};
  flagged.forEach((t) => { geoCount[t.country] = (geoCount[t.country] || 0) + 1; });
  const geoBreakdown = Object.entries(geoCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, transactions: count }));

  // SARs by status
  const statusCount: Record<string, number> = {};
  sars.forEach((s) => { statusCount[s.status] = (statusCount[s.status] || 0) + 1; });
  const sarsByStatus = Object.entries(statusCount).map(([status, count]) => ({
    status, count, color: STATUS_COLORS[status] || "hsl(var(--muted-foreground))",
  }));

  // Risk distribution
  const high = txns.filter((t) => t.riskScore >= 75).length;
  const medium = txns.filter((t) => t.riskScore >= 45 && t.riskScore < 75).length;
  const low = txns.filter((t) => t.riskScore < 45).length;
  const total = txns.length || 1;
  const riskDistribution = [
    { name: "High Risk", value: Math.round((high / total) * 100), color: "hsl(var(--risk-high))" },
    { name: "Medium Risk", value: Math.round((medium / total) * 100), color: "hsl(var(--risk-medium))" },
    { name: "Low Risk", value: Math.round((low / total) * 100), color: "hsl(var(--risk-low))" },
  ];

  // Weekly trend (last 7 days)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyTrend = days.map((day, i) => {
    const cutStart = new Date(); cutStart.setDate(cutStart.getDate() - 6 + i);
    const cutEnd = new Date(cutStart); cutEnd.setDate(cutEnd.getDate() + 1);
    const dayTxns = txns.filter((t) => {
      const d = new Date(t.date);
      return d >= cutStart && d < cutEnd;
    });
    const daySars = sars.filter((s) => {
      const d = new Date(s.createdAt);
      return d >= cutStart && d < cutEnd;
    });
    return { day, sars: daySars.length, txns: dayTxns.length };
  });

  return {
    totalFlagged: flagged.length,
    highRiskCustomers: custs.filter((c) => c.riskRating === "high").length,
    expiredKYC: custs.filter((c) => c.kycStatus === "expired").length,
    sarsByStatus,
    typologyBreakdown,
    geoBreakdown,
    riskDistribution,
    weeklyTrend,
    totalAmountFlagged: flagged.reduce((s, t) => s + t.amount, 0),
    avgRiskScore: Math.round(txns.reduce((s, t) => s + t.riskScore, 0) / total),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const SARDataContext = createContext<SARDataContextValue>({} as SARDataContextValue);

let _sarCounter = seedSARs.length + 1;
let _txnCounter = seedTransactions.length + 1;
let _userCounter = INITIAL_SYSTEM_USERS.length + 1;

export function SARDataProvider({ children }: { children: ReactNode }) {
  const csvLiveFeed = useCsvLiveFeed(24);
  const customers = useMemo(() => seedCustomers, []);
  const [sarReports, setSARReports] = useState<SARReport[]>([...seedSARs]);
  const [transactions, setTransactions] = useState<Transaction[]>([...seedTransactions]);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>(seedFeed);
  const [resolvedClusters, setResolvedClusters] = useState<string[]>([]);
  const [activeInvestigationEntity, setActiveInvestigationEntity] = useState<string | null>(null);
  const [investigations, setInvestigations] = useState<InvestigationRecord[]>([]);
  const [pipelinesByEntity, setPipelinesByEntity] = useState<Record<string, InvestigationPipelineReport>>({});
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(INITIAL_SYSTEM_USERS);

  // Keep the live feed tied to CSV inputs as they stream through the hook.
  useEffect(() => {
    if (csvLiveFeed.length > 0) {
      setLiveFeed(csvLiveFeed);
    }
  }, [csvLiveFeed]);

  // Actions
  const addSAR = useCallback(
    (partial: Partial<SARReport> & { customerName: string; customerId: string }): string => {
      const id = `SAR-${String(2026000 + 4891 + _sarCounter++)}`;
      const now = new Date().toISOString().split("T")[0];
      const newSAR: SARReport = {
        id,
        transactionIds: [],
        status: "review",
        createdAt: now,
        updatedAt: now,
        assignedTo: "J. Morrison",
        confidenceScore: randomBetween(78, 96),
        modelUsed: "Claude Sonnet 3.5",
        promptVersion: "v3.2.1",
        daysRemaining: 7,
        priority: "high",
        narrative:
          "AI-generated narrative pending review. Subject entity has been flagged for suspicious activity patterns matching FATF typologies.",
        riskBreakdown: [
          { label: "Structuring", value: randomBetween(70, 98) },
          { label: "Layering", value: randomBetween(60, 95) },
          { label: "Jurisdiction", value: randomBetween(50, 90) },
        ],
        triggerRules: [
          { id: "R-101", name: "Structuring below $10K threshold", confidence: randomBetween(80, 98) },
          { id: "R-204", name: "Rapid movement to offshore entity", confidence: randomBetween(75, 94) },
        ],
        evidenceAnchors: ["Transaction pattern analysis", "KYC deviation report"],
        timelineEvents: [
          { date: now, event: "Case created from network graph investigation" },
          { date: now, event: "AI narrative generation initiated" },
        ],
        ...partial,
      };
      setSARReports((prev) => [newSAR, ...prev]);
      return id;
    },
    []
  );

  const approveSAR = useCallback((id: string, approver: string) => {
    setSARReports((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "approved" as SARStatus,
              updatedAt: new Date().toISOString().split("T")[0],
              assignedTo: approver,
              timelineEvents: [
                ...(s.timelineEvents || []),
                { date: new Date().toISOString().split("T")[0], event: `Approved by ${approver}` },
              ],
            }
          : s
      )
    );
    setInvestigations((prev) =>
      prev.map((i) =>
        i.latestSarId === id
          ? {
              ...i,
              status: "sar_generated",
            }
          : i
      )
    );
  }, []);

  const rejectSAR = useCallback((id: string, reason: string) => {
    setSARReports((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "draft" as SARStatus,
              updatedAt: new Date().toISOString().split("T")[0],
              timelineEvents: [
                ...(s.timelineEvents || []),
                {
                  date: new Date().toISOString().split("T")[0],
                  event: `Returned for revision: ${reason}`,
                },
              ],
            }
          : s
      )
    );
  }, []);

  const updateSARStatus = useCallback((id: string, status: SARStatus) => {
    setSARReports((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status, updatedAt: new Date().toISOString().split("T")[0] }
          : s
      )
    );
    if (status === "filed") {
      setInvestigations((prev) =>
        prev.map((i) =>
          i.latestSarId === id
            ? {
                ...i,
                status: "filed",
              }
            : i
        )
      );
    }
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, "id">) => {
    const id = `TXN-${String(_txnCounter++).padStart(6, "0")}`;
    setTransactions((prev) => [{ id, ...t }, ...prev]);
  }, []);

  const resolveCluster = useCallback((clusterId: string) => {
    setResolvedClusters((prev) =>
      prev.includes(clusterId) ? prev : [...prev, clusterId]
    );
  }, []);

  const beginInvestigation = useCallback(
    (entityId: string, source: InvestigationSource = "flagged_clusters") => {
      const now = new Date().toISOString();
      setActiveInvestigationEntity(entityId);
      setInvestigations((prev) => {
        const existing = prev.find((i) => i.entityId === entityId);
        if (!existing) {
          return [
            {
              entityId,
              firstInvestigatedAt: now,
              lastInvestigatedAt: now,
              source,
              investigations: 1,
              status: "active",
            },
            ...prev,
          ];
        }
        return prev.map((i) =>
          i.entityId === entityId
            ? {
                ...i,
                source,
                lastInvestigatedAt: now,
                investigations: i.investigations + 1,
                status: i.status === "filed" ? "filed" : "active",
              }
            : i
        );
      });
    },
    []
  );

  const completeInvestigationSAR = useCallback(
    (
      entityId: string,
      sarId: string,
      pipeline?: InvestigationPipelineReport
    ) => {
      const now = new Date().toISOString();
      setActiveInvestigationEntity(entityId);
      setInvestigations((prev) => {
        const existing = prev.find((i) => i.entityId === entityId);
        if (!existing) {
          return [
            {
              entityId,
              firstInvestigatedAt: now,
              lastInvestigatedAt: now,
              source: "sar_generate",
              investigations: 1,
              status: "sar_generated",
              latestSarId: sarId,
            },
            ...prev,
          ];
        }
        return prev.map((i) =>
          i.entityId === entityId
            ? {
                ...i,
                lastInvestigatedAt: now,
                latestSarId: sarId,
                status: "sar_generated",
              }
            : i
        );
      });
      if (pipeline) {
        setPipelinesByEntity((prev) => ({
          ...prev,
          [entityId]: pipeline,
        }));
      }
    },
    []
  );

  const addSystemUser = useCallback((user: Omit<SystemUser, "id" | "createdAt">): string => {
    const id = `USR-${String(_userCounter++).padStart(4, "0")}`;
    const createdAt = new Date().toISOString().split("T")[0];
    const nextUser: SystemUser = {
      ...user,
      id,
      createdAt,
    };
    setSystemUsers((prev) => [nextUser, ...prev]);
    return id;
  }, []);

  const markFeedRead = useCallback(() => {
    setLiveFeed((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const threats = useMemo(
    () => detectAllThreatsFromData(transactions, customers),
    [transactions, customers]
  );

  const threatSummary = useMemo(() => summarizeThreats(threats), [threats]);

  const highlightedEntities = useMemo(() => {
    const ids = new Set(investigations.map((i) => i.entityId));
    if (activeInvestigationEntity) ids.add(activeInvestigationEntity);
    return [...ids];
  }, [investigations, activeInvestigationEntity]);

  const unreadFeedCount = useMemo(
    () => liveFeed.filter((i) => !i.read).length,
    [liveFeed]
  );

  const stats = useMemo(
    () => computeStats(transactions, sarReports, customers),
    [transactions, sarReports, customers]
  );

  return (
    <SARDataContext.Provider
      value={{
        sarReports,
        transactions,
        customers,
        addSAR,
        approveSAR,
        rejectSAR,
        updateSARStatus,
        addTransaction,
        resolvedClusters,
        resolveCluster,
        activeInvestigationEntity,
        investigations,
        pipelinesByEntity,
        highlightedEntities,
        beginInvestigation,
        completeInvestigationSAR,
        threats,
        threatSummary,
        systemUsers,
        addSystemUser,
        liveFeed,
        unreadFeedCount,
        markFeedRead,
        stats,
      }}
    >
      {children}
    </SARDataContext.Provider>
  );
}

export function useSARData() {
  return useContext(SARDataContext);
}
