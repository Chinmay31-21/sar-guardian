/**
 * Real-Time Alert Feed
 * Continuously updating panel showing critical, medium, and low priority threats
 */

import React, { useState, useEffect } from 'react';
import { THEME_COLORS, RISK_LEVELS, ANIMATIONS, SHADOWS } from '@/lib/theme';

interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  entityName: string;
  timestamp: Date;
  amount: number;
  riskScore: number;
  alertType: 'velocity_anomaly' | 'offshore_transfer' | 'structuring' | 'sanctions_match' | 'pep_connection' | 'unusual_pattern';
  description: string;
  transaction?: {
    id: string;
    from: string;
    to: string;
  };
}

interface RealTimeAlertFeedProps {
  alerts?: Alert[];
  onInvestigate?: (alert: Alert) => void;
  onEscalate?: (alert: Alert) => void;
  onGenerateSAR?: (alert: Alert) => void;
}

/**
 * Get alert color based on severity
 */
function getAlertColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return THEME_COLORS.risk.critical;
    case 'high':
      return THEME_COLORS.risk.high;
    case 'medium':
      return THEME_COLORS.risk.medium;
    case 'low':
      return THEME_COLORS.risk.low;
    default:
      return THEME_COLORS.text.tertiary;
  }
}

/**
 * Get alert type display text and icon
 */
function getAlertTypeDisplay(type: string): { label: string; icon: string } {
  const typeMap: Record<string, { label: string; icon: string }> = {
    velocity_anomaly: { label: 'Velocity Anomaly', icon: '📈' },
    offshore_transfer: { label: 'Offshore Transfer', icon: '🌍' },
    structuring: { label: 'Structuring Pattern', icon: '🔄' },
    sanctions_match: { label: 'Sanctions Match', icon: '⚠️' },
    pep_connection: { label: 'PEP Connection', icon: '👤' },
    unusual_pattern: { label: 'Unusual Pattern', icon: '❓' },
  };
  return typeMap[type] || { label: type, icon: '🔔' };
}

/**
 * Format time relative to now
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

/**
 * Alert Item Component
 */
