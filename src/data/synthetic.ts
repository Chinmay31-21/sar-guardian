// Synthetic data for SAR Narrative Generator

export type RiskLevel = "high" | "medium" | "low";
export type SARStatus = "draft" | "review" | "approved" | "filed";
export type TransactionStatus = "flagged" | "cleared" | "pending" | "under_review";
export type FlagType = "structuring" | "round_amounts" | "cross_border" | "crypto" | "high_value" | "smurfing" | "trade_based";

export interface Customer {
  id: string;
  name: string;
  accounts: string[];
  riskRating: RiskLevel;
  kycStatus: "verified" | "pending" | "expired";
  businessType: string;
  country: string;
  flagCount: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  date: string;
  riskScore: number;
  status: TransactionStatus;
  flagType: FlagType | null;
  senderAccount: string;
  receiverAccount: string;
  country: string;
  type: string;
}

export interface SARReport {
  id: string;
  transactionIds: string[];
  customerId: string;
  customerName: string;
  status: SARStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
  confidenceScore: number;
  modelUsed: string;
  promptVersion: string;
  narrative?: string;
  daysRemaining: number;
  priority: RiskLevel;
  deadline?: string;
  entityType?: string;
  ein?: string;
  address?: string;
  industryType?: string;
  riskBreakdown?: { label: string; value: number }[];
  triggerRules?: { id: string; name: string; confidence: number }[];
  evidenceAnchors?: string[];
  timelineEvents?: { date: string; event: string }[];
}

export interface AuditEntry {
  id: string;
  sarId: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  modelVersion?: string;
  promptVersionId?: string;
  details: string;
}

export interface AlertItem {
  id: string;
  message: string;
  time: string;
  severity: RiskLevel;
  transactionId: string;
}

