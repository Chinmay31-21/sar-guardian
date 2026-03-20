/**
 * Financial Intelligence Command Center Theme System
 * Dark-themed professional AML compliance dashboard styling
 */

/**
 * Neural Network Blue - Primary branding for financial intelligence
 * Represents trust, security, and data connectivity
 */
export const THEME_COLORS = {
  // Command Center Core Palette
  background: {
    primary: '#0a0e27', // Deep navy background
    secondary: '#141828', // Slightly lighter navy
    tertiary: '#1a1f3a', // Accent navy
    overlay: 'rgba(10, 14, 39, 0.8)',
  },

  // Financial Intelligence Brand Colors
  brand: {
    neural: '#0066ff', // Deep neural blue
    cyan: '#00d9ff', // Cyber intelligence cyan
    gold: '#ffd700', // Financial authority gold
    emerald: '#00ff88', // Success/safe activity
  },

  // Risk Severity Color Gradient
  risk: {
    critical: '#ff1744', // Emergency red
    crimson: '#ff3366', // Threat red
    high: '#ff6b35', // High risk orange
    medium: '#ffa500', // Medium risk amber
    low: '#4ade80', // Low risk green
    safe: '#00ff88', // Safe emerald
    neutral: '#64748b', // Neutral slate
  },

  // Glow Effects for Critical Alerts
  glow: {
    critical: {
      border: '#ff1744',
      shadow: 'rgba(255, 23, 68, 0.5)',
      shadowInt: 'rgba(255, 23, 68, 0.8)',
    },
    warning: {
      border: '#ff6b35',
      shadow: 'rgba(255, 107, 53, 0.4)',
    },
    cyber: {
      border: '#00d9ff',
      shadow: 'rgba(0, 217, 255, 0.3)',
    },
    success: {
      border: '#00ff88',
      shadow: 'rgba(0, 255, 136, 0.2)',
    },
  },

  // Text and UI Elements
  text: {
    primary: '#f1f5f9', // Bright white text
    secondary: '#cbd5e1', // Muted light text
    tertiary: '#94a3b8', // Disabled text
    inverse: '#0a0e27', // Text on light backgrounds
  },

  // Borders and Dividers
  border: {
    primary: '#2d3748', // Subtle borders
    secondary: '#1a202c', // Light borders
    glow: 'rgba(0, 217, 255, 0.2)', // Cyber glow borders
  },

  // Data Visualization
  chart: {
    line1: '#00d9ff', // Cyan
    line2: '#00ff88', // Emerald
    line3: '#ffd700', // Gold
    line4: '#ff6b35', // Orange
    area1: 'rgba(0, 217, 255, 0.1)',
    area2: 'rgba(0, 255, 136, 0.1)',
    area3: 'rgba(255, 215, 0, 0.1)',
    area4: 'rgba(255, 107, 53, 0.1)',
  },

  // Geographic Heatmap Gradient
  heatmap: {
    cold: '#001a4d', // Deep blue
    cool: '#0066ff', // Neural blue
    warm: '#ff6b35', // Orange
    hot: '#ff1744', // Red
    extreme: '#ff0000', // Bright red
  },

  // Entity Network Graph
  network: {
    nodeNormal: '#0066ff', // Neural blue
    nodeSuspicious: '#ff1744', // Red
    nodeHighRisk: '#ff6b35', // Orange
    nodeSafe: '#00ff88', // Green
    edgeNormal: 'rgba(0, 217, 255, 0.3)',
    edgeSuspicious: 'rgba(255, 23, 68, 0.6)',
    edgeFlow: 'rgba(255, 215, 0, 0.4)',
  },

  // Glassmorphism Panel Effects
  glass: {
    light: 'rgba(31, 41, 55, 0.3)', // Subtle glass
    medium: 'rgba(31, 41, 55, 0.5)', // Standard glass
    dark: 'rgba(15, 23, 42, 0.7)', // Heavy glass
    blur: 'blur(8px)',
    backdropFilter: 'backdrop-filter: blur(8px)',
  },
};

/**
 * Build shadow strings for glassmorphism and elevated elements
 */
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  // Glow shadows for critical alerts
  glowCritical: '0 0 20px rgba(255, 23, 68, 0.6), 0 0 40px rgba(255, 23, 68, 0.3)',
  glowWarning: '0 0 15px rgba(255, 107, 53, 0.5), 0 0 30px rgba(255, 107, 53, 0.2)',
  glowCyber: '0 0 15px rgba(0, 217, 255, 0.4), 0 0 30px rgba(0, 217, 255, 0.1)',
  glowSuccess: '0 0 15px rgba(0, 255, 136, 0.3), 0 0 30px rgba(0, 255, 136, 0.1)',
};

/**
 * Risk level classification and visual mapping
 */
export const RISK_LEVELS = {
  CRITICAL: { level: 5, label: 'Critical', color: THEME_COLORS.risk.critical, glow: THEME_COLORS.glow.critical },
  HIGH: { level: 4, label: 'High', color: THEME_COLORS.risk.high, glow: THEME_COLORS.glow.warning },
  MEDIUM: { level: 3, label: 'Medium', color: THEME_COLORS.risk.medium, glow: THEME_COLORS.glow.warning },
  LOW: { level: 2, label: 'Low', color: THEME_COLORS.risk.low, glow: THEME_COLORS.glow.success },
  SAFE: { level: 1, label: 'Safe', color: THEME_COLORS.risk.safe, glow: THEME_COLORS.glow.success },
} as const;

/**
 * Get risk level object from numeric score (0-100)
 */
export function getRiskLevel(score: number) {
  if (score >= 80) return RISK_LEVELS.CRITICAL;
  if (score >= 60) return RISK_LEVELS.HIGH;
  if (score >= 40) return RISK_LEVELS.MEDIUM;
  if (score >= 20) return RISK_LEVELS.LOW;
  return RISK_LEVELS.SAFE;
}

/**
 * Timeline event type styling
 */
export const TIMELINE_STYLES = {
  detection: { color: THEME_COLORS.brand.cyan, icon: '🔍' },
  scoring: { color: THEME_COLORS.brand.neural, icon: '⚖️' },
  alert: { color: THEME_COLORS.risk.critical, icon: '⚠️' },
  review: { color: THEME_COLORS.brand.gold, icon: '📋' },
  escalation: { color: THEME_COLORS.risk.high, icon: '🚀' },
  sarDraft: { color: THEME_COLORS.brand.cyan, icon: '📝' },
  sarSubmit: { color: THEME_COLORS.risk.safe, icon: '✓' },
  closed: { color: THEME_COLORS.text.tertiary, icon: '✗' },
} as const;

/**
 * Responsive breakpoints
 */
export const BREAKPOINTS = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
} as const;

/**
 * Animation timings
 */
export const ANIMATIONS = {
  // Micro-interaction speeds
  instant: '100ms',
  fast: '200ms',
  normal: '300ms',
  slow: '500ms',
  verySlow: '800ms',
  
  // Easing functions
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeLinear: 'linear',
} as const;