const AlertItem: React.FC<{
  alert: Alert;
  onInvestigate?: () => void;
  onEscalate?: () => void;
  onGenerateSAR?: () => void;
  isNew?: boolean;
}> = ({ alert, onInvestigate, onEscalate, onGenerateSAR, isNew }) => {
  const [isExpanded, setIsExpanded] = useState(isNew || false);
  const color = getAlertColor(alert.severity);
  const typeDisplay = getAlertTypeDisplay(alert.alertType);

  return (
    <div
      style={{
        backgroundColor: THEME_COLORS.background.secondary,
        border: `2px solid ${color}`,
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '8px',
        transition: `all ${ANIMATIONS.normal} ${ANIMATIONS.easeInOut}`,
        boxShadow: isNew ? `0 0 15px ${color}66` : undefined,
        animation: isNew ? `slideIn ${ANIMATIONS.normal} ease-out` : undefined,
        cursor: 'pointer',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Alert Header */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Severity Indicator */}
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
            flexShrink: 0,
            animation: alert.severity === 'critical' ? `pulse-alert ${ANIMATIONS.normal} ease-in-out infinite` : undefined,
          }}
        />

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Title and Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div>
              <h4
                style={{
                  margin: 0,
                  color: THEME_COLORS.text.primary,
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                {alert.title}
              </h4>
              <p style={{ margin: '2px 0 0 0', color: THEME_COLORS.text.secondary, fontSize: '11px' }}>
                {alert.entityName}
              </p>
            </div>
            <span style={{ color: THEME_COLORS.text.tertiary, fontSize: '11px', whiteSpace: 'nowrap' }}>
              {formatRelativeTime(alert.timestamp)}
            </span>
          </div>

          {/* Alert Details */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              margin: '8px 0',
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ color: THEME_COLORS.text.tertiary }}>Amount: </span>
              <span style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold' }}>
                ${(alert.amount / 1000000).toFixed(2)}M
              </span>
            </div>
            <div>
              <span style={{ color: THEME_COLORS.text.tertiary }}>Risk: </span>
              <span style={{ color, fontWeight: 'bold' }}>{alert.riskScore}/100</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{typeDisplay.icon}</span>
              <span style={{ color: THEME_COLORS.text.secondary }}>{typeDisplay.label}</span>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              margin: '4px 0',
              color: THEME_COLORS.text.secondary,
              fontSize: '11px',
              lineHeight: 1.3,
            }}
          >
            {alert.description}
          </p>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${THEME_COLORS.border.primary}`,
            animation: `expandDown ${ANIMATIONS.normal} ease-out`,
          }}
        >
          {/* Transaction Details */}
          {alert.transaction && (
            <div
              style={{
                backgroundColor: THEME_COLORS.background.primary,
                padding: '8px',
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '11px',
              }}
            >
              <div style={{ color: THEME_COLORS.text.tertiary, marginBottom: '4px' }}>Transaction Details:</div>
              <div style={{ color: THEME_COLORS.text.secondary }}>
                <div>From: {alert.transaction.from}</div>
                <div>To: {alert.transaction.to}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInvestigate?.();
              }}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '6px 12px',
                backgroundColor: THEME_COLORS.brand.neural,
                color: THEME_COLORS.text.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = THEME_COLORS.brand.cyan;
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = THEME_COLORS.brand.neural;
              }}
            >
              🔍 Investigate
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEscalate?.();
              }}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '6px 12px',
                backgroundColor: THEME_COLORS.risk.high,
                color: THEME_COLORS.text.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              }}
            >
              🚀 Escalate
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateSAR?.();
              }}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '6px 12px',
                backgroundColor: THEME_COLORS.brand.gold,
                color: THEME_COLORS.background.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast} ${ANIMATIONS.easeInOut}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
              }}
            >
              📝 Generate SAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Real-Time Alert Feed Component
 */
export const RealTimeAlertFeed: React.FC<RealTimeAlertFeedProps> = ({
  alerts = generateDefaultAlerts(),
  onInvestigate,
  onEscalate,
  onGenerateSAR,
}) => {
  const [alertsState, setAlertsState] = useState(alerts);
  const [newAlertCount, setNewAlertCount] = useState(0);

  // Simulate new alerts arriving
  useEffect(() => {
    const interval = setInterval(() => {
      const newAlert: Alert = {
        id: `alert-${Date.now()}`,
        severity: (['critical', 'high', 'medium'] as const)[Math.floor(Math.random() * 3)],
        title: 'New Alert Generated',
        entityName: `Entity-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date(),
        amount: Math.random() * 5000000 + 500000,
        riskScore: Math.floor(Math.random() * 100) + 20,
        alertType: (['velocity_anomaly', 'offshore_transfer', 'structuring'] as const)[Math.floor(Math.random() * 3)],
        description: 'New suspicious activity detected by monitoring system',
      };

      setAlertsState(prev => [newAlert, ...prev.slice(0, 9)]);
      setNewAlertCount(prev => prev + 1);

      setTimeout(() => setNewAlertCount(prev => Math.max(0, prev - 1)), 5000);
    }, 15000); // New alert every 15 seconds

    return () => clearInterval(interval);
  }, []);

  // Sort alerts by severity and timestamp
  const sortedAlerts = [...alertsState].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const criticalCount = alertsState.filter(a => a.severity === 'critical').length;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: THEME_COLORS.background.primary,
        borderRadius: '8px',
        border: `1px solid ${THEME_COLORS.border.glow}`,
        padding: '16px',
        boxShadow: `inset 0 0 20px ${THEME_COLORS.glow.cyber.shadow}`,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes expandDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        @keyframes pulse-alert {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Feed Header */}
      <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${THEME_COLORS.border.primary}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: THEME_COLORS.text.primary, margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
              Real-Time Alert Feed
            </h3>
            <p style={{ color: THEME_COLORS.text.tertiary, fontSize: '11px', margin: '4px 0 0 0' }}>
              {alertsState.length} active alerts
            </p>
          </div>
          {criticalCount > 0 && (
            <div
              style={{
                backgroundColor: THEME_COLORS.risk.critical,
                color: THEME_COLORS.text.primary,
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                animation: `pulse-alert ${ANIMATIONS.normal} ease-in-out infinite`,
              }}
            >
              🚨 {criticalCount} CRITICAL
            </div>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px',
        }}
      >
        {sortedAlerts.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: THEME_COLORS.text.tertiary,
              fontSize: '12px',
            }}
          >
            No active alerts
          </div>
        ) : (
          sortedAlerts.map((alert, index) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              isNew={index < newAlertCount}
              onInvestigate={() => onInvestigate?.(alert)}
              onEscalate={() => onEscalate?.(alert)}
              onGenerateSAR={() => onGenerateSAR?.(alert)}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Generate default alerts for demonstration
 */
function generateDefaultAlerts(): Alert[] {
  return [
    {
      id: '1',
      severity: 'critical',
      title: 'Potential Money Laundering Network',
      entityName: 'Shell Corps International Ltd',
      timestamp: new Date(Date.now() - 2 * 60000),
      amount: 8500000,
      riskScore: 94,
      alertType: 'structuring',
      description: 'Pattern of multiple structuring transactions detected. Multiple accounts moving funds through offshore intermediaries.',
      transaction: { id: 'tx1', from: 'Account XXX123', to: 'Account PAX456' },
    },
    {
      id: '2',
      severity: 'critical',
      title: 'High-Risk Jurisdiction Transfer',
      entityName: 'Intercontinental Finance LLC',
      timestamp: new Date(Date.now() - 5 * 60000),
      amount: 3200000,
      riskScore: 88,
      alertType: 'offshore_transfer',
      description: 'Large transfer to Cayman Islands detected. Entity has no prior business relationship with offshore jurisdiction.',
    },
    {
      id: '3',
      severity: 'high',
      title: 'Transaction Velocity Anomaly',
      entityName: 'Global Ventures Inc',
      timestamp: new Date(Date.now() - 10 * 60000),
      amount: 2150000,
      riskScore: 72,
      alertType: 'velocity_anomaly',
      description: 'Account activity increased 340% in the last 7 days. Unusual transaction frequency for this entity.',
    },
    {
      id: '4',
      severity: 'high',
      title: 'Sanctions List Match',
      entityName: 'Unknown Beneficiary',
      timestamp: new Date(Date.now() - 15 * 60000),
      amount: 1800000,
      riskScore: 85,
      alertType: 'sanctions_match',
      description: 'Beneficiary name matched against OFAC SDN list. Immediate compliance review required.',
    },
    {
      id: '5',
      severity: 'medium',
      title: 'PEP Connection Detected',
      entityName: 'Trade Connections Ltd',
      timestamp: new Date(Date.now() - 20 * 60000),
      amount: 950000,
      riskScore: 58,
      alertType: 'pep_connection',
      description: 'Entity has connection to Politically Exposed Person. Enhanced due diligence recommended.',
    },
    {
      id: '6',
      severity: 'medium',
      title: 'Unusual Transaction Pattern',
      entityName: 'Commerce Bridge Corp',
      timestamp: new Date(Date.now() - 25 * 60000),
      amount: 720000,
      riskScore: 52,
      alertType: 'unusual_pattern',
      description: 'Transaction pattern deviates from historical baseline. Review for compliance.',
    },
    {
      id: '7',
      severity: 'low',
      title: 'Standard Review Alert',
      entityName: 'Business Solutions Inc',
      timestamp: new Date(Date.now() - 30 * 60000),
      amount: 450000,
      riskScore: 35,
      alertType: 'unusual_pattern',
      description: 'Routine monitoring alert. Transaction activity within normal parameters.',
    },
  ];
}
