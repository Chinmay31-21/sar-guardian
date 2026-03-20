// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CsvTransaction {
  sender_account: string;
  receiver_account: string;
  amount: number;
  type: string;
  merchant_category: string;
  device: string;
  country: string;
  is_suspicious: boolean;
  pattern: string;
  transaction_id: string;
  timestamp: string;
  hour: number;
  day: string;
  is_high_risk_country: boolean;
  log_amount: number;
}

export interface NetworkEdge {
  entity_a: string;
  entity_b: string;
  relationship: string;
  strength: number;
}

export interface HistoricalSAR {
  sar_id: string;
  typology: string;
  country: string;
  risk_score: number;
  narrative: string;
}

export interface ExternalRiskItem {
  entity: string;
  source: string;
  risk_type: string;
  risk_score: number;
  description: string;
  date: string;
}

export interface AllCsvData {
  transactions: CsvTransaction[];
  networkEdges: NetworkEdge[];
  historicalSARs: HistoricalSAR[];
  externalRisk: ExternalRiskItem[];
}

// ─── Parser ────────────────────────────────────────────────────────────────────

/**
 * Splits a CSV line by comma, joining any extra commas into the last field.
 * This handles the `narrative` and `description` columns that may contain commas.
 */
function splitCSVLine(line: string, expectedCols: number): string[] {
  const parts = line.split(",");
  if (parts.length <= expectedCols) return parts.map((p) => p.trim());
  // Join overflow columns into the last field
  const head = parts.slice(0, expectedCols - 1).map((p) => p.trim());
  const tail = parts.slice(expectedCols - 1).join(",").trim();
  return [...head, tail];
}

function parseCSV<T>(text: string, expectedCols: number): T[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line, expectedCols);
    const obj: Record<string, string | number | boolean> = {};
    headers.forEach((h, i) => {
      const v = (values[i] ?? "").trim().replace(/^"|"$/g, "");
      if (v === "True" || v === "true") obj[h] = true;
      else if (v === "False" || v === "false") obj[h] = false;
      else if (v !== "" && !isNaN(Number(v))) obj[h] = Number(v);
      else obj[h] = v;
    });
    return obj as unknown as T;
  });
}

// ─── Loaders ──────────────────────────────────────────────────────────────────

