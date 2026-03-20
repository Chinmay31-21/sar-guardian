/**
 * AML Risk Calculation and Intelligence Analytics Engine
 * Multi-factor risk scoring, threat detection, and behavioral analysis
 */

import { RISK_LEVELS, getRiskLevel } from './theme';

/**
 * Multi-dimensional risk factors
 */
export interface RiskProfile {
  fraudRisk: number; // 0-100
  amlRisk: number; // 0-100
  transactionRisk: number; // 0-100
  cyberRisk: number; // 0-100
  reputationRisk: number; // 0-100
  overallRisk: number; // 0-100
  riskLevel: typeof RISK_LEVELS[keyof typeof RISK_LEVELS];
}

/**
 * Transaction intelligence record
 */
export interface TransactionIntelligence {
  id: string;
  amount: number;
  currency: string;
  origin: string;
  destination: string;
  timestamp: Date;
  entityName: string;
  riskScore: number;
  suspiciousFlags: string[];
  alertType?: 'velocity_anomaly' | 'offshore_transfer' | 'structuring' | 'sanctions_match' | 'pep_connection' | 'unusual_pattern';
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Investigation entity record
 */
export interface InvestigationEntity {
  id: string;
  name: string;
  type: 'individual' | 'business' | 'account' | 'intermediary';
  riskProfile: RiskProfile;
  transactionCount: number;
  totalVolume: number;
  flaggedTransactions: number;
  connections: string[]; // IDs of connected entities
  suspiciousActivities: string[];
  investigationStatus: 'open' | 'closed' | 'escalated';
  lastUpdated: Date;
}

/**
 * Calculate comprehensive multi-factor risk score
 */
export function calculateRiskProfile(
  transactionHistory: TransactionIntelligence[],
  entityMeta: Partial<InvestigationEntity>
): RiskProfile {
  // Fraud Risk: velocity, unusual amounts, structuring patterns
  const fraudRisk = calculateFraudRisk(transactionHistory);

  // AML Risk: offshore, jurisdictional, PEP connections, sanctions matches
  const amlRisk = calculateAMLRisk(transactionHistory, entityMeta);

  // Transaction Risk: individual transaction suspicion scores
  const transactionRisk = calculateTransactionRisk(transactionHistory);

  // Cyber Risk: unusual access patterns, technical indicators
  const cyberRisk = calculateCyberRisk(entityMeta);

  // Reputation Risk: public perception, regulatory history
  const reputationRisk = calculateReputationRisk(entityMeta);

  // Overall risk is weighted average of all factors
  const overallRisk = 
    (fraudRisk * 0.25 + 
     amlRisk * 0.35 + 
     transactionRisk * 0.20 + 
     cyberRisk * 0.10 + 
     reputationRisk * 0.10);

  return {
    fraudRisk,
    amlRisk,
    transactionRisk,
    cyberRisk,
    reputationRisk,
    overallRisk: Math.round(overallRisk),
    riskLevel: getRiskLevel(Math.round(overallRisk)),
  };
}

/**
 * Calculate fraud risk based on transaction patterns
 */
function calculateFraudRisk(transactions: TransactionIntelligence[]): number {
  if (transactions.length === 0) return 0;

  let risk = 0;

  // Velocity analysis: sudden spike in transaction frequency
  const recentTxns = transactions.filter(t => {
    const days = (Date.now() - t.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  });
  if (recentTxns.length > 10) risk += 30;
  else if (recentTxns.length > 5) risk += 15;

  // Amount anomalies: structuring or unusual patterns
  const amounts = transactions.map(t => t.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const amountVariance = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - avgAmount, 2), 0) / amounts.length);
  
  if (amountVariance > avgAmount * 2) risk += 20; // High variability
  
  // Structuring: multiple small transactions around threshold
  const smallTxns = amounts.filter(a => a > 8000 && a < 10000).length;
  if (smallTxns / transactions.length > 0.3) risk += 25;

  // Rapid destination changes
  const uniqueDestinations = new Set(transactions.map(t => t.destination)).size;
  if (uniqueDestinations / transactions.length > 0.5) risk += 15;

  return Math.min(Math.round(risk), 100);
}

/**
 * Calculate AML (money laundering) risk
 */
