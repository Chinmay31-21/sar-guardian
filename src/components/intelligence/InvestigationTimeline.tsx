/**
 * Investigation Timeline
 * Chronological audit trail showing SAR lifecycle from detection through submission
 */

import React, { useState } from 'react';
import { THEME_COLORS, TIMELINE_STYLES, ANIMATIONS, SHADOWS } from '@/lib/theme';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: keyof typeof TIMELINE_STYLES;
  title: string;
  description: string;
  metadata?: Record<string, string | number | boolean>;
}

interface InvestigationTimelineProps {
  events?: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

/**
 * Timeline Event Component
 */
const TimelineEventComponent: React.FC<{
  event: TimelineEvent;
  index: number;
  total: number;
  onClick?: () => void;
  isExpanded: boolean;
}> = ({ event, index, total, onClick, isExpanded }) => {
  const style = TIMELINE_STYLES[event.type];
  const isLast = index === total - 1;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      style={{
        display: 'flex',
        marginBottom: isLast ? '0' : '24px',
        cursor: 'pointer',
        opacity: isExpanded ? 1 : 0.8,
      }}
      onClick={onClick}
    >
      {/* Timeline line and dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '16px' }}>
        {/* Timeline dot */}
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: style.color,
            border: `2px solid ${THEME_COLORS.background.primary}`,
            boxShadow: `0 0 8px ${style.color}`,
            animation: `pulse-timeline 2s ease-in-out infinite`,
            zIndex: 10,
          }}
        />

        {/* Connect line to next event */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              height: '48px',
              backgroundColor: style.color,
              marginTop: '4px',
              opacity: 0.3,
            }}
          />
        )}
      </div>

      {/* Event content */}
      <div
        style={{
          flex: 1,
          backgroundColor: THEME_COLORS.background.secondary,
          border: `1px solid ${style.color}`,
          borderRadius: '6px',
          padding: '12px',
          boxShadow: isExpanded ? `0 0 15px ${style.color}40` : undefined,
          transition: `all ${ANIMATIONS.normal} ${ANIMATIONS.easeInOut}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{style.icon}</span>
              <span style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold', fontSize: '13px' }}>
                {event.title}
              </span>
            </div>
            <p
              style={{
                color: THEME_COLORS.text.secondary,
                fontSize: '12px',
                margin: '4px 0',
                lineHeight: 1.4,
              }}
            >
              {event.description}
            </p>

            {/* Expanded metadata */}
            {isExpanded && event.metadata && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${THEME_COLORS.border.primary}` }}>
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      marginTop: '4px',
                      color: THEME_COLORS.text.tertiary,
                    }}
                  >
                    <span>{key}:</span>
                    <span style={{ color: THEME_COLORS.text.secondary }}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span
            style={{
              color: THEME_COLORS.text.tertiary,
              fontSize: '11px',
              whiteSpace: 'nowrap',
              marginLeft: '12px',
              flexShrink: 0,
            }}
          >
            {formatTime(event.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Investigation Timeline Component
 */
export const InvestigationTimeline: React.FC<InvestigationTimelineProps> = ({
  events = generateDefaultTimelineEvents(),
  onEventClick,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedEvents = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

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
        padding: '20px',
        boxShadow: `inset 0 0 20px ${THEME_COLORS.glow.cyber.shadow}`,
        overflow: 'auto',
      }}
    >
      <style>{`
        @keyframes pulse-timeline {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Timeline header */}
      <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: `1px solid ${THEME_COLORS.border.primary}` }}>
        <h3 style={{ color: THEME_COLORS.text.primary, margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          Investigation Timeline
        </h3>
        <p style={{ color: THEME_COLORS.text.tertiary, fontSize: '11px', margin: '4px 0 0 0' }}>
          {sortedEvents.length} events • SAR Lifecycle Audit Trail
        </p>
      </div>

      {/* Events */}
      <div style={{ flex: 1 }}>
        {sortedEvents.length === 0 ? (
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
            No timeline events
          </div>
        ) : (
          sortedEvents.map((event, index) => (
            <TimelineEventComponent
              key={event.id}
              event={event}
              index={index}
              total={sortedEvents.length}
              isExpanded={expandedId === event.id}
              onClick={() => {
                setExpandedId(expandedId === event.id ? null : event.id);
                onEventClick?.(event);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Generate default timeline events for demonstration
 */
function generateDefaultTimelineEvents(): TimelineEvent[] {
  const now = new Date();
  return [
    {
      id: 'e1',
      timestamp: new Date(now.getTime() - 5 * 60000),
      type: 'detection',
      title: 'Transaction Detected',
      description: 'High-value transaction detected in monitoring system',
      metadata: {
        amount: '$1,234,567',
        origin: 'Account XXX123',
        destination: 'Offshore Entity',
      },
    },
    {
      id: 'e2',
      timestamp: new Date(now.getTime() - 3 * 60000),
      type: 'scoring',
      title: 'Risk Assessment Complete',
      description: 'Multi-factor risk scoring algorithm evaluated transaction',
      metadata: {
        'Model Score': 87,
        'Rule Engine': 'Critical',
        'Flagged': 'Structuring Pattern',
      },
    },
    {
      id: 'e3',
      timestamp: new Date(now.getTime() - 2 * 60000),
      type: 'alert',
      title: 'Critical Alert Generated',
      description: 'System generated critical alert for suspicious activity',
      metadata: {
        'Alert Type': 'Potential Money Laundering',
        'Priority': 'Immediate Review',
      },
    },
    {
      id: 'e4',
      timestamp: new Date(now.getTime() - 1 * 60000),
      type: 'review',
      title: 'Analyst Review Started',
      description: 'Compliance analyst started investigation review',
      metadata: {
        'Analyst': 'John Smith',
        'Department': 'AML Investigations',
      },
    },
    {
      id: 'e5',
      timestamp: new Date(now.getTime() - 30000),
      type: 'escalation',
      title: 'Escalated to Senior Analyst',
      description: 'Case escalated due to high-risk severity classification',
      metadata: {
        'Reason': 'Multiple Risk Factors',
        'Escalated To': 'Senior Investigator',
      },
    },
    {
      id: 'e6',
      timestamp: new Date(now.getTime() - 10000),
      type: 'sarDraft',
      title: 'SAR Narrative Generated',
      description: 'AI system generated initial SAR narrative with pattern analysis',
      metadata: {
        'Patterns Detected': 3,
        'Model Confidence': '92%',
      },
    },
  ];
}