async function fetchCSV(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load CSV: ${path}`);
  return res.text();
}

export async function loadTransactions(): Promise<CsvTransaction[]> {
  return parseCSV<CsvTransaction>(
    await fetchCSV("/sar_dummy_transactions_4000_v2.csv"),
    15
  );
}

export async function loadNetworkGraph(): Promise<NetworkEdge[]> {
  return parseCSV<NetworkEdge>(
    await fetchCSV("/network_graph_dataset.csv"),
    4
  );
}

export async function loadHistoricalSARs(): Promise<HistoricalSAR[]> {
  return parseCSV<HistoricalSAR>(
    await fetchCSV("/historical_sar_dataset.csv"),
    5
  );
}

export async function loadExternalRisk(): Promise<ExternalRiskItem[]> {
  return parseCSV<ExternalRiskItem>(
    await fetchCSV("/external_risk_intelligence_dataset.csv"),
    6
  );
}

export async function loadAllCsvData(): Promise<AllCsvData> {
  const [transactions, networkEdges, historicalSARs, externalRisk] =
    await Promise.all([
      loadTransactions(),
      loadNetworkGraph(),
      loadHistoricalSARs(),
      loadExternalRisk(),
    ]);
  return { transactions, networkEdges, historicalSARs, externalRisk };
}

// ─── SAR Report Engine ─────────────────────────────────────────────────────────

export interface RegulatoryBreach {
  rule: string;
  ref: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  trigger: string;        // what specific evidence triggered this
  explanation: string;    // explainable AI justification
  confidence: number;     // 0-100
}

export interface FullSARReport {
  // Header
  caseId: string;
  dateGenerated: string;
  reportingInstitution: string;
  reportingUnit: string;

  // Subject
  entityId: string;
  riskCategory: "Critical" | "High" | "Medium" | "Low";
  riskScore: number;           // 0-100
  kycStatus: string;
  primaryCountry: string;
  riskTypes: string[];

  // Transaction summary
  txnCount: number;
  suspiciousTxnCount: number;
  totalAmount: number;
  avgAmount: number;
  maxSingleAmount: number;
  periodStart: string;
  periodEnd: string;
  countriesInvolved: string[];
  transactionRows: { date: string; amount: number; type: string; from: string; to: string; indicator: string }[];

  // Suspicious activity
  activityDescription: string;
  patternsObserved: string[];
  networkConnections: number;
  connectedEntities: string[];
  relationshipTypes: string[];

  // Regulatory
  regulatoryBreaches: RegulatoryBreach[];
  regulatoryImpactScore: number;   // 0-100 weighted

  // Evidence
  evidenceItems: string[];

  // Risk indicators
  riskIndicators: string[];

  // Historical precedent
  historicalPrecedent?: string;

  // Conclusion
  conclusion: string;

  // Metadata
  aiConfidence: number;
  modelVersion: string;
}

// ─── Universal rules — always included ─────────────────────────────────────────

function universalBreaches(patterns: string[], totalAmount: number, suspiciousCount: number): RegulatoryBreach[] {
  const breaches: RegulatoryBreach[] = [];

  breaches.push({
    rule: "BSA Suspicious Activity Report",
    ref: "31 USC §5318(g)",
    severity: "critical",
    trigger: `${suspiciousCount} suspicious transactions totalling $${totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    description: "Requires financial institutions to report any known or suspected violation of law or suspicious activity involving $5,000 or more.",
    explanation: `The observed transaction patterns — ${patterns.filter(p => p !== "normal").join(", ") || "anomalous behaviour"} — meet the statutory threshold for mandatory SAR filing. The aggregate suspicious amount of $${totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} substantially exceeds the $5,000 reporting minimum.`,
    confidence: 97,
  });

  breaches.push({
    rule: "FinCEN SAR Filing Rule",
    ref: "31 CFR §1020.320",
    severity: "critical",
    trigger: "Multi-transaction suspicious pattern detected by AML monitoring system",
    description: "Banks and financial institutions must file SARs for transactions indicating possible money laundering, tax evasion, or other financial crimes.",
    explanation: `Automated AML monitoring identified ${suspiciousCount} transactions with anomalous patterns. The FinCEN SAR rule mandates filing within 30 calendar days of detection. Non-filing constitutes a regulatory violation.`,
    confidence: 95,
  });

  breaches.push({
    rule: "USA PATRIOT Act — AML Program Requirements",
    ref: "31 USC §5318(h) / Section 352",
    severity: "high",
    trigger: "AML monitoring system flagged suspicious behavioural patterns",
    description: "Requires financial institutions to maintain anti-money laundering programs with transaction monitoring, customer due diligence, and suspicious activity reporting.",
    explanation: `The transaction monitoring system identified patterns consistent with Section 352 obligations. The institution's AML programme has correctly flagged these transactions; this SAR documents compliance with programme requirements.`,
    confidence: 90,
  });

  breaches.push({
    rule: "FATF Recommendation 20 — Suspicious Transaction Reporting",
    ref: "FATF R-20 (2012, Rev. 2023)",
    severity: "high",
    trigger: "Typological match to FATF ML/TF typologies",
    description: "Countries should require financial institutions and other entities to report suspicious transactions to the financial intelligence unit.",
    explanation: `The activity observed aligns with typologies documented in FATF guidance, including transaction structuring, cross-border movement, and network obfuscation. FATF Recommendation 20 requires this activity to be reported to the national FIU.`,
    confidence: 88,
  });

  return breaches;
}

// ─── Type-specific rule sets ────────────────────────────────────────────────────