function calculateAMLRisk(
  transactions: TransactionIntelligence[],
  entityMeta: Partial<InvestigationEntity>
): number {
  let risk = 0;

  // Offshore transfers to high-risk jurisdictions
  const highRiskJurisdictions = ['KY', 'PA', 'AE', 'SG', 'HK', 'BVI', 'BS'];
  const offshoreTransfers = transactions.filter(t => 
    highRiskJurisdictions.some(j => t.destination.toUpperCase().includes(j))
  );
  risk += Math.min(offshoreTransfers.length * 8, 40);

  // Round-tripping: send and receive from same entity
  const destinations = transactions.map(t => t.destination);
  const origins = transactions.map(t => t.origin);
  const roundTrips = destinations.filter(d => origins.includes(d)).length;
  risk += Math.min(roundTrips * 10, 30);

  // Complex intermediary chains
  if (entityMeta.connections && entityMeta.connections.length > 5) {
    risk += 20;
  }

  // Suspicious activity flags
  if (entityMeta.suspiciousActivities) {
    const activityRisk = entityMeta.suspiciousActivities.length * 5;
    risk += Math.min(activityRisk, 25);
  }

  return Math.min(Math.round(risk), 100);
}

/**
 * Calculate transaction-level risk
 */
function calculateTransactionRisk(transactions: TransactionIntelligence[]): number {
  if (transactions.length === 0) return 0;

  const riskScores = transactions.map(t => t.riskScore || 0);
  const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
  
  // Count suspicious flags
  const suspiciousTxns = transactions.filter(t => t.suspiciousFlags && t.suspiciousFlags.length > 0).length;
  const flagRatio = suspiciousTxns / transactions.length;

  return Math.round(avgRisk * 0.6 + flagRatio * 100 * 0.4);
}

/**
 * Calculate cyber risk (authentication, access patterns)
 */
function calculateCyberRisk(entityMeta: Partial<InvestigationEntity>): number {
  // Simplified: would integrate with auth logs, IP analysis in real system
  return Math.floor(Math.random() * 30); // Placeholder
}

/**
 * Calculate reputation risk
 */
function calculateReputationRisk(entityMeta: Partial<InvestigationEntity>): number {
  // Check for regulatory history, media mentions, etc.
  // Placeholder implementation
  return Math.floor(Math.random() * 30);
}

/**
 * Detect suspicious transaction patterns
 */
export function detectSuspiciousPatterns(
  transactions: TransactionIntelligence[]
): { pattern: string; confidence: number; transactions: TransactionIntelligence[] }[] {
  const patterns: { pattern: string; confidence: number; transactions: TransactionIntelligence[] }[] = [];

  // Pattern 1: Structuring (small amounts just below threshold)
  const structuringTxns = transactions.filter(t => t.amount > 8000 && t.amount < 10000);
  if (structuringTxns.length > 3) {
    patterns.push({
      pattern: 'Structuring - Multiple transactions below $10k threshold',
      confidence: Math.min(structuringTxns.length * 0.2, 0.95),
      transactions: structuringTxns,
    });
  }

  // Pattern 2: Rapid layering (quick transfers through multiple entities)
  const layeringPatterns = detectLayering(transactions);
  if (layeringPatterns) patterns.push(layeringPatterns);

  // Pattern 3: Round-tripping (circular flows)
  const roundTripPatterns = detectRoundTripping(transactions);
  if (roundTripPatterns) patterns.push(roundTripPatterns);

  // Pattern 4: Velocity anomaly
  const velocityAnomalies = detectVelocityAnomalies(transactions);
  if (velocityAnomalies) patterns.push(velocityAnomalies);

  // Pattern 5: Offshore concentration
  const offshorePattern = detectOffshoreConcentration(transactions);
  if (offshorePattern) patterns.push(offshorePattern);

  return patterns;
}

