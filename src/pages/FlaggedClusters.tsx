import { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, ArrowRight, Users, DollarSign, Globe, FileText,
  CheckCircle, ChevronLeft, ChevronRight, Radio, ShieldOff,
} from "lucide-react";
import { useSARData } from "@/context/SARDataContext";
import { useLocation, useNavigate } from "react-router-dom";
import type { FlagType } from "@/data/synthetic";
import { cn } from "@/lib/utils";

const FLAG_META: Record<FlagType, { label: string; color: string }> = {
  structuring:  { label: "Structuring",     color: "bg-destructive/15 text-destructive" },
  round_amounts:{ label: "Round Amounts",   color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  cross_border: { label: "Cross-Border",    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  crypto:       { label: "Crypto ML",       color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  high_value:   { label: "High Value",      color: "bg-rose-500/15 text-rose-700 dark:text-rose-400" },
  smurfing:     { label: "Smurfing",        color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  trade_based:  { label: "Trade-Based ML",  color: "bg-teal-500/15 text-teal-700 dark:text-teal-400" },
};

const PAGE_SIZE = 50;

interface Cluster {
  clusterId: string;
  customerName: string;
  txns: ReturnType<typeof buildTxnList>[number][];
  totalAmount: number;
  maxRisk: number;
  flagTypes: FlagType[];
  countries: string[];
  isNew: boolean;
  latestDate: string;
}

type TxnItem = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: string;
  riskScore: number;
  flagType?: FlagType;
  country: string;
  date: string;
};

type FocusState = {
  focusClusterId?: string;
  focusTransactionId?: string;
  flow?: {
    customerName?: string;
    amount?: number;
    riskScore?: number;
    fromCountry?: string;
    toCountry?: string;
    flagType?: string;
    date?: string;
    txId?: string;
    clusterId?: string;
  };
};

function buildTxnList(transactions: ReturnType<typeof useSARData>["transactions"]) {
  return transactions;
}

export default function FlaggedClusters() {
  const navigate = useNavigate();
  const location = useLocation();
  const focusState = (location.state as FocusState | null) || null;
  const focusedClusterId = focusState?.focusClusterId;
  const {
    transactions,
    resolvedClusters,
    resolveCluster,
    beginInvestigation,
    activeInvestigationEntity,
  } = useSARData();

  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<FlagType | "all">("all");
  const [newClusterIds, setNewClusterIds] = useState<Set<string>>(new Set());
  const initialClusterIds = useRef<Set<string> | null>(null);

  // Build clusters from context transactions (flagged + under_review only)
  const allClusters = useMemo((): Cluster[] => {
    const suspicious = transactions.filter(
      (t) => t.status === "flagged" || t.status === "under_review"
    );
    const grouped: Record<string, typeof suspicious> = {};
    for (const t of suspicious) {
      if (!grouped[t.customerId]) grouped[t.customerId] = [];
      grouped[t.customerId].push(t);
    }
    return Object.entries(grouped)
      .map(([custId, txns]) => {
        const totalAmount = txns.reduce((s, t) => s + t.amount, 0);
        const maxRisk = Math.max(...txns.map((t) => t.riskScore));
        const flagTypes = [...new Set(txns.map((t) => t.flagType).filter(Boolean))] as FlagType[];
        const countries = [...new Set(txns.map((t) => t.country))];
        const latestDate = txns.reduce((a, b) => (a.date > b.date ? a : b)).date;
        return {
          clusterId: custId,
          customerName: txns[0].customerName,
          txns,
          totalAmount,
          maxRisk,
          flagTypes,
          countries,
          isNew: false, // filled below
          latestDate,
        };
      })
      .sort((a, b) => b.maxRisk - a.maxRisk);
  }, [transactions]);

  // Track new cluster IDs that appear after mount
  useEffect(() => {
    if (initialClusterIds.current === null) {
      // First render — record baseline
      initialClusterIds.current = new Set(allClusters.map((c) => c.clusterId));
      return;
    }
    const incoming = allClusters
      .map((c) => c.clusterId)
      .filter((id) => !initialClusterIds.current!.has(id));
    if (incoming.length > 0) {
      setNewClusterIds((prev) => new Set([...prev, ...incoming]));
      incoming.forEach((id) => initialClusterIds.current!.add(id));
      // Remove "new" badge after 90 seconds
      const t = setTimeout(() => {
        setNewClusterIds((prev) => {
          const next = new Set(prev);
          incoming.forEach((id) => next.delete(id));
          return next;
        });
      }, 90_000);
      return () => clearTimeout(t);
    }
  }, [allClusters]);

  // Filter by type
  const filteredClusters = useMemo(() => {
    let list = allClusters.filter((c) => !resolvedClusters.includes(c.clusterId));
    if (filterType !== "all") list = list.filter((c) => c.flagTypes.includes(filterType));
    return list;
  }, [allClusters, resolvedClusters, filterType]);

  const totalPages = Math.ceil(filteredClusters.length / PAGE_SIZE);
  const paged = filteredClusters.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const newCount = filteredClusters.filter((c) => newClusterIds.has(c.clusterId)).length;
  const criticalCount = filteredClusters.filter((c) => c.maxRisk >= 80).length;

  // Typology counts for filter bar
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<FlagType, number>> = {};
    for (const c of filteredClusters) {
      for (const ft of c.flagTypes) {
        counts[ft] = (counts[ft] ?? 0) + 1;
      }
    }
    return counts;
  }, [filteredClusters]);

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flagged Transaction Clusters</h1>
          <p className="text-sm text-muted-foreground">
            {filteredClusters.length} active clusters ·{" "}
            {filteredClusters.reduce((s, c) => s + c.txns.length, 0)} suspicious transactions ·{" "}
            {resolvedClusters.length} resolved
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {newCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
              <Radio className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{newCount} new</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-medium text-destructive">{criticalCount} critical</span>
          </div>
        </div>
      </div>

      {focusState?.flow && (
        <Card className="border-primary/40 bg-primary/5 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Focused Suspicious Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] text-muted-foreground">Customer</p>
                <p className="font-medium text-foreground mt-0.5">{focusState.flow.customerName || "Unknown"}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] text-muted-foreground">Flow</p>
                <p className="font-medium text-foreground mt-0.5">
                  {focusState.flow.fromCountry || "Unknown"} → {focusState.flow.toCountry || "Unknown"}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] text-muted-foreground">Risk / Amount</p>
                <p className="font-medium text-foreground mt-0.5">
                  {focusState.flow.riskScore ?? "-"} · ${(((focusState.flow.amount || 0) as number) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] text-muted-foreground">Transaction ID</p>
                <p className="font-medium text-foreground mt-0.5 font-mono">{focusState.flow.txId || "Unknown"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  if (!focusedClusterId) return;
                  beginInvestigation(focusedClusterId, "flagged_clusters");
                  navigate(`/risk-graph?entity=${encodeURIComponent(focusedClusterId)}`);
                }}
                disabled={!focusedClusterId}
              >
                <Users className="w-3.5 h-3.5" />
                Investigate in Entity Mapping
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => navigate("/flagged", { replace: true })}
              >
                Clear Focus
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Typology filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setFilterType("all"); setPage(0); }}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
            filterType === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
          )}
        >
          All ({filteredClusters.length})
        </button>
        {(Object.keys(FLAG_META) as FlagType[]).map((ft) => {
          const count = typeCounts[ft] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={ft}
              onClick={() => { setFilterType(ft); setPage(0); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                filterType === ft
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              )}
            >
              {FLAG_META[ft].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Cluster cards grid */}
      {paged.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-3" />
            <p className="text-sm font-medium text-foreground">No active flagged clusters</p>
            <p className="text-xs text-muted-foreground mt-1">
              All suspicious activity has been resolved or no new clusters detected yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map((cluster) => {
            const isNew = newClusterIds.has(cluster.clusterId);
            const riskLevel =
              cluster.maxRisk >= 80 ? "high" :
              cluster.maxRisk >= 50 ? "medium" : "low";
            return (
              <Card
                key={cluster.clusterId}
                className={cn(
                  "shadow-card hover:shadow-elevated transition-all border-l-4",
                  riskLevel === "high" && "border-l-destructive",
                  riskLevel === "medium" && "border-l-risk-medium",
                  riskLevel === "low" && "border-l-risk-low",
                  isNew && "ring-2 ring-primary/40",
                  activeInvestigationEntity === cluster.clusterId && "ring-2 ring-primary border-primary/40",
                  focusedClusterId === cluster.clusterId && "ring-2 ring-primary border-primary/50 bg-primary/5"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CardTitle className="text-sm font-semibold truncate">
                          {cluster.customerName}
                        </CardTitle>
                        {isNew && (
                          <Badge className="text-[9px] bg-primary text-primary-foreground animate-pulse shrink-0">
                            NEW
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {cluster.clusterId} · {cluster.latestDate}
                      </p>
                    </div>
                    <Badge
                      variant={riskLevel === "high" ? "riskHigh" : riskLevel === "medium" ? "riskMedium" : "riskLow"}
                      className="text-[10px] shrink-0"
                    >
                      {cluster.maxRisk}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{cluster.txns.length} txns</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      <span>${(cluster.totalAmount / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span>{cluster.countries.length} ctry</span>
                    </div>
                  </div>

                  {/* Flag type chips */}
                  <div className="flex flex-wrap gap-1">
                    {cluster.flagTypes.slice(0, 4).map((ft) => (
                      <span
                        key={ft}
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                          FLAG_META[ft].color
                        )}
                      >
                        {FLAG_META[ft].label}
                      </span>
                    ))}
                  </div>

                  {/* Country list */}
                  {cluster.countries.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cluster.countries.slice(0, 5).map((c) => (
                        <span key={c} className="text-[9px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          {c}
                        </span>
                      ))}
                      {cluster.countries.length > 5 && (
                        <span className="text-[9px] text-muted-foreground">+{cluster.countries.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Risk score bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Max Risk Score</span>
                      <span className="font-mono font-semibold">{cluster.maxRisk}/100</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          cluster.maxRisk >= 80 ? "bg-destructive" :
                          cluster.maxRisk >= 50 ? "bg-risk-medium" : "bg-risk-low"
                        )}
                        style={{ width: `${cluster.maxRisk}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => resolveCluster(cluster.clusterId)}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        beginInvestigation(cluster.clusterId, "flagged_clusters");
                        navigate(`/risk-graph?entity=${encodeURIComponent(cluster.clusterId)}`);
                      }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Investigate
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination + summary */}
      {filteredClusters.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredClusters.length)} of{" "}
            {filteredClusters.length} clusters (max {PAGE_SIZE} per page)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page + 1} / {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