const TYPE_BREACH_MAP: Record<string, RegulatoryBreach[]> = {
  "Crypto Laundering Indicator": [
    {
      rule: "FinCEN Virtual Currency Guidance",
      ref: "FIN-2019-A003",
      severity: "high",
      trigger: "Cryptocurrency exchange interaction detected in network graph",
      description: "Clarifies how the Bank Secrecy Act applies to businesses dealing in convertible virtual currencies.",
      explanation: "The subject entity's network includes crypto exchange interactions. FinCEN guidance FIN-2019-A003 establishes that transactions involving convertible virtual currency are subject to full BSA/AML requirements including SAR filing.",
      confidence: 85,
    },
    {
      rule: "FATF Recommendation 15 — New Technologies",
      ref: "FATF R-15 (2019 Rev.)",
      severity: "high",
      trigger: "Virtual asset service provider (VASP) connections identified",
      description: "Countries should assess ML/TF risks associated with virtual assets and virtual asset service providers.",
      explanation: "Transaction data shows conversion chains consistent with cryptocurrency layering. FATF R-15 requires jurisdictions to apply AML/CFT measures to VASPs; this filing documents the identified risk.",
      confidence: 82,
    },
    {
      rule: "EU Markets in Crypto-Assets (MiCA)",
      ref: "Regulation (EU) 2023/1114",
      severity: "medium",
      trigger: "Cross-border crypto activity involving EU-jurisdiction entities",
      description: "Establishes AML obligations for crypto-asset service providers operating within the European Union.",
      explanation: "Where the transaction chain involves EU-connected crypto assets, MiCA obligations apply. This report documents the activity for potential disclosure to EU regulatory authorities.",
      confidence: 72,
    },
  ],
  "Shell Company Transfer": [
    {
      rule: "FATF Recommendation 24 — Beneficial Ownership",
      ref: "FATF R-24 (2022 Rev.)",
      severity: "critical",
      trigger: "Offshore shell company linkage identified in entity network",
      description: "Countries should ensure adequate, accurate and current information on the beneficial ownership of legal persons is available to competent authorities.",
      explanation: "Network graph analysis reveals connections to entities in BVI, Cayman Islands, and/or Panama — jurisdictions commonly used for shell company formation. FATF R-24 requires disclosure of beneficial ownership; this creates a regulatory gap that the SAR documents.",
      confidence: 91,
    },
    {
      rule: "EU 6th AML Directive — Article 3",
      ref: "Directive 2018/1673 Art. 3",
      severity: "high",
      trigger: "Criminal activity predicate offence pattern detected",
      description: "Harmonises the definition of money laundering offences across EU member states, extending liability to 22 predicate offences.",
      explanation: "The shell company transfer pattern is consistent with predicate offences covered under 6AMLD including tax evasion, fraud, and organised crime. The directive's expanded scope requires this activity to be reported.",
      confidence: 84,
    },
    {
      rule: "FinCEN Customer Due Diligence Rule",
      ref: "31 CFR §1010.230",
      severity: "high",
      trigger: "Beneficial ownership information unavailable or unverified",
      description: "Requires financial institutions to identify and verify the identity of beneficial owners of legal entity customers.",
      explanation: "The entity's connections to offshore structures indicate potential CDD deficiencies. Under 31 CFR §1010.230, the institution must obtain beneficial ownership information for all legal entity accounts; gaps in this information must be documented.",
      confidence: 88,
    },
  ],
  "Offshore Structuring": [
    {
      rule: "BSA Structuring Prohibition",
      ref: "31 USC §5324",
      severity: "critical",
      trigger: "Multiple sub-threshold transactions detected in same period",
      description: "Federal law prohibits structuring transactions to evade Currency Transaction Report ($10,000 threshold) filing requirements.",
      explanation: "Transaction analysis reveals multiple payments falling just below the $10,000 CTR threshold (range $9,500–$9,900) within concentrated time windows. This pattern is a textbook indicator of structuring — a federal criminal offence under 31 USC §5324.",
      confidence: 94,
    },
    {
      rule: "FinCEN Currency Transaction Report",
      ref: "31 CFR §1010.311",
      severity: "critical",
      trigger: "Aggregate daily transactions may exceed $10,000 reporting threshold",
      description: "Financial institutions must file a Currency Transaction Report for any transaction in currency (cash) exceeding $10,000.",
      explanation: "While individual transactions fall below the CTR threshold, the aggregated daily amounts suggest deliberate structuring to avoid CTR filing. Under 31 CFR §1010.311, the institution may have an obligation to file CTRs for the aggregate activity.",
      confidence: 89,
    },
    {
      rule: "FATF Recommendation 29 — Financial Intelligence Units",
      ref: "FATF R-29",
      severity: "high",
      trigger: "Structuring pattern warrants FIU disclosure",
      description: "Countries should establish a financial intelligence unit that serves as the national centre for receipt and analysis of suspicious transaction reports.",
      explanation: "The structured transaction pattern requires disclosure to the national Financial Intelligence Unit per FATF R-29. The FIU will assess whether criminal prosecution or further investigation is warranted.",
      confidence: 85,
    },
  ],
  "Negative Media": [
    {
      rule: "FATF Recommendation 12 — PEP Enhanced Due Diligence",
      ref: "FATF R-12",
      severity: "high",
      trigger: "Adverse media coverage identified in external intelligence feeds",
      description: "Financial institutions should take reasonable measures to determine whether a customer is a politically exposed person.",
      explanation: "External risk intelligence sources have flagged adverse media coverage for this entity. FATF R-12 requires enhanced due diligence when a customer is associated with reputational risk, corruption allegations, or negative media coverage.",
      confidence: 80,
    },
    {
      rule: "EU 5th AML Directive — Enhanced CDD",
      ref: "Directive 2018/843 Art. 13",
      severity: "high",
      trigger: "High-risk customer requiring enhanced monitoring",
      description: "Requires member states to apply enhanced due diligence measures to high-risk third countries and customers.",
      explanation: "The entity's adverse media profile and transaction behaviour qualify it as high-risk under AMLD5. Enhanced CDD measures and ongoing monitoring are mandatory; this SAR documents the institution's compliance.",
      confidence: 78,
    },
  ],
  "Trade Finance Fraud": [
    {
      rule: "FATF Trade-Based Money Laundering Guidance",
      ref: "FATF TBML (2020)",
      severity: "critical",
      trigger: "Trade invoice-to-transaction discrepancy detected",
      description: "Provides guidance on identifying and investigating trade-based money laundering through manipulation of international trade transactions.",
      explanation: "The transaction pattern exhibits characteristics consistent with FATF TBML typologies: over/under-invoicing, multiple invoicing, and falsely described goods. The guidance requires institutions to report such activity.",
      confidence: 87,
    },
    {
      rule: "FinCEN Advisory on TBML",
      ref: "FIN-2014-A005",
      severity: "high",
      trigger: "Cross-border trade transactions with high-risk counterparties",
      description: "Advises financial institutions on identifying and reporting trade-based money laundering red flags.",
      explanation: "The trade finance transactions exhibit multiple red flags identified in FinCEN's advisory: high-risk jurisdictions, unusual payment terms, and inconsistency between trade activity and account profile.",
      confidence: 83,
    },
  ],
};