const firstNames = ["James", "Sarah", "Michael", "Elena", "Robert", "Aisha", "William", "Chen", "David", "Fatima", "Thomas", "Maria", "Richard", "Yuki", "Carlos", "Anastasia", "Ahmed", "Patricia", "Ivan", "Priya"];
const lastNames = ["Morgan", "Petrov", "Chen", "Al-Rashid", "Schmidt", "Tanaka", "Okafor", "Santos", "Kim", "Mueller", "Patel", "Johansson", "Nakamura", "Volkov", "Garcia", "Ibrahim", "Larsson", "Yamamoto", "Costa", "Andersen"];
const businessTypes = ["Import/Export", "Real Estate", "Cryptocurrency Exchange", "Shell Company", "Retail", "Consulting", "Construction", "Jewelry", "Art Dealer", "Financial Services", "Tech Startup", "Shipping"];
const countries = ["US", "UK", "DE", "CH", "SG", "HK", "AE", "BVI", "CY", "LU", "MT", "PA", "BS", "KY", "RU", "CN", "BR", "IN", "NG", "ZA"];
const currencies = ["USD", "EUR", "GBP", "CHF", "BTC", "ETH", "SGD", "AED", "CNY", "JPY"];
const txTypes = ["Wire Transfer", "ACH", "Cash Deposit", "Crypto Transfer", "Trade Finance", "Letter of Credit", "Foreign Exchange", "Internal Transfer"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAccountNumber(): string {
  return `${randomBetween(1000, 9999)}-${randomBetween(1000, 9999)}-${randomBetween(100000, 999999)}`;
}

function generateDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

// Generate customers
export const customers: Customer[] = Array.from({ length: 50 }, (_, i) => ({
  id: `CUST-${String(i + 1).padStart(4, "0")}`,
  name: `${randomFrom(firstNames)} ${randomFrom(lastNames)}`,
  accounts: Array.from({ length: randomBetween(2, 6) }, () => generateAccountNumber()),
  riskRating: randomFrom<RiskLevel>(["high", "medium", "low"]),
  kycStatus: randomFrom<"verified" | "pending" | "expired">(["verified", "verified", "verified", "pending", "expired"]),
  businessType: randomFrom(businessTypes),
  country: randomFrom(countries),
  flagCount: randomBetween(0, 12),
}));

// Generate transactions
export const transactions: Transaction[] = Array.from({ length: 200 }, (_, i) => {
  const customer = randomFrom(customers);
  const riskScore = randomBetween(5, 99);
  const isFlagged = riskScore > 60;
  return {
    id: `TXN-${String(i + 1).padStart(6, "0")}`,
    customerId: customer.id,
    customerName: customer.name,
    amount: riskScore > 80 ? randomBetween(50000, 5000000) : randomBetween(100, 100000),
    currency: randomFrom(currencies),
    date: generateDate(randomBetween(0, 90)),
    riskScore,
    status: isFlagged ? randomFrom<TransactionStatus>(["flagged", "under_review"]) : randomFrom<TransactionStatus>(["cleared", "pending"]),
    flagType: isFlagged ? randomFrom<FlagType>(["structuring", "round_amounts", "cross_border", "crypto", "high_value", "smurfing", "trade_based"]) : null,
    senderAccount: randomFrom(customer.accounts),
    receiverAccount: generateAccountNumber(),
    country: randomFrom(countries),
    type: randomFrom(txTypes),
  };
});

export const flaggedTransactions = transactions.filter((t) => t.status === "flagged" || t.status === "under_review");

const analysts = ["J. Morrison", "S. Chen", "A. Petrov", "M. Garcia", "R. Kim"];
const models = ["Claude Sonnet 3.5", "Llama 3.1 70B", "Mistral 7B"];

const narrativeSnippets = [
  "Between January 28, 2026, and February 10, 2026, the subject entity conducted a series of wire transfers totaling approximately $1,385,300 across multiple accounts, exhibiting patterns consistent with structuring and layering activity.",
  "The subject initiated six transactions over a thirteen-day period, with four transactions flagged for suspicious activity indicators. Three outbound wire transfers were directed to Offshore Holdings Ltd, a registered entity in a high-risk jurisdiction (Cayman Islands), with no documented business relationship on file.",
  "Cash deposits of $9,800, narrowly below the $10,000 Currency Transaction Report threshold, were made at Branch 441 on February 1, 2026. This deposit, combined with the pattern of wire activity, suggests potential structuring to evade reporting requirements.",
  "Multiple circular transfers between shell entities were identified, with funds moving through four intermediate accounts before reaching final destination. This pattern is consistent with money laundering typology for layering activities.",
];

const triggerRuleTemplates = [
  { id: "R-101", name: "Structuring below $10K threshold", confidence: 98 },
  { id: "R-204", name: "Rapid movement to offshore entity", confidence: 94 },
  { id: "R-312", name: "Nominee account layering", confidence: 87 },
  { id: "R-155", name: "Geographic risk — jurisdiction mismatch", confidence: 72 },
  { id: "R-407", name: "Velocity check: 12+ txns in 30 min", confidence: 85 },
];

const riskBreakdownTemplates = [
  [
    { label: "Structuring", value: 98 },
    { label: "Layering", value: 94 },
    { label: "Jurisdiction", value: 72 },
    { label: "Velocity", value: 85 },
  ],
  [
    { label: "Cross-border", value: 92 },
    { label: "Round amounts", value: 88 },
    { label: "High value", value: 76 },
    { label: "Crypto conversion", value: 89 },
  ],
];

export const sarReports: SARReport[] = Array.from({ length: 20 }, (_, i) => {
  const status = randomFrom<SARStatus>(["draft", "draft", "review", "review", "approved", "filed"]);
  const customer = flaggedTransactions[i]?.customerName || customers[0].name;
  const relatedTxs = flaggedTransactions.slice(i * 2, i * 2 + randomBetween(1, 4));

  return {
    id: `SAR-${String(2026000 + 4891 + i)}`,
    transactionIds: relatedTxs.map((t) => t.id),
    customerId: flaggedTransactions[i]?.customerId || customers[0].id,
    customerName: customer,
    status,
    createdAt: generateDate(randomBetween(1, 30)),
    updatedAt: generateDate(randomBetween(0, 5)),
    assignedTo: randomFrom(analysts),
    confidenceScore: randomBetween(75, 98),
    modelUsed: randomFrom(models),
    promptVersion: `v${randomBetween(2, 3)}.${randomBetween(0, 5)}.${randomBetween(0, 9)}`,
    daysRemaining: status === "filed" ? 0 : randomBetween(1, 7),
    priority: randomFrom<RiskLevel>(["high", "medium", "low"]),
    narrative: randomFrom(narrativeSnippets),
    deadline: generateDate(-randomBetween(1, 14)),
    entityType: "Limited Liability Company",
    ein: `XX-XXX${String(4891 + i).padEnd(4, "0")}`,
    address: `${randomBetween(1000, 9999)} Commerce Blvd, Wilmington, DE 19801`,
    industryType: "International Trade / Logistics",
    riskBreakdown: randomFrom(riskBreakdownTemplates),
    triggerRules: triggerRuleTemplates.slice(0, randomBetween(2, 4)),
    evidenceAnchors: [
      `${randomBetween(2, 6)} evidence anchors`,
      `Transaction pattern analysis`,
      `KYC deviation report`,
    ],
    timelineEvents: [
      { date: generateDate(randomBetween(5, 10)), event: "Alert generated — structuring pattern detected" },
      { date: generateDate(randomBetween(2, 4)), event: "Case assigned to analyst" },
      { date: generateDate(0), event: "Narrative generated by AI model" },
    ],
  };
});

export const auditEntries: AuditEntry[] = Array.from({ length: 60 }, (_, i) => ({
  id: `AUD-${String(i + 1).padStart(5, "0")}`,
  sarId: sarReports[i % sarReports.length].id,
  timestamp: new Date(Date.now() - randomBetween(0, 30 * 24 * 60 * 60 * 1000)).toISOString(),
  user: randomFrom(analysts),
  role: randomFrom(["Analyst", "Senior Analyst", "Compliance Officer"]),
  action: randomFrom(["Created", "Generated", "Edited", "Approved", "Filed", "Reviewed", "Commented"]),
  modelVersion: randomFrom(["Claude-v3.5", "Llama-3.1-70B", "Mistral-7B", undefined]),
  promptVersionId: `v${randomBetween(2, 3)}.${randomBetween(0, 5)}.${randomBetween(0, 9)}`,
  details: randomFrom([
    "Initial SAR narrative generated",
    "Modified suspicious activity description",
    "Approved for filing with FinCEN",
    "Added regulatory compliance notes",
    "Updated subject information",
    "Reviewed risk attribution graph",
    "Filed with regulatory body",
    "Flagged for additional investigation",
  ]),
}));

export const recentAlerts: AlertItem[] = [
  { id: "ALT-001", message: "Structuring detected: 5 deposits under $10,000 within 24hrs", time: "2 min ago", severity: "high", transactionId: flaggedTransactions[0]?.id || "TXN-000001" },
  { id: "ALT-002", message: "Cross-border wire to sanctioned jurisdiction (DPRK)", time: "15 min ago", severity: "high", transactionId: flaggedTransactions[1]?.id || "TXN-000002" },
  { id: "ALT-003", message: "Unusual crypto conversion pattern: BTC → XMR → fiat", time: "32 min ago", severity: "high", transactionId: flaggedTransactions[2]?.id || "TXN-000003" },
  { id: "ALT-004", message: "Round amount transfers: 6 x $50,000.00 to shell entities", time: "1 hr ago", severity: "medium", transactionId: flaggedTransactions[3]?.id || "TXN-000004" },
  { id: "ALT-005", message: "KYC expiry alert: High-risk customer Chen Volkov", time: "1 hr ago", severity: "medium", transactionId: flaggedTransactions[4]?.id || "TXN-000005" },
  { id: "ALT-006", message: "Velocity check: 12 transactions in 30 minutes", time: "2 hrs ago", severity: "medium", transactionId: flaggedTransactions[5]?.id || "TXN-000006" },
  { id: "ALT-007", message: "Trade-based ML indicator: Over-invoicing by 340%", time: "3 hrs ago", severity: "low", transactionId: flaggedTransactions[6]?.id || "TXN-000007" },
  { id: "ALT-008", message: "New account rapid funding: $2.1M within 48hrs of opening", time: "4 hrs ago", severity: "high", transactionId: flaggedTransactions[7]?.id || "TXN-000008" },
];

// Dashboard metrics
export const dashboardMetrics = {
  totalSARsFiled: { thisMonth: 47, thisYear: 312, trend: 12 },
  pendingReviews: { count: 23, urgent: 5 },
  falsePositiveRate: { percentage: 34.2, trend: -8.5 },
  avgProcessingTime: { hours: 3.2, trend: -22 },
  casesPerHour: 10000,
  sarGenerationTime: "2-6s",
  timeReduction: 52,
  falsePositiveReduction: 41,
};

// SHAP feature attribution data for narrative lines
export interface SHAPFeature {
  name: string;
  value: number;
  baseValue?: string;
}

export const shapFeatureMap: Record<string, SHAPFeature[]> = {
  "amount": [
    { name: "Transaction Amount", value: 0.342, baseValue: "$495,000" },
    { name: "Round Amount Pattern", value: 0.156, baseValue: "Yes" },
    { name: "Velocity (24h)", value: 0.089, baseValue: "4.2hrs avg" },
    { name: "Historical Baseline", value: -0.034, baseValue: "+312%" },
  ],
  "wire": [
    { name: "Transaction Type", value: 0.287, baseValue: "Wire Transfer" },
    { name: "Cross-Border Flag", value: 0.245, baseValue: "Yes" },
    { name: "Amount Threshold", value: 0.198, baseValue: "$495K" },
    { name: "Beneficiary Type", value: 0.134, baseValue: "Offshore Entity" },
  ],
  "structuring": [
    { name: "Structuring Pattern", value: 0.456, baseValue: "12 instances" },
    { name: "CTR Threshold Evasion", value: 0.389, baseValue: "$9,500-$9,900" },
    { name: "Geographic Dispersion", value: 0.167, baseValue: "Multiple branches" },
    { name: "Time Window", value: 0.123, baseValue: "24hrs" },
  ],
  "jurisdiction": [
    { name: "Jurisdiction Risk", value: 0.398, baseValue: "BVI/Cyprus/Panama" },
    { name: "FATF Grey List", value: 0.312, baseValue: "3 of 4" },
    { name: "Shell Entity Flag", value: 0.267, baseValue: "Yes" },
    { name: "Tax Haven Indicator", value: 0.189, baseValue: "High" },
  ],
  "cash": [
    { name: "Cash Deposit Pattern", value: 0.423, baseValue: "$9,800" },
    { name: "CTR Avoidance", value: 0.378, baseValue: "Below $10K" },
    { name: "Branch Hopping", value: 0.234, baseValue: "Branch #442, #118" },
    { name: "Frequency", value: 0.156, baseValue: "Same day" },
  ],
  "layering": [
    { name: "Layering Complexity", value: 0.412, baseValue: "4 intermediaries" },
    { name: "Circular Transfer", value: 0.367, baseValue: "Round-trip" },
    { name: "Holding Time", value: 0.289, baseValue: "4.2hrs avg" },
    { name: "Entity Network", value: 0.198, baseValue: "Shell companies" },
  ],
  "trade": [
    { name: "Trade-Based ML", value: 0.487, baseValue: "FATF Match 94%" },
    { name: "Over-Invoicing", value: 0.445, baseValue: "+340%" },
    { name: "Invoice Mismatch", value: 0.334, baseValue: "Market value" },
    { name: "Commodity Type", value: 0.178, baseValue: "Industrial machinery" },
  ],
  "default": [
    { name: "Overall Risk Score", value: 0.298, baseValue: "92/100" },
    { name: "Behavioral Deviation", value: 0.234, baseValue: "+312%" },
    { name: "Peer Group Anomaly", value: 0.189, baseValue: "4.7σ" },
    { name: "Historical Pattern", value: 0.145, baseValue: "12-month baseline" },
  ],
};

export function getSHAPFeaturesForText(text: string): SHAPFeature[] {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("structuring") || lowerText.includes("smurfing")) return shapFeatureMap["structuring"];
  if (lowerText.includes("trade") || lowerText.includes("invoice") || lowerText.includes("over-invoicing")) return shapFeatureMap["trade"];
  if (lowerText.includes("layering") || lowerText.includes("shell") || lowerText.includes("circular")) return shapFeatureMap["layering"];
  if (lowerText.includes("cash deposit")) return shapFeatureMap["cash"];
  if (lowerText.includes("jurisdiction") || lowerText.includes("bvi") || lowerText.includes("cyprus") || lowerText.includes("panama") || lowerText.includes("cayman")) return shapFeatureMap["jurisdiction"];
  if (lowerText.includes("wire transfer") || lowerText.includes("wire")) return shapFeatureMap["wire"];
  if (lowerText.includes("$") || lowerText.includes("amount") || lowerText.includes("million")) return shapFeatureMap["amount"];
  return shapFeatureMap["default"];
}
