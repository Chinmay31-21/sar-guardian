import { useState, useEffect, useCallback, useRef } from "react";
import {
  loadAllCsvData,
  type AllCsvData,
  type CsvTransaction,
  type ExternalRiskItem,
} from "@/lib/csvLoader";
import type { LiveFeedItem, FeedSeverity } from "@/context/SARDataContext";

// ─── Module-level cache (single fetch across all hook consumers) ───────────────
let _promise: Promise<AllCsvData> | null = null;
let _cache: AllCsvData | null = null;

function getOrFetch(): Promise<AllCsvData> {
  if (!_promise) {
    _promise = loadAllCsvData().then((data) => {
      _cache = data;
      return data;
    });
  }
  return _promise;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UseCSVDataResult {
  data: AllCsvData | null;
  isLoading: boolean;
  error: string | null;
}

export function useCSVData(): UseCSVDataResult {
  const [data, setData] = useState<AllCsvData | null>(_cache);
  const [isLoading, setIsLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cache) { setData(_cache); setIsLoading(false); return; }
    let cancelled = false;
    getOrFetch()
      .then((d) => { if (!cancelled) { setData(d); setIsLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e)); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return { data, isLoading, error };
}

// ─── Live CSV Feed simulation ──────────────────────────────────────────────────
// Returns a live feed that drip-feeds real suspicious transactions from the CSV.

const CSV_SOURCES = [
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

function riskForTransaction(t: CsvTransaction, ext: ExternalRiskItem[]): FeedSeverity {
  const extScore = ext.find((e) => e.entity === t.sender_account || e.entity === t.receiver_account);
  if (extScore && extScore.risk_score >= 0.8) return "critical";
  if (t.is_high_risk_country && t.is_suspicious && t.amount > 50000) return "critical";
  if (t.is_suspicious && t.is_high_risk_country) return "high";
  if (t.is_suspicious) return "medium";
  return "low";
}

function csvTxnToFeedItem(t: CsvTransaction, ext: ExternalRiskItem[], idx: number): LiveFeedItem {
  const extEntry = ext.find((e) => e.entity === t.sender_account);
  const severity = riskForTransaction(t, ext);
  const patterns: Record<string, string> = {
    structuring: "Structuring pattern detected — multiple sub-threshold deposits",
    smurfing: "Smurfing pattern — distributed deposits from multiple accounts",
    round_amount: "Round-amount cluster — possible CTR avoidance strategy",
    cross_border: "Cross-border wire flagged — high-risk jurisdiction routing",
    layering: "Layering pattern — rapid re-movement of funds through intermediaries",
    normal: "Anomalous transaction volume relative to account baseline",
  };
  const title =
    severity === "critical"
      ? "Critical AML Screening Hit"
      : severity === "high"
      ? "High-Risk Transaction Flagged"
      : "Suspicious Activity Detected";
  const desc = extEntry
    ? `${t.sender_account}: ${extEntry.description} — $${t.amount.toLocaleString()} ${t.type} to ${t.country}`
    : `${t.sender_account} → ${t.receiver_account}: $${t.amount.toLocaleString()} ${t.type} in ${t.country}. ${patterns[t.pattern] ?? patterns.normal}`;

  return {
    id: `CSV-${t.transaction_id}-${idx}`,
    source: CSV_SOURCES[idx % CSV_SOURCES.length],
    title,
    description: desc,
    severity,
    timestamp: new Date(t.timestamp),
    entityName: t.sender_account,
    amount: t.amount,
    currency: "USD",
    country: t.country,
    read: false,
  };
}

/**
 * Provides a live feed seeded from real CSV suspicious transactions.
 * After data loads, drip-feeds new items every 8-15 seconds.
 */
export function useCsvLiveFeed(maxItems = 30): LiveFeedItem[] {
  const [feed, setFeed] = useState<LiveFeedItem[]>([]);
  const idxRef = useRef(0);
  const { data } = useCSVData();

  // Seed initial feed when data loads
  useEffect(() => {
    if (!data) return;
    const suspicious = data.transactions.filter((t) => t.is_suspicious && t.is_high_risk_country);
    const seed = suspicious
      .slice(0, 8)
      .map((t, i) => ({
        ...csvTxnToFeedItem(t, data.externalRisk, i),
        timestamp: new Date(Date.now() - (8 - i) * 40_000),
        read: i > 4,
      }));
    setFeed(seed);
    idxRef.current = 8;
  }, [data]);

  // Drip-feed new items
  useEffect(() => {
    if (!data) return;
    const suspicious = data.transactions.filter((t) => t.is_suspicious);

    const schedule = () => {
      const delay = 8_000 + Math.random() * 7_000;
      return setTimeout(() => {
        const t = suspicious[idxRef.current % suspicious.length];
        idxRef.current++;
        setFeed((prev) => {
          const item = csvTxnToFeedItem(t, data.externalRisk, idxRef.current);
          return [item, ...prev].slice(0, maxItems);
        });
        timerRef = schedule();
      }, delay);
    };
    let timerRef = schedule();
    return () => clearTimeout(timerRef);
  }, [data, maxItems]);

  return feed;
}
