import React, { useState, useEffect } from 'react';
import { THEME_COLORS, ANIMATIONS } from '@/lib/theme';

interface SystemHealthMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  details?: string;
}

interface SystemHealthProps {
  metrics?: SystemHealthMetric[];
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return THEME_COLORS.risk.safe;
    case 'warning':
      return THEME_COLORS.risk.medium;
    case 'critical':
      return THEME_COLORS.risk.critical;
    default:
      return THEME_COLORS.text.tertiary;
  }
}

const CircularProgress: React.FC<{
  value: number;
  color: string;
  size?: number;
}> = ({ value, color, size = 60 }) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={THEME_COLORS.border.primary}
        strokeWidth="2"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: `stroke-dashoffset ${ANIMATIONS.slow} ${ANIMATIONS.easeInOut}`,
        }}
      />
      <text
        x={size / 2}
        y={size / 2 + 2}
        textAnchor="middle"
        dy="0.3em"
        fill={color}
        fontSize={size / 3}
        fontWeight="bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {value}%
      </text>
    </svg>
  );
};

export const SystemHealthIndicators: React.FC<SystemHealthProps> = ({
  metrics = generateDefaultHealthMetrics(),
}) => {
  const [animatedMetrics, setAnimatedMetrics] = useState(metrics);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedMetrics((prev) =>
        prev.map((m) => ({
          ...m,
          value: Math.max(70, m.value + (Math.random() - 0.5) * 10),
        }))
      );
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const overallHealth = Math.round(
    animatedMetrics.reduce((sum, m) => sum + m.value, 0) / animatedMetrics.length
  );

  const criticalCount = animatedMetrics.filter((m) => m.status === 'critical').length;
  const warningCount = animatedMetrics.filter((m) => m.status === 'warning').length;

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
      }}
    >
      <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${THEME_COLORS.border.primary}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: THEME_COLORS.text.primary, margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            System Health Monitor
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              backgroundColor: THEME_COLORS.background.secondary,
              borderRadius: '4px',
              border: `1px solid ${getStatusColor(overallHealth > 80 ? 'healthy' : overallHealth > 60 ? 'warning' : 'critical')}`,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(overallHealth > 80 ? 'healthy' : overallHealth > 60 ? 'warning' : 'critical'),
                animation: overallHealth < 80 ? 'pulse-status 1s ease-in-out infinite' : undefined,
              }}
            />
            <span style={{ fontSize: '11px', color: THEME_COLORS.text.secondary }}>
              Overall: <span style={{ fontWeight: 'bold', color: THEME_COLORS.text.primary }}>{overallHealth}%</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
          {criticalCount > 0 && <span style={{ color: THEME_COLORS.risk.critical }}>Critical: {criticalCount}</span>}
          {warningCount > 0 && <span style={{ color: THEME_COLORS.risk.medium }}>Warning: {warningCount}</span>}
          <span style={{ color: THEME_COLORS.text.tertiary }}>Last update: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          flex: 1,
          overflow: 'auto',
          paddingRight: '8px',
        }}
      >
        {animatedMetrics.map((metric) => (
          <div
            key={metric.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px',
              backgroundColor: THEME_COLORS.background.secondary,
              borderRadius: '6px',
              border: `1px solid ${THEME_COLORS.border.primary}`,
              transition: `all ${ANIMATIONS.normal} ${ANIMATIONS.easeInOut}`,
              boxShadow: metric.status === 'critical' ? `0 0 10px ${THEME_COLORS.risk.critical}88` : undefined,
            }}
          >
            <CircularProgress
              value={Math.round(Math.max(0, Math.min(100, metric.value)))}
              color={getStatusColor(metric.status)}
              size={50}
            />
            <p
              style={{
                margin: '8px 0 2px 0',
                fontSize: '11px',
                fontWeight: 'bold',
                color: THEME_COLORS.text.primary,
                textAlign: 'center',
              }}
            >
              {metric.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '10px',
                color: THEME_COLORS.text.tertiary,
              }}
            >
              {metric.unit}
            </p>
            {metric.details && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '9px',
                  color: THEME_COLORS.text.tertiary,
                  textAlign: 'center',
                }}
              >
                {metric.details}
              </p>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: `1px solid ${THEME_COLORS.border.primary}`,
          display: 'flex',
          gap: '12px',
          fontSize: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {[
          { status: 'healthy', label: 'Healthy' },
          { status: 'warning', label: 'Warning' },
          { status: 'critical', label: 'Critical' },
        ].map((item) => (
          <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(item.status),
              }}
            />
            <span style={{ color: THEME_COLORS.text.secondary }}>{item.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse-status {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

function generateDefaultHealthMetrics(): SystemHealthMetric[] {
  return [
    {
      id: 'aml-accuracy',
      label: 'AML Model Accuracy',
      value: 94.2,
      unit: '%',
      status: 'healthy',
      details: 'F1-Score: 0.892',
    },
    {
      id: 'engine-status',
      label: 'Monitoring Engine',
      value: 99.8,
      unit: 'Uptime',
      status: 'healthy',
      details: '247 days active',
    },
    {
      id: 'detection-modules',
      label: 'Detection Modules',
      value: 98.5,
      unit: 'Active',
      status: 'healthy',
      details: '12/12 running',
    },
    {
      id: 'investigation-workload',
      label: 'Investigation Workload',
      value: 72.3,
      unit: '% Capacity',
      status: 'warning',
      details: '2,847 cases',
    },
    {
      id: 'alert-processing',
      label: 'Alert Processing',
      value: 87.6,
      unit: 'Avg Speed',
      status: 'healthy',
      details: '45ms latency',
    },
    {
      id: 'database-health',
      label: 'Database Health',
      value: 96.1,
      unit: 'Performance',
      status: 'healthy',
      details: '2.1TB indexed',
    },
  ];
}