function detectLayering(transactions: TransactionIntelligence[]): 
  { pattern: string; confidence: number; transactions: TransactionIntelligence[] } | null {
  // Multiple hops in short time period
  const recentTxns = transactions.filter(t => {
    const days = (Date.now() - t.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  });

  if (recentTxns.length > 5) {
    const uniqueDestinations = new Set(recentTxns.map(t => t.destination)).size;
    if (uniqueDestinations > 3) {
      return {
        pattern: 'Rapid Layering - Quick transfers through multiple entities',
        confidence: Math.min(uniqueDestinations / recentTxns.length, 0.9),
        transactions: recentTxns,
      };
    }
  }
  return null;
}

function detectRoundTripping(transactions: TransactionIntelligence[]): 
  { pattern: string; confidence: number; transactions: TransactionIntelligence[] } | null {
  const destinations = new Set(transactions.map(t => t.destination));
  const origins = transactions.map(t => t.origin);
  
  let roundTripCount = 0;
  const roundTripTxns: TransactionIntelligence[] = [];

  destinations.forEach(dest => {
    const matchingTxns = transactions.filter(t => t.destination === dest && origins.includes(dest as string));
    roundTripCount += matchingTxns.length;
    roundTripTxns.push(...matchingTxns);
  });

  if (roundTripTxns.length > 2) {
    return {
      pattern: 'Round-Tripling - Funds returned to origin with complex routing',
      confidence: Math.min(roundTripCount / transactions.length, 0.85),
      transactions: roundTripTxns,
    };
  }
  return null;
}

function detectVelocityAnomalies(transactions: TransactionIntelligence[]): 
  { pattern: string; confidence: number; transactions: TransactionIntelligence[] } | null {
  const recentTxns = transactions.filter(t => {
    const days = (Date.now() - t.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  });

  const averageDaily = (transactions.length / 30); // Rough average
  const recentDaily = recentTxns.length / 7;

  if (recentDaily > averageDaily * 3) {
    return {
      pattern: 'Velocity Anomaly - Unprecedented transaction frequency',
      confidence: Math.min(recentDaily / (averageDaily * 2), 0.95),
      transactions: recentTxns,
    };
  }
  return null;
}

function detectOffshoreConcentration(transactions: TransactionIntelligence[]): 
  { pattern: string; confidence: number; transactions: TransactionIntelligence[] } | null {
  const highRiskJurisdictions = ['KY', 'PA', 'AE', 'SG', 'HK', 'BVI', 'BS'];
  const offshoreTxns = transactions.filter(t =>
    highRiskJurisdictions.some(j => t.destination.toUpperCase().includes(j))
  );

  if (offshoreTxns.length / transactions.length > 0.4) {
    return {
      pattern: 'Offshore Concentration - High volume flow to high-risk jurisdictions',
      confidence: Math.min(offshoreTxns.length / transactions.length, 0.9),
      transactions: offshoreTxns,
    };
  }
  return null;
}

/**
 * Generate SAR narrative from transaction data
 */
export function generateSARNarrative(
  entity: InvestigationEntity,
  riskProfile: RiskProfile,
  suspiciousPatterns: ReturnType<typeof detectSuspiciousPatterns>
): string {
  const narrativeStructure = [
    `## Suspicious Activity Report for ${entity.name}`,
    ``,
    `**Entity Type:** ${entity.type}`,
    `**Investigation Status:** ${entity.investigationStatus}`,
    `**Overall Risk Score:** ${riskProfile.overallRisk}/100 (${riskProfile.riskLevel.label})`,
    ``,
    `### Multi-Factor Risk Assessment`,
    `- **AML Risk:** ${riskProfile.amlRisk}/100`,
    `- **Fraud Risk:** ${riskProfile.fraudRisk}/100`,
    `- **Transaction Risk:** ${riskProfile.transactionRisk}/100`,
    `- **Cyber Risk:** ${riskProfile.cyberRisk}/100`,
    `- **Reputation Risk:** ${riskProfile.reputationRisk}/100`,
    ``,
    `### Detected Suspicious Patterns`,
  ];

  suspiciousPatterns.forEach(p => {
    narrativeStructure.push(
      `- **${p.pattern}** (Confidence: ${(p.confidence * 100).toFixed(1)}%)`,
      `  - Transactions Involved: ${p.transactions.length}`,
      `  - Total Volume: $${p.transactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}`,
      ``
    );
  });

  narrativeStructure.push(
    `### Entity Intelligence`,
    `- **Total Transactions:** ${entity.transactionCount}`,
    `- **Flagged Transactions:** ${entity.flaggedTransactions}`,
    `- **Connected Entities:** ${entity.connections.length}`,
    `- **Total Volume:** $${entity.totalVolume.toLocaleString()}`,
    ``,
    `### Investigation Summary`,
    `Based on comprehensive AML risk analysis, entity ${entity.name} exhibits multiple indicators of potential suspicious activity including ${suspiciousPatterns.map(p => p.pattern.split(' - ')[0]).join(', ')}.`,
    ``,
    `**Recommended Actions:**`,
    `- Immediate escalation for further investigation`,
    `- Review transaction network for connected parties`,
    `- Consider regulatory reporting if thresholds met`,
    `- Monitor for continued suspicious activity`
  );

  return narrativeStructure.join('\n');
}
