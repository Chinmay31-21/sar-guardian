import {
  transactions as seedTransactions,
  customers as seedCustomers,
  type Transaction,
  type Customer,
} from "@/data/synthetic";

export type ThreatSeverity = "critical" | "high" | "medium" | "low";

export interface DetectedThreat {
  id: string;
  type: "structuring" | "jurisdiction" | "velocity" | "kyc" | "smurfing" | "crypto" | "trade";
  severity: ThreatSeverity;
  title: string;
  description: string;
  affectedCustomer?: string;
  customerId?: string;
  transactionIds: string[];
  amount?: number;
  country?: string;
  riskScore: number;
}

export interface ThreatSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  totalAmountAtRisk: number;
}

const HIGH_RISK_COUNTRIES = new Set(["BVI", "CY", "PA", "BS", "KY", "LU", "MT", "RU"]);

function groupByCustomer(txns: Transaction[]): Record<string, Transaction[]> {
  return txns.reduce<Record<string, Transaction[]>>((acc, t) => {
    if (!acc[t.customerId]) acc[t.customerId] = [];
    acc[t.customerId].push(t);
    return acc;
  }, {});
}

function getCustomerById(customers: Customer[], customerId: string): Customer | undefined {
  return customers.find((c) => c.id === customerId);
}

function detectStructuring(transactions: Transaction[], customers: Customer[]): DetectedThreat[] {
  const structuringTxns = transactions.filter(
    (t) => t.amount >= 8000 && t.amount < 10000 && t.flagType === "structuring"
  );
  const grouped = groupByCustomer(structuringTxns);

  return Object.entries(grouped)
    .filter(([, txns]) => txns.length >= 2)
    .slice(0, 4)
    .map(([custId, txns]) => {
      const customer = getCustomerById(customers, custId);
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return {
        id: `THR-STR-${custId}`,
        type: "structuring" as const,
        severity: txns.length >= 4 ? ("critical" as const) : ("high" as const),
        title: "Structuring - CTR Threshold Evasion",
        description: `${txns.length} deposits between $8,000-$9,999 for ${customer?.name || custId}. Total: $${total.toLocaleString()}. Pattern matches FinCEN rule R-101.`,
        affectedCustomer: customer?.name,
        customerId: custId,
        transactionIds: txns.map((t) => t.id),
        amount: total,
        riskScore: Math.min(98, 72 + txns.length * 4),
      };
    });
}

function detectHighRiskJurisdiction(transactions: Transaction[]): DetectedThreat[] {
  const risky = transactions.filter(
    (t) => HIGH_RISK_COUNTRIES.has(t.country) && t.amount > 80000 && t.riskScore > 70
  );
  const grouped = risky.reduce<Record<string, Transaction[]>>((acc, t) => {
    if (!acc[t.country]) acc[t.country] = [];
    acc[t.country].push(t);
    return acc;
  }, {});

  return Object.entries(grouped)
    .slice(0, 4)
    .map(([country, txns]) => {
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return {
        id: `THR-JUR-${country}`,
        type: "jurisdiction" as const,
        severity: "high" as const,
        title: `Offshore Flow - ${country} (FATF High-Risk)`,
        description: `${txns.length} wire transfers totalling $${(total / 1_000_000).toFixed(2)}M routed to ${country}. Jurisdiction flagged under FATF grey list / EU 6AMLD.`,
        transactionIds: txns.slice(0, 6).map((t) => t.id),
        amount: total,
        country,
        riskScore: 88,
      };
    });
}

function detectVelocity(transactions: Transaction[], customers: Customer[]): DetectedThreat[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const recent = transactions.filter((t) => new Date(t.date) >= cutoff);
  const grouped = groupByCustomer(recent);

  return Object.entries(grouped)
    .filter(([, txns]) => txns.length >= 8)
    .slice(0, 3)
    .map(([custId, txns]) => {
      const customer = getCustomerById(customers, custId);
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return {
        id: `THR-VEL-${custId}`,
        type: "velocity" as const,
        severity: txns.length >= 12 ? ("critical" as const) : ("high" as const),
        title: "Transaction Velocity Anomaly",
        description: `${customer?.name || custId} executed ${txns.length} transactions in 14 days ($${total.toLocaleString()}). Significantly exceeds peer-group baseline - potential layering.`,
        affectedCustomer: customer?.name,
        customerId: custId,
        transactionIds: txns.slice(0, 6).map((t) => t.id),
        amount: total,
        riskScore: Math.min(97, 65 + txns.length * 2),
      };
    });
}