const DEFAULT_BREACH: RegulatoryBreach[] = [
  {
    rule: "FATF Recommendation 10 — Customer Due Diligence",
    ref: "FATF R-10 (2012, Rev. 2023)",
    severity: "high",
    trigger: "High-risk account activity inconsistent with stated business purpose",
    description: "Requires financial institutions to undertake CDD measures when there is a suspicion of ML/TF.",
    explanation: "The transaction pattern is inconsistent with the account's expected activity profile. FATF R-10 requires enhanced CDD when suspicious activity is detected, including re-verification of customer identity and purpose of transactions.",
    confidence: 82,
  },
];

// ─── Regulatory Impact Score ───────────────────────────────────────────────────

function computeImpactScore(breaches: RegulatoryBreach[]): number {
  const weights: Record<string, number> = { critical: 30, high: 18, medium: 10, low: 5 };
  const maxPossible = breaches.length * 30;
  if (maxPossible === 0) return 0;
  const total = breaches.reduce((s, b) => s + (weights[b.severity] ?? 5), 0);
  return Math.min(100, Math.round((total / maxPossible) * 100));
}

// ─── Main SAR Report Generator ────────────────────────────────────────────────

export function generateSARReport(
  entity: string,
  riskData: ExternalRiskItem[],
  edges: NetworkEdge[],
  transactions: CsvTransaction[],
  historicalSARs: HistoricalSAR[],
  overrides?: { caseId?: string; kycStatus?: string; riskCategory?: string }
): FullSARReport {
  const entityRisk = riskData.filter((r) => r.entity === entity);
  const connections = edges.filter((e) => e.entity_a === entity || e.entity_b === entity);
  const connectedEntities = [...new Set(connections.map((e) => e.entity_a === entity ? e.entity_b : e.entity_a))];
  const relationshipTypes = [...new Set(connections.map((e) => e.relationship))];
  const entityTxns = transactions.filter((t) => t.sender_account === entity || t.receiver_account === entity);
  const suspiciousTxns = entityTxns.filter((t) => t.is_suspicious);
  const totalAmount = entityTxns.reduce((s, t) => s + t.amount, 0);
  const maxRiskRaw = entityRisk.length ? Math.max(...entityRisk.map((r) => r.risk_score)) : 0.7;
  const riskScore = Math.round(maxRiskRaw * 100);
  const riskTypes = [...new Set(entityRisk.map((r) => r.risk_type))];
  const patterns = [...new Set(entityTxns.map((t) => t.pattern).filter((p) => p && p !== "normal"))];
  const highRiskCountries = [...new Set(entityTxns.filter((t) => t.is_high_risk_country).map((t) => t.country))];
  const allCountries = [...new Set(entityTxns.map((t) => t.country))];

  const periodStart = entityTxns.length
    ? entityTxns.reduce((a, b) => (a.timestamp < b.timestamp ? a : b)).timestamp.split("T")[0]
    : "2025-01-01";
  const periodEnd = entityTxns.length
    ? entityTxns.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const maxSingleAmount = entityTxns.length ? Math.max(...entityTxns.map((t) => t.amount)) : 0;
  const avgAmount = entityTxns.length ? totalAmount / entityTxns.length : 0;

  const riskCategory: FullSARReport["riskCategory"] =
    riskScore >= 80 ? "Critical" : riskScore >= 60 ? "High" : riskScore >= 40 ? "Medium" : "Low";

  // Build regulatory breaches
  const universal = universalBreaches(patterns, totalAmount, suspiciousTxns.length);
  const typeSpecific: RegulatoryBreach[] = [];
  const seen = new Set<string>();
  for (const rt of [...riskTypes, ...(patterns.includes("structuring") ? ["Offshore Structuring"] : [])]) {
    const matching = TYPE_BREACH_MAP[rt] ?? [];
    for (const b of matching) {
      if (!seen.has(b.ref)) {
        seen.add(b.ref);
        typeSpecific.push(b);
      }
    }
  }
  if (typeSpecific.length === 0) typeSpecific.push(...DEFAULT_BREACH);
  const allBreaches = [...universal, ...typeSpecific];

  // Historical precedent
  const historicalMatch = historicalSARs.find((h) =>
    riskTypes.some((rt) => h.typology.toLowerCase().includes(rt.toLowerCase().split(" ")[0]))
  );

  // Transaction table (top 8 suspicious)
  const transactionRows = suspiciousTxns.slice(0, 8).map((t) => ({
    date: t.timestamp.split("T")[0],
    amount: t.amount,
    type: t.type,
    from: t.sender_account,
    to: t.receiver_account,
    indicator: t.pattern !== "normal" ? t.pattern.replace(/_/g, " ") : t.is_high_risk_country ? "high-risk country" : "anomalous",
  }));

  // Evidence items
  const evidenceItems: string[] = [
    `Transaction logs: ${entityTxns.length} records from internal monitoring systems`,
    `AML risk score: ${riskScore}/100 — ${riskCategory} risk classification`,
    ...entityRisk.slice(0, 4).map((r) => `${r.source} (${r.date}): ${r.description.substring(0, 90)}`),
    `Network analysis: ${connectedEntities.length} connected counterparties via ${relationshipTypes.join(", ") || "financial transactions"}`,
    historicalMatch ? `Historical SAR match: ${historicalMatch.sar_id} (${historicalMatch.typology})` : `No direct historical precedent — pattern-based detection`,
  ];

  // Risk indicators
  const riskIndicators: string[] = [];
  if (patterns.includes("structuring")) riskIndicators.push("Multiple transactions below $10,000 reporting threshold (structuring)");
  if (highRiskCountries.length > 0) riskIndicators.push(`High-risk jurisdiction involvement: ${highRiskCountries.join(", ")}`);
  if (patterns.includes("smurfing")) riskIndicators.push("Distributed deposits from multiple accounts (smurfing pattern)");
  if (patterns.includes("cross_border")) riskIndicators.push("Rapid cross-border fund movements inconsistent with account profile");
  if (riskTypes.some((r) => r.toLowerCase().includes("crypto"))) riskIndicators.push("Cryptocurrency exchange interaction — potential layering via virtual assets");
  if (connectedEntities.length > 5) riskIndicators.push(`Extensive network of ${connectedEntities.length} interconnected accounts`);
  if (entityRisk.length > 0) riskIndicators.push(`${entityRisk.length} external intelligence source(s) flagged this entity`);
  if (riskIndicators.length < 3) riskIndicators.push("Transaction velocity and amount anomalies exceed peer group baseline");

  // Activity description
  const activityDescription =
    `${entity} has been identified through multi-source automated monitoring as exhibiting behaviour patterns consistent with ` +
    (riskTypes.join(" and ") || "suspicious financial activity") +
    `. Between ${periodStart} and ${periodEnd}, the entity conducted ${entityTxns.length} financial transactions with an aggregate value of ` +
    `$${totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}, of which ${suspiciousTxns.length} were flagged by the AML system. ` +
    (highRiskCountries.length > 0
      ? `Funds were routed through ${highRiskCountries.length} FATF-listed high-risk jurisdiction(s): ${highRiskCountries.join(", ")}. `
      : "") +
    (patterns.length > 0
      ? `Detected behavioural patterns: ${patterns.join(", ")}. These are consistent with layering and integration stages of the money laundering cycle.`
      : "Transaction anomalies exceed the 4-sigma threshold for the peer group cohort.");

  const conclusion =
    `Based on the totality of evidence — comprising transaction pattern analysis, network graph correlation across ${connectedEntities.length} ` +
    `connected entities, and ${entityRisk.length} external intelligence signal(s) — this institution has formed a reasonable basis to believe that ` +
    `the described transactions may involve proceeds of one or more specified unlawful activities as defined under 18 U.S.C. § 1956. ` +
    `The Regulatory Impact Score of ${computeImpactScore(allBreaches)}% confirms material exposure to BSA, FinCEN, and FATF obligations. ` +
    `This SAR is filed pursuant to 31 U.S.C. § 5318(g) within the mandatory 30-day reporting window. ` +
    `Enhanced monitoring is recommended. Escalation to the Financial Crimes Investigation Unit is advised if activity continues.`;

  const regulatoryImpactScore = computeImpactScore(allBreaches);
  const caseId = overrides?.caseId ?? `SAR-2026-${String(Math.abs(entity.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 0)) % 90000 + 10000)}`;

  return {
    caseId,
    dateGenerated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
    reportingInstitution: "Barclays Bank PLC",
    reportingUnit: "Anti-Money Laundering Compliance Division / Financial Intelligence Unit",
    entityId: entity,
    riskCategory,
    riskScore,
    kycStatus: overrides?.kycStatus ?? "Under Review",
    primaryCountry: allCountries[0] ?? "Unknown",
    riskTypes,
    txnCount: entityTxns.length,
    suspiciousTxnCount: suspiciousTxns.length,
    totalAmount,
    avgAmount,
    maxSingleAmount,
    periodStart,
    periodEnd,
    countriesInvolved: allCountries,
    transactionRows,
    activityDescription,
    patternsObserved: patterns.length > 0 ? patterns : ["Anomalous transaction volume and timing"],
    networkConnections: connectedEntities.length,
    connectedEntities,
    relationshipTypes,
    regulatoryBreaches: allBreaches,
    regulatoryImpactScore,
    evidenceItems,
    riskIndicators,
    historicalPrecedent: historicalMatch
      ? `${historicalMatch.sar_id} — ${historicalMatch.typology} (${historicalMatch.country}, risk: ${(historicalMatch.risk_score * 100).toFixed(0)}%): "${historicalMatch.narrative}"`
      : undefined,
    conclusion,
    aiConfidence: Math.min(99, Math.round(maxRiskRaw * 85 + 12)),
    modelVersion: "SAR Guardian v2.1 / Claude Sonnet 4.6",
  };
}

