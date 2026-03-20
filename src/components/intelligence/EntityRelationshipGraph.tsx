/**
 * Entity Relationship Graph (Fraud Network Detection)
 * Interactive network visualization showing relationships between accounts, companies, and transactions
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { THEME_COLORS, SHADOWS } from '@/lib/theme';
import { calculateRiskProfile } from '@/lib/intelligenceEngine';
import type { InvestigationEntity, TransactionIntelligence } from '@/lib/intelligenceEngine';

interface NetworkNode {
  id: string;
  label: string;
  type: 'account' | 'entity' | 'intermediary' | 'transaction' | 'beneficiary';
  riskScore: number;
  size: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface NetworkLink {
  source: string;
  target: string;
  type: 'transaction' | 'ownership' | 'connection' | 'suspicious_connection';
  weight: number;
  value?: number;
}

interface EntityGraphProps {
  nodes?: NetworkNode[];
  links?: NetworkLink[];
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
  width?: number;
  height?: number;
}

/**
 * Force-directed graph simulation (simplified physics)
 */
class ForceSimulation {
  nodes: NetworkNode[];
  links: NetworkLink[];
  width: number;
  height: number;
  alpha: number = 1;
  alphaMin: number = 0.001;
  alphaDecay: number = 0.995;
  charge: number = -500;
  linkDistance: number = 50;
  friction: number = 0.8;

  constructor(nodes: NetworkNode[], links: NetworkLink[], width: number, height: number) {
    this.nodes = nodes.map(n => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    }));
    this.links = links;
    this.width = width;
    this.height = height;
  }

  tick() {
    if (this.alpha < this.alphaMin) return;

    // Apply link forces
    this.links.forEach(link => {
      const source = this.nodes.find(n => n.id === link.source)!;
      const target = this.nodes.find(n => n.id === link.target)!;

      const dx = target.x! - source.x!;
      const dy = target.y! - source.y!;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const force = (distance - this.linkDistance) / distance * this.alpha;
      source.vx! += dx * force;
      source.vy! += dy * force;
      target.vx! -= dx * force;
      target.vy! -= dy * force;
    });

    // Apply charge forces
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];

        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const distanceSq = dx * dx + dy * dy || 0.001;
        const distance = Math.sqrt(distanceSq);

        const force = this.charge / distanceSq * this.alpha;
        a.vx! += dx * force / distance;
        a.vy! += dy * force / distance;
        b.vx! -= dx * force / distance;
        b.vy! -= dy * force / distance;
      }
    }

    // Update positions
    this.nodes.forEach(node => {
      if (node.vx === undefined) return;
      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x! += node.vx;
      node.y! += node.vy;

      // Bounce off edges
      if (node.x! < 0) {
        node.x = 0;
        node.vx *= -1;
      } else if (node.x! > this.width) {
        node.x = this.width;
        node.vx *= -1;
      }

      if (node.y! < 0) {
        node.y = 0;
        node.vy *= -1;
      } else if (node.y! > this.height) {
        node.y = this.height;
        node.vy *= -1;
      }
    });

    this.alpha *= this.alphaDecay;
  }
}

/**
 * Get node color based on type and risk
 */
function getNodeColor(node: NetworkNode): string {
  if (node.riskScore >= 80) return THEME_COLORS.network.nodeSuspicious;
  if (node.riskScore >= 60) return THEME_COLORS.network.nodeHighRisk;
  if (node.riskScore >= 40) return THEME_COLORS.network.nodeNormal;
  return THEME_COLORS.network.nodeSafe;
}

/**
 * Get link color based on type
 */
function getLinkColor(link: NetworkLink): string {
  if (link.type === 'suspicious_connection') return THEME_COLORS.network.edgeSuspicious;
  if (link.type === 'transaction') return THEME_COLORS.network.edgeFlow;
  return THEME_COLORS.network.edgeNormal;
}

/**
 * Entity Relationship Graph Component
 */