function detectKYCExpiredActivity(transactions: Transaction[], customers: Customer[]): DetectedThreat[] {
  const expiredHighRisk = customers.filter(
    (c) => c.kycStatus === "expired" && c.riskRating === "high"
  );

  return expiredHighRisk
    .map((customer) => {
      const custTxns = transactions.filter(
        (t) => t.customerId === customer.id && t.riskScore > 65
      );
      if (!custTxns.length) return null;
      const total = custTxns.reduce((s, t) => s + t.amount, 0);
      return {
        id: `THR-KYC-${customer.id}`,
        type: "kyc" as const,
        severity: "high" as const,
        title: "KYC Expired - Active High-Risk Account",
        description: `KYC lapsed for ${customer.name} (${customer.businessType}). ${custTxns.length} high-risk transaction(s) totalling $${total.toLocaleString()} recorded with no renewal on file.`,
        affectedCustomer: customer.name,
        customerId: customer.id,
        transactionIds: custTxns.slice(0, 4).map((t) => t.id),
        amount: total,
        riskScore: 92,
      };
    })
    .filter(Boolean)
    .slice(0, 3) as DetectedThreat[];
}

function detectSmurfing(transactions: Transaction[], customers: Customer[]): DetectedThreat[] {
  const smurfTxns = transactions.filter(
    (t) => t.flagType === "smurfing" || t.flagType === "round_amounts"
  );
  const grouped = groupByCustomer(smurfTxns);

  return Object.entries(grouped)
    .filter(([, txns]) => txns.length >= 2)
    .slice(0, 3)
    .map(([custId, txns]) => {
      const customer = getCustomerById(customers, custId);
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return {
        id: `THR-SMR-${custId}`,
        type: "smurfing" as const,
        severity: "medium" as const,
        title: "Smurfing / Round-Amount Splitting",
        description: `${txns.length} round-amount transactions flagged for ${customer?.name || custId}. Consistent with coordinated placement using multiple accounts.`,
        affectedCustomer: customer?.name,
        customerId: custId,
        transactionIds: txns.map((t) => t.id),
        amount: total,
        riskScore: 78,
      };
    });
}

function detectCryptoConversion(transactions: Transaction[], customers: Customer[]): DetectedThreat[] {
  const cryptoTxns = transactions.filter(
    (t) => t.flagType === "crypto" && t.riskScore > 75
  );
  const grouped = groupByCustomer(cryptoTxns);

  return Object.entries(grouped)
    .filter(([, txns]) => txns.length >= 1)
    .slice(0, 3)
    .map(([custId, txns]) => {
      const customer = getCustomerById(customers, custId);
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return {
        id: `THR-CRY-${custId}`,
        type: "crypto" as const,
        severity: total > 500_000 ? ("high" as const) : ("medium" as const),
        title: "Suspicious Crypto Conversion",
        description: `${txns.length} crypto transaction(s) totalling $${total.toLocaleString()} for ${customer?.name || custId}. Currency obfuscation pattern detected (BTC/ETH conversion chain).`,
        affectedCustomer: customer?.name,
        customerId: custId,
        transactionIds: txns.map((t) => t.id),
        amount: total,
        riskScore: Math.min(95, 70 + txns.length * 5),
      };
    });
}

function detectTradeBased(transactions: Transaction[], customers: Customer[]): DetectedThreat[] {
  const tradeTxns = transactions.filter(
    (t) => t.flagType === "trade_based" && t.riskScore > 70
  );
  const grouped = groupByCustomer(tradeTxns);

  return Object.entries(grouped)
    .filter(([, txns]) => txns.length >= 1)
    .slice(0, 3)
    .map(([custId, txns]) => {
      const customer = getCustomerById(customers, custId);
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return {
        id: `THR-TRD-${custId}`,
        type: "trade" as const,
        severity: "medium" as const,
        title: "Trade-Based Money Laundering",
        description: `${txns.length} trade finance transaction(s) for ${customer?.name || custId} flagged for over/under-invoicing. Matches FATF typology - TBML pattern.`,
        affectedCustomer: customer?.name,
        customerId: custId,
        transactionIds: txns.map((t) => t.id),
        amount: total,
        riskScore: 82,
      };
    });
}

export function detectAllThreatsFromData(
  transactions: Transaction[],
  customers: Customer[]
): DetectedThreat[] {
  return [
    ...detectStructuring(transactions, customers),
    ...detectHighRiskJurisdiction(transactions),
    ...detectVelocity(transactions, customers),
    ...detectKYCExpiredActivity(transactions, customers),
    ...detectCryptoConversion(transactions, customers),
    ...detectSmurfing(transactions, customers),
    ...detectTradeBased(transactions, customers),
  ].sort((a, b) => b.riskScore - a.riskScore);
}

export function summarizeThreats(threats: DetectedThreat[]): ThreatSummary {
  return {
    total: threats.length,
    critical: threats.filter((t) => t.severity === "critical").length,
    high: threats.filter((t) => t.severity === "high").length,
    medium: threats.filter((t) => t.severity === "medium").length,
    low: threats.filter((t) => t.severity === "low").length,
    totalAmountAtRisk: threats.reduce((s, t) => s + (t.amount ?? 0), 0),
  };
}

export function detectAllThreats(): DetectedThreat[] {
  return detectAllThreatsFromData(seedTransactions, seedCustomers);
}

export const detectedThreats = detectAllThreats();
export const criticalThreats = detectedThreats.filter((t) => t.severity === "critical");
export const threatSummary = summarizeThreats(detectedThreats);