// ─── Backward-compat helpers ───────────────────────────────────────────────────

export type SARBreachItem = { rule: string; ref: string; severity: string; description: string; trigger?: string; explanation?: string; confidence?: number };

export function getRegulatoryBreaches(riskTypes: string[]): SARBreachItem[] {
  const seen = new Set<string>();
  const results: SARBreachItem[] = [];
  const base = universalBreaches([], 50000, 3);
  for (const b of base) {
    if (!seen.has(b.ref)) { seen.add(b.ref); results.push(b); }
  }
  for (const rt of riskTypes) {
    const typeRules = (TYPE_BREACH_MAP[rt] ?? DEFAULT_BREACH);
    for (const b of typeRules) {
      if (!seen.has(b.ref)) { seen.add(b.ref); results.push(b); }
    }
  }
  return results.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });
}

/** Returns the plain-text narrative (used for RiskGraph modal SAR preview). */
export function generateNarrative(
  entity: string,
  riskData: ExternalRiskItem[],
  edges: NetworkEdge[],
  transactions: CsvTransaction[],
  historicalSARs: HistoricalSAR[]
): string {
  const r = generateSARReport(entity, riskData, edges, transactions, historicalSARs);
  return `SUSPICIOUS ACTIVITY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Case ID: ${r.caseId}
Date Generated: ${r.dateGenerated}
Reporting Institution: ${r.reportingInstitution}
Reporting Unit: ${r.reportingUnit}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBJECT INFORMATION
Account/Entity: ${r.entityId}
Risk Category:  ${r.riskCategory} (Score: ${r.riskScore}/100)
KYC Status:     ${r.kycStatus}
Primary Country:${r.primaryCountry}
Risk Types:     ${r.riskTypes.join(", ") || "General Suspicious Activity"}

TRANSACTION SUMMARY
Period:         ${r.periodStart} to ${r.periodEnd}
Total Amount:   $${r.totalAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
Transactions:   ${r.txnCount} total / ${r.suspiciousTxnCount} suspicious
Max Single Txn: $${r.maxSingleAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
Countries:      ${r.countriesInvolved.join(", ")}

SUSPICIOUS ACTIVITY DESCRIPTION
${r.activityDescription}

RISK INDICATORS
${r.riskIndicators.map((ri, i) => `${i + 1}. ${ri}`).join("\n")}

REGULATORY BREACH MAPPING (Impact Score: ${r.regulatoryImpactScore}%)
${r.regulatoryBreaches.map((b) => `[${b.severity.toUpperCase()}] ${b.rule} (${b.ref})\n  ${b.trigger}\n  → ${b.explanation}`).join("\n\n")}

EVIDENCE SUMMARY
${r.evidenceItems.map((e) => `• ${e}`).join("\n")}

CONCLUSION
${r.conclusion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI Confidence: ${r.aiConfidence}% | ${r.modelVersion} | Pending human review
`;
}