export const EntityRelationshipGraph: React.FC<EntityGraphProps> = ({
  nodes: propNodes = generateDefaultNetworkData().nodes,
  links: propLinks = generateDefaultNetworkData().links,
  onNodeClick,
  onLinkClick,
  width = 800,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<ForceSimulation | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  // Initialize simulation
  useEffect(() => {
    simulationRef.current = new ForceSimulation(propNodes, propLinks, width, height);
    setIsAnimating(true);
  }, [propNodes, propLinks, width, height]);

  // Animation loop
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const sim = simulationRef.current;
      if (!sim) return;

      // Clear canvas
      ctx.fillStyle = THEME_COLORS.background.secondary;
      ctx.fillRect(0, 0, width, height);

      // Draw links
      sim.links.forEach(link => {
        const source = sim.nodes.find(n => n.id === link.source)!;
        const target = sim.nodes.find(n => n.id === link.target)!;

        ctx.strokeStyle = getLinkColor(link);
        ctx.lineWidth = link.type === 'suspicious_connection' ? 2 : 1;
        ctx.globalAlpha = link.type === 'suspicious_connection' ? 0.8 : 0.3;

        ctx.beginPath();
        ctx.moveTo(source.x!, source.y!);
        ctx.lineTo(target.x!, target.y!);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;

      // Draw nodes
      sim.nodes.forEach(node => {
        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;

        // Node circle
        ctx.fillStyle = getNodeColor(node);
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, node.size, 0, Math.PI * 2);
        ctx.fill();

        // Highlight for hovered/selected
        if (isHovered || isSelected) {
          ctx.strokeStyle = THEME_COLORS.brand.cyan;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Glow effect
          ctx.shadowColor = THEME_COLORS.glow.cyber.shadow;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, node.size + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowColor = 'transparent';
        }

        // Label on hover/selection
        if (isHovered || isSelected) {
          ctx.fillStyle = THEME_COLORS.text.primary;
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(node.label.substring(0, 15), node.x!, node.y! + node.size + 15);
        }
      });

      // Tick animation
      sim.tick();

      if (sim.alpha > sim.alphaMin) {
        animationId = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [width, height, hoveredNode, selectedNode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for node click
    for (const node of simulationRef.current.nodes) {
      const dx = node.x! - x;
      const dy = node.y! - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < node.size + 5) {
        setSelectedNode(node.id);
        onNodeClick?.(node);
        return;
      }
    }

    setSelectedNode(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for node hover
    for (const node of simulationRef.current.nodes) {
      const dx = node.x! - x;
      const dy = node.y! - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < node.size + 5) {
        setHoveredNode(node.id);
        return;
      }
    }

    setHoveredNode(null);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: THEME_COLORS.background.primary,
      borderRadius: '8px',
      border: `1px solid ${THEME_COLORS.border.glow}`,
      padding: '16px',
      boxShadow: `inset 0 0 20px ${THEME_COLORS.glow.cyber.shadow}`,
    }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height - 50}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        style={{
          backgroundColor: THEME_COLORS.background.secondary,
          borderRadius: '4px',
          cursor: hoveredNode ? 'pointer' : 'default',
          border: `1px solid ${THEME_COLORS.border.primary}`,
          flex: 1,
        }}
      />

      {/* Entity Info Pop-up on Selection */}
      {selectedNode && simulationRef.current && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: THEME_COLORS.background.secondary,
          border: `1px solid ${THEME_COLORS.brand.cyan}`,
          borderRadius: '4px',
          fontSize: '12px',
          color: THEME_COLORS.text.secondary,
        }}>
          <div style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold' }}>
            {simulationRef.current.nodes.find(n => n.id === selectedNode)?.label}
          </div>
          <div>
            Risk Score: {simulationRef.current.nodes.find(n => n.id === selectedNode)?.riskScore}/100
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Generate default network data
 */
function generateDefaultNetworkData() {
  const nodes: NetworkNode[] = [
    { id: 'e1', label: 'Shell Corp A', type: 'entity', riskScore: 92, size: 8 },
    { id: 'e2', label: 'Intermediary LLC', type: 'intermediary', riskScore: 75, size: 6 },
    { id: 'a1', label: 'Account XXX123', type: 'account', riskScore: 88, size: 7 },
    { id: 'a2', label: 'Account YYY456', type: 'account', riskScore: 45, size: 5 },
    { id: 'b1', label: 'Beneficiary 1', type: 'beneficiary', riskScore: 85, size: 6 },
    { id: 'e3', label: 'Logistics Co', type: 'entity', riskScore: 35, size: 5 },
    { id: 'i1', label: 'Invoice TXN', type: 'transaction', riskScore: 82, size: 4 },
    { id: 'i2', label: 'Wire TXN', type: 'transaction', riskScore: 72, size: 4 },
    { id: 'e4', label: 'Trade Finance', type: 'intermediary', riskScore: 65, size: 6 },
  ];

  const links: NetworkLink[] = [
    { source: 'e1', target: 'a1', type: 'ownership', weight: 1, value: 5000000 },
    { source: 'a1', target: 'i1', type: 'transaction', weight: 1, value: 1200000 },
    { source: 'i1', target: 'e2', type: 'suspicious_connection', weight: 2, value: 1200000 },
    { source: 'e2', target: 'b1', type: 'connection', weight: 1, value: 900000 },
    { source: 'a1', target: 'i2', type: 'transaction', weight: 1, value: 800000 },
    { source: 'i2', target: 'e3', type: 'connection', weight: 1, value: 800000 },
    { source: 'e1', target: 'e4', type: 'suspicious_connection', weight: 2, value: 2500000 },
    { source: 'e4', target: 'a2', type: 'transaction', weight: 1, value: 500000 },
    { source: 'b1', target: 'e3', type: 'connection', weight: 1, value: 300000 },
  ];

  return { nodes, links };
}
