/**
 * Multi-Factor Risk Radar Chart
 * Visualizes multi-dimensional risk profile with fraud, AML, transaction, cyber, and reputation factors
 */

import React, { useEffect, useRef, useState } from 'react';
import { THEME_COLORS, SHADOWS, ANIMATIONS } from '@/lib/theme';
import type { RiskProfile } from '@/lib/intelligenceEngine';

interface RiskRadarProps {
  riskProfile: RiskProfile;
  entityName?: string;
  width?: number;
  height?: number;
  animated?: boolean;
}

/**
 * Multi-Factor Risk Radar Chart Component
 */
export const RiskRadarChart: React.FC<RiskRadarProps> = ({
  riskProfile,
  entityName = 'Current Entity',
  width = 400,
  height = 400,
  animated = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Animation loop
  useEffect(() => {
    if (!animated) {
      setAnimationProgress(1);
      return;
    }

    let frameId: number;
    const startTime = Date.now();
    const duration = 800; // 800ms animation

    const animate = () => {
      const elapsed = Math.min(Date.now() - startTime, duration);
      const progress = elapsed / duration;

      setAnimationProgress(progress);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [animated]);

  // Draw radar chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;
    const levels = 5; // 0, 20, 40, 60, 80, 100
    const angles = 5; // 5 risk factors

    const factors = [
      { name: 'Fraud Risk', value: riskProfile.fraudRisk, color: THEME_COLORS.risk.critical },
      { name: 'AML Risk', value: riskProfile.amlRisk, color: THEME_COLORS.risk.high },
      { name: 'Transaction Risk', value: riskProfile.transactionRisk, color: THEME_COLORS.risk.medium },
      { name: 'Cyber Risk', value: riskProfile.cyberRisk, color: THEME_COLORS.brand.gold },
      { name: 'Reputation Risk', value: riskProfile.reputationRisk, color: THEME_COLORS.brand.cyan },
    ];

    // Clear canvas
    ctx.fillStyle = THEME_COLORS.background.secondary;
    ctx.fillRect(0, 0, width, height);

    // Draw concentric circles (levels)
    ctx.strokeStyle = THEME_COLORS.border.primary;
    ctx.lineWidth = 1;
    for (let i = 1; i <= levels; i++) {
      const radius = (maxRadius / levels) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw level labels (0-100)
    ctx.fillStyle = THEME_COLORS.text.tertiary;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= levels; i++) {
      const value = (i / levels) * 100;
      const radius = (maxRadius / levels) * i;
      ctx.fillText(String(Math.round(value)), centerX, centerY - radius - 5);
    }

    // Draw axes and factor names
    ctx.strokeStyle = THEME_COLORS.border.secondary;
    ctx.lineWidth = 1;
    for (let i = 0; i < angles; i++) {
      const angle = (i / angles) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * maxRadius;
      const y = centerY + Math.sin(angle) * maxRadius;

      // Axis line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Factor name
      ctx.fillStyle = THEME_COLORS.text.secondary;
      ctx.textAlign = 'center';
      const labelRadius = maxRadius + 25;
      const labelX = centerX + Math.cos(angle) * labelRadius;
      const labelY = centerY + Math.sin(angle) * labelRadius;
      ctx.font = 'bold 11px Arial';
      ctx.fillText(factors[i].name, labelX, labelY);
    }

    // Draw data polygon
    ctx.fillStyle = 'rgba(0, 217, 255, 0.2)';
    ctx.strokeStyle = THEME_COLORS.brand.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < angles; i++) {
      const angle = (i / angles) * Math.PI * 2 - Math.PI / 2;
      const value = factors[i].value;
      const radius = (maxRadius / 100) * value * animationProgress;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < angles; i++) {
      const angle = (i / angles) * Math.PI * 2 - Math.PI / 2;
      const value = factors[i].value;
      const radius = (maxRadius / 100) * value * animationProgress;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Point circle
      ctx.fillStyle = factors[i].color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Glow effect for high-risk factors
      if (value > 60) {
        ctx.strokeStyle = factors[i].color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Draw overall risk score in center
    if (animationProgress === 1) {
      ctx.fillStyle = THEME_COLORS.text.primary;
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(String(riskProfile.overallRisk), centerX, centerY + 8);

      ctx.font = '11px Arial';
      ctx.fillStyle = THEME_COLORS.text.secondary;
      ctx.fillText('/100', centerX, centerY + 20);

      ctx.fillStyle = riskProfile.riskLevel.color;
      ctx.font = 'bold 12px Arial';
      ctx.fillText(riskProfile.riskLevel.label, centerX, centerY - 20);
    }
  }, [width, height, riskProfile, animationProgress]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: THEME_COLORS.background.primary,
      borderRadius: '8px',
      border: `1px solid ${THEME_COLORS.border.glow}`,
      padding: '16px',
      boxShadow: `inset 0 0 20px ${THEME_COLORS.glow.cyber.shadow}`,
    }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          backgroundColor: THEME_COLORS.background.secondary,
          borderRadius: '4px',
          border: `1px solid ${THEME_COLORS.border.primary}`,
        }}
      />

      {/* Risk Factor Legend */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '8px',
        width: '100%',
        marginTop: '12px',
        padding: '8px',
        backgroundColor: THEME_COLORS.background.secondary,
        borderRadius: '4px',
        border: `1px solid ${THEME_COLORS.border.primary}`,
      }}>
        {[
          { label: 'Fraud Risk', value: riskProfile.fraudRisk },
          { label: 'AML Risk', value: riskProfile.amlRisk },
          { label: 'Tx Risk', value: riskProfile.transactionRisk },
          { label: 'Cyber Risk', value: riskProfile.cyberRisk },
          { label: 'Rep. Risk', value: riskProfile.reputationRisk },
        ].map((factor, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              padding: '4px 6px',
              backgroundColor: THEME_COLORS.background.primary,
              borderRadius: '3px',
              border: `1px solid ${THEME_COLORS.border.secondary}`,
            }}
          >
            <span style={{ color: THEME_COLORS.text.secondary }}>{factor.label}</span>
            <span
              style={{
                color: factor.value > 60 ? THEME_COLORS.risk.critical : THEME_COLORS.brand.cyan,
                fontWeight: 'bold',
              }}
            >
              {factor.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
