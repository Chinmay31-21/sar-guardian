/**
 * Global Transaction Heatmap
 * Geographic heatmap highlighting regions with high suspicious transaction density
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { THEME_COLORS } from '@/lib/theme';

interface HeatmapRegion {
  id: string;
  name: string;
  lat: number;
  lon: number;
  suspiciousTransactionDensity: number; // 0-100
  transactionCount: number;
  totalVolume: number;
  riskLevel: 'extreme' | 'hot' | 'warm' | 'cool' | 'cold';
}

interface GlobalTransactionHeatmapProps {
  regions?: HeatmapRegion[];
  onRegionClick?: (region: HeatmapRegion) => void;
}

/**
 * Get heatmap color based on density
 */
function getHeatmapColor(density: number): string {
  if (density >= 80) return THEME_COLORS.heatmap.extreme;
  if (density >= 60) return THEME_COLORS.heatmap.hot;
  if (density >= 40) return THEME_COLORS.heatmap.warm;
  if (density >= 20) return THEME_COLORS.heatmap.cool;
  return THEME_COLORS.heatmap.cold;
}

/**
 * Global Transaction Heatmap Component
 */
export const GlobalTransactionHeatmap: React.FC<GlobalTransactionHeatmapProps> = ({
  regions = generateDefaultHeatmapRegions(),
  onRegionClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<HeatmapRegion | null>(null);

  const width = 1000;
  const height = 500;

  // Draw heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.fillStyle = THEME_COLORS.background.secondary;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = THEME_COLORS.border.secondary;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 75) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw heat regions
    regions.forEach(region => {
      // Convert lat/lon to canvas coordinates (simple projection)
      const x = ((region.lon + 180) / 360) * width;
      const y = ((90 - region.lat) / 180) * height;

      const density = region.suspiciousTransactionDensity;
      const radius = Math.max(5, Math.min(40, density / 2));

      // Heat gradient circle
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const color = getHeatmapColor(density);

      // Convert hex to rgba
      const hexToRgba = (hex: string, alpha: number): string => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      gradient.addColorStop(0, hexToRgba(color, 0.7));
      gradient.addColorStop(0.7, hexToRgba(color, 0.3));
      gradient.addColorStop(1, hexToRgba(color, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Border circle
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Region label on hover
      if (hoverRef.current?.id === region.id) {
        ctx.fillStyle = THEME_COLORS.background.primary;
        ctx.fillRect(x - 50, y - 30, 100, 60);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 50, y - 30, 100, 60);

        ctx.fillStyle = THEME_COLORS.text.primary;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(region.name, x, y - 15);

        ctx.fillStyle = THEME_COLORS.text.secondary;
        ctx.font = '10px Arial';
        ctx.fillText(`Density: ${density}%`, x, y);
        ctx.fillText(`Vol: $${region.totalVolume / 1000000}M`, x, y + 12);
      }
    });
  }, [regions]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for region hover
    let foundRegion: HeatmapRegion | null = null;
    for (const region of regions) {
      const regX = ((region.lon + 180) / 360) * width;
      const regY = ((90 - region.lat) / 180) * height;
      const distance = Math.sqrt((x - regX) ** 2 + (y - regY) ** 2);

      const radius = Math.max(5, Math.min(40, region.suspiciousTransactionDensity / 2));
      if (distance < radius + 20) {
        foundRegion = region;
        break;
      }
    }

    hoverRef.current = foundRegion;
    // Trigger redraw if needed
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoverRef.current) {
      onRegionClick?.(hoverRef.current);
    }
  };

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
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ color: THEME_COLORS.text.primary, margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          Global Transaction Heatmap
        </h3>
        <p style={{ color: THEME_COLORS.text.tertiary, fontSize: '11px', margin: '4px 0 0 0' }}>
          Suspicious transaction density by region
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleCanvasMouseMove}
        onClick={handleCanvasClick}
        style={{
          backgroundColor: THEME_COLORS.background.secondary,
          borderRadius: '4px',
          border: `1px solid ${THEME_COLORS.border.primary}`,
          cursor: hoverRef.current ? 'pointer' : 'default',
          flex: 1,
        }}
      />

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '12px',
          padding: '8px',
          borderTop: `1px solid ${THEME_COLORS.border.primary}`,
          fontSize: '11px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Extreme (80-100)', color: THEME_COLORS.heatmap.extreme },
          { label: 'Hot (60-80)', color: THEME_COLORS.heatmap.hot },
          { label: 'Warm (40-60)', color: THEME_COLORS.heatmap.warm },
          { label: 'Cool (20-40)', color: THEME_COLORS.heatmap.cool },
          { label: 'Cold (0-20)', color: THEME_COLORS.heatmap.cold },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: item.color,
              }}
            />
            <span style={{ color: THEME_COLORS.text.secondary }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Generate default heatmap regions
 */
function generateDefaultHeatmapRegions(): HeatmapRegion[] {
  return [
    { id: 'h1', name: 'Colombia', lat: 4, lon: -74, suspiciousTransactionDensity: 94, transactionCount: 1240, totalVolume: 485000000, riskLevel: 'extreme' },
    { id: 'h2', name: 'Panama', lat: 8.5, lon: -80.5, suspiciousTransactionDensity: 88, transactionCount: 920, totalVolume: 380000000, riskLevel: 'extreme' },
    { id: 'h3', name: 'Cayman Islands', lat: 19.3, lon: -81.3, suspiciousTransactionDensity: 92, transactionCount: 680, totalVolume: 520000000, riskLevel: 'extreme' },
    { id: 'h4', name: 'UAE', lat: 24, lon: 54, suspiciousTransactionDensity: 76, transactionCount: 850, totalVolume: 420000000, riskLevel: 'hot' },
    { id: 'h5', name: 'Mexico', lat: 23, lon: -102, suspiciousTransactionDensity: 68, transactionCount: 1100, totalVolume: 380000000, riskLevel: 'hot' },
    { id: 'h6', name: 'Hong Kong', lat: 22, lon: 114, suspiciousTransactionDensity: 64, transactionCount: 950, totalVolume: 360000000, riskLevel: 'hot' },
    { id: 'h7', name: 'Switzerland', lat: 47, lon: 8, suspiciousTransactionDensity: 58, transactionCount: 680, totalVolume: 290000000, riskLevel: 'warm' },
    { id: 'h8', name: 'Brazil', lat: -10, lon: -55, suspiciousTransactionDensity: 52, transactionCount: 740, totalVolume: 250000000, riskLevel: 'warm' },
    { id: 'h9', name: 'Singapore', lat: 1.3, lon: 103.8, suspiciousTransactionDensity: 48, transactionCount: 620, totalVolume: 210000000, riskLevel: 'warm' },
    { id: 'h10', name: 'Netherlands', lat: 52, lon: 5, suspiciousTransactionDensity: 44, transactionCount: 580, totalVolume: 195000000, riskLevel: 'warm' },
    { id: 'h11', name: 'UK', lat: 55, lon: -3, suspiciousTransactionDensity: 38, transactionCount: 520, totalVolume: 185000000, riskLevel: 'cool' },
    { id: 'h12', name: 'USA', lat: 37, lon: -95, suspiciousTransactionDensity: 28, transactionCount: 1200, totalVolume: 450000000, riskLevel: 'cool' },
  ];
}