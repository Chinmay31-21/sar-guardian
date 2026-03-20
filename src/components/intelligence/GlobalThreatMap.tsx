/**
 * Global Threat Map Visualization
 * Professional enterprise-grade world map showing suspicious financial flows
 * Matched to Barclays Sentinel interface standards
 */

import React, { useState, useMemo } from 'react';
import { THEME_COLORS, SHADOWS, ANIMATIONS } from '@/lib/theme';
import { getGlowShadow } from '@/lib/animations';

interface ThreatNode {
  id: string;
  region: string;
  city?: string;
  lat: number;
  lon: number;
  transactionVolume: number;
  riskScore: number;
  threatLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  type: 'origin' | 'destination' | 'hub';
  transactionCount?: number;
  description?: string;
  details?: {
    vehicleType?: string;
    suspiciousPatterns?: string[];
    context?: string;
  };
}

interface ThreatFlow {
  id: string;
  from: string;
  to: string;
  volume: number;
  riskLevel: number;
  isActive?: boolean;
  description?: string;
}

interface GlobalThreatMapProps {
  nodes?: ThreatNode[];
  flows?: ThreatFlow[];
  onNodeClick?: (node: ThreatNode) => void;
  onFlowClick?: (flow: ThreatFlow) => void;
}

/**
 * Convert latitude/longitude to SVG coordinates (Mercator-like projection)
 */
function latLonToSVG(lat: number, lon: number, width: number, height: number): [number, number] {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

/**
 * Get node color based on threat level
 */
function getNodeColor(threatLevel: string): string {
  const colorMap: Record<string, string> = {
    critical: THEME_COLORS.risk.critical,
    high: THEME_COLORS.risk.high,
    medium: THEME_COLORS.risk.medium,
    low: THEME_COLORS.risk.low,
    safe: THEME_COLORS.risk.safe,
  };
  return colorMap[threatLevel] || THEME_COLORS.brand.neural;
}

/**
 * Get flow line color based on risk
 */
function getFlowColor(riskLevel: number): string {
  if (riskLevel >= 80) return THEME_COLORS.risk.critical;
  if (riskLevel >= 60) return THEME_COLORS.risk.high;
  if (riskLevel >= 40) return THEME_COLORS.risk.medium;
  if (riskLevel >= 20) return THEME_COLORS.risk.low;
  return THEME_COLORS.brand.cyan;
}

/**
 * Simplified world map with continents
 */
const WorldMapBackground: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  return (
    <g>
      {/* Ocean background */}
      <rect x="0" y="0" width={width} height={height} fill={THEME_COLORS.background.secondary} />

      {/* Subtle grid for reference */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={`grid-${i}`}>
          {/* Vertical lines */}
          <line
            x1={(width / 6) * i}
            y1="0"
            x2={(width / 6) * i}
            y2={height}
            stroke={THEME_COLORS.border.primary}
            strokeWidth="0.5"
            opacity="0.15"
          />
          {/* Horizontal lines */}
          <line
            x1="0"
            y1={(height / 3) * i}
            x2={width}
            y2={(height / 3) * i}
            stroke={THEME_COLORS.border.primary}
            strokeWidth="0.5"
            opacity="0.15"
          />
        </g>
      ))}

      {/* Simplified continent landmasses */}
      {/* North America */}
      <polygon
        points={`${(width * 0.15)},${height * 0.2} ${width * 0.28},${height * 0.35} ${width * 0.24},${height * 0.45} ${width * 0.18},${height * 0.38}`}
        fill={THEME_COLORS.background.primary}
        stroke={THEME_COLORS.border.primary}
        strokeWidth="0.5"
        opacity="0.5"
      />
      {/* South America */}
      <polygon
        points={`${width * 0.22},${height * 0.48} ${width * 0.28},${height * 0.65} ${width * 0.25},${height * 0.85}`}
        fill={THEME_COLORS.background.primary}
        stroke={THEME_COLORS.border.primary}
        strokeWidth="0.5"
        opacity="0.5"
      />
      {/* Europe */}
      <polygon
        points={`${width * 0.42},${height * 0.2} ${width * 0.52},${height * 0.22} ${width * 0.53},${height * 0.35} ${width * 0.43},${height * 0.33}`}
        fill={THEME_COLORS.background.primary}
        stroke={THEME_COLORS.border.primary}
        strokeWidth="0.5"
        opacity="0.5"
      />
      {/* Africa */}
      <polygon
        points={`${width * 0.42},${height * 0.35} ${width * 0.55},${height * 0.33} ${width * 0.58},${height * 0.75} ${width * 0.45},${height * 0.78}`}
        fill={THEME_COLORS.background.primary}
        stroke={THEME_COLORS.border.primary}
        strokeWidth="0.5"
        opacity="0.5"
      />
      {/* Asia */}
      <polygon
        points={`${width * 0.58},${height * 0.15} ${width * 0.85},${height * 0.25} ${width * 0.88},${height * 0.55} ${width * 0.65},${height * 0.48}`}
        fill={THEME_COLORS.background.primary}
        stroke={THEME_COLORS.border.primary}
        strokeWidth="0.5"
        opacity="0.5"
      />
    </g>
  );
};

/**
 * Transaction flow path with smooth curves and animation
 */
const FlowPath: React.FC<{
  flow: ThreatFlow;
  nodes: ThreatNode[];
  mapWidth: number;
  mapHeight: number;
  isHighlighted?: boolean;
  onClick?: () => void;
}> = ({ flow, nodes, mapWidth, mapHeight, isHighlighted = false, onClick }) => {
  const fromNode = nodes.find(n => n.id === flow.from);
  const toNode = nodes.find(n => n.id === flow.to);

  if (!fromNode || !toNode) return null;

  const [x1, y1] = latLonToSVG(fromNode.lat, fromNode.lon, mapWidth, mapHeight);
  const [x2, y2] = latLonToSVG(toNode.lat, toNode.lon, mapWidth, mapHeight);

  const flowColor = getFlowColor(flow.riskLevel);
  const lineWidth = Math.max(1.5, flow.volume / 150000);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - 30;

  const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

  return (
    <g key={flow.id} onClick={onClick} style={{ cursor: 'pointer' }} opacity={isHighlighted ? 1 : 0.6}>
      {/* Glow background path */}
      <path
        d={pathData}
        stroke={flowColor}
        strokeWidth={lineWidth * 4}
        fill="none"
        opacity={flow.riskLevel > 70 ? 0.25 : 0.12}
        pointerEvents="none"
      />

      {/* Main flow path */}
      <path
        d={pathData}
        stroke={flowColor}
        strokeWidth={lineWidth}
        fill="none"
        strokeLinecap="round"
        opacity={0.8}
        strokeDasharray={flow.isActive ? '12,6' : 'none'}
        style={{
          animation: flow.isActive ? `flow-animate 20s linear infinite` : 'none',
          filter: isHighlighted ? `drop-shadow(0 0 8px ${flowColor})` : 'none',
        }}
      />

      {/* Animated flow indicator for high-risk flows */}
      {flow.riskLevel > 75 && flow.isActive && (
        <circle r="3" fill={flowColor} opacity="0.9" style={{ animation: `flow-move 20s linear infinite` }}>
          <animateMotion dur="20s" repeatCount="indefinite">
            <mpath href={`#flow-${flow.id}`} />
          </animateMotion>
        </circle>
      )}
    </g>
  );
};

/**
 * Interactive threat node with enhanced visualization
 */
const ThreatNodeViz: React.FC<{
  node: ThreatNode;
  x: number;
  y: number;
  isHighlighted?: boolean;
  onClick?: () => void;
}> = ({ node, x, y, isHighlighted = false, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const nodeColor = getNodeColor(node.threatLevel);
  const nodeSize = Math.max(5, Math.min(14, 5 + node.riskScore / 15));

  return (
    <g
      key={node.id}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer glow rings for critical/high threats */}
      {(node.threatLevel === 'critical' || node.threatLevel === 'high') && (
        <>
          <circle
            cx={x}
            cy={y}
            r={nodeSize * 2.8}
            fill="none"
            stroke={nodeColor}
            strokeWidth="1"
            opacity={isHighlighted || isHovered ? 0.6 : 0.25}
            style={{
              animation: `pulse-ring 2s ease-in-out infinite`,
              transition: `opacity ${ANIMATIONS.fast}`,
            }}
          />
          <circle
            cx={x}
            cy={y}
            r={nodeSize * 1.8}
            fill="none"
            stroke={nodeColor}
            strokeWidth="0.5"
            opacity={isHighlighted || isHovered ? 0.4 : 0.15}
            style={{
              animation: `pulse-ring 3s ease-in-out infinite 0.3s`,
              transition: `opacity ${ANIMATIONS.fast}`,
            }}
          />
        </>
      )}

      {/* Main node circle */}
      <circle
        cx={x}
        cy={y}
        r={nodeSize}
        fill={nodeColor}
        opacity={isHighlighted || isHovered ? 1 : 0.85}
        style={{
          transition: `all ${ANIMATIONS.fast}`,
          filter: isHighlighted ? `drop-shadow(0 0 12px ${nodeColor})` : `drop-shadow(0 0 6px ${nodeColor}40)`,
        }}
      />

      {/* Inner highlight for emphasis */}
      <circle
        cx={x}
        cy={y}
        r={nodeSize * 0.4}
        fill="white"
        opacity={isHighlighted ? 0.3 : 0.1}
        style={{ transition: `opacity ${ANIMATIONS.fast}` }}
      />

      {/* City label below node */}
      {(isHovered || isHighlighted) && node.city && (
        <text
          x={x}
          y={y + nodeSize + 16}
          fill={THEME_COLORS.text.primary}
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          style={{ pointerEvents: 'none' }}
        >
          {node.city}
        </text>
      )}
    </g>
  );
};

/**
 * Global Threat Map Component - Professional interface
 */
export const GlobalThreatMap: React.FC<GlobalThreatMapProps> = ({
  nodes = generateDefaultThreatData().nodes,
  flows = generateDefaultThreatData().flows,
  onNodeClick,
  onFlowClick,
}) => {
  const mapWidth = 1200;
  const mapHeight = 500;
  const [selectedNode, setSelectedNode] = useState<ThreatNode | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<ThreatFlow | null>(null);

  const handleNodeClick = (node: ThreatNode) => {
    setSelectedNode(node);
    setSelectedFlow(null);
    onNodeClick?.(node);
  };

  const handleFlowClick = (flow: ThreatFlow) => {
    setSelectedFlow(flow);
    setSelectedNode(null);
    onFlowClick?.(flow);
  };

  const criticalNodes = nodes.filter(n => n.threatLevel === 'critical');
  const highRiskFlows = flows.filter(f => f.riskLevel >= 75);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: THEME_COLORS.background.primary,
      borderRadius: '8px',
      border: `1px solid ${THEME_COLORS.border.glow}`,
      boxShadow: `inset 0 0 20px ${THEME_COLORS.glow.cyber.shadow}`,
      padding: '16px',
      gap: '12px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '8px',
        borderBottom: `1px solid ${THEME_COLORS.border.primary}`,
      }}>
        <div>
          <h3 style={{
            margin: 0,
            color: THEME_COLORS.text.primary,
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            Global Threat Network Overview
          </h3>
          <p style={{
            margin: '4px 0 0 0',
            color: THEME_COLORS.text.tertiary,
            fontSize: '11px',
          }}>
            Global real-time threat detection
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: '20px',
          fontSize: '11px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: THEME_COLORS.brand.cyan, fontSize: '16px', fontWeight: 'bold' }}>
              {nodes.length}
            </div>
            <div style={{ color: THEME_COLORS.text.tertiary }}>Active Nodes</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: THEME_COLORS.risk.critical, fontSize: '16px', fontWeight: 'bold' }}>
              {criticalNodes.length}
            </div>
            <div style={{ color: THEME_COLORS.text.tertiary }}>Critical</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: THEME_COLORS.brand.gold, fontSize: '16px', fontWeight: 'bold' }}>
              {highRiskFlows.length}
            </div>
            <div style={{ color: THEME_COLORS.text.tertiary }}>Critical Flows</div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '12px',
        minHeight: 0,
      }}>
        {/* Map Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: THEME_COLORS.background.secondary,
          borderRadius: '6px',
          border: `1px solid ${THEME_COLORS.border.primary}`,
          overflow: 'hidden',
        }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            preserveAspectRatio="xMidYMid slice"
            style={{
              backgroundColor: THEME_COLORS.background.secondary,
            }}
          >
            <defs>
              <style>{`
                @keyframes pulse-ring {
                  0%, 100% { r: 14px; opacity: 0.6; }
                  50% { r: 20px; opacity: 0.2; }
                }
                @keyframes flow-animate {
                  from { stroke-dashoffset: 0; }
                  to { stroke-dashoffset: -18; }
                }
                @keyframes flow-move {
                  0% { offset-distance: 0%; }
                  100% { offset-distance: 100%; }
                }
              `}</style>
            </defs>

            <WorldMapBackground width={mapWidth} height={mapHeight} />

            {/* Render flows first */}
            {flows.map(flow => (
              <FlowPath
                key={flow.id}
                flow={flow}
                nodes={nodes}
                mapWidth={mapWidth}
                mapHeight={mapHeight}
                isHighlighted={selectedFlow?.id === flow.id}
                onClick={() => handleFlowClick(flow)}
              />
            ))}

            {/* Render nodes */}
            {nodes.map(node => {
              const [x, y] = latLonToSVG(node.lat, node.lon, mapWidth, mapHeight);
              return (
                <ThreatNodeViz
                  key={node.id}
                  node={node}
                  x={x}
                  y={y}
                  isHighlighted={selectedNode?.id === node.id}
                  onClick={() => handleNodeClick(node)}
                />
              );
            })}
          </svg>
        </div>

        {/* Right Side Panel */}
        {(selectedNode || selectedFlow) && (
          <div style={{
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: THEME_COLORS.background.secondary,
            borderRadius: '6px',
            border: `1px solid ${THEME_COLORS.border.glow}`,
            padding: '12px',
            gap: '12px',
            overflowY: 'auto',
          }}>
            {selectedNode && (
              <>
                {/* Alert Header */}
                <div style={{
                  padding: '10px',
                  backgroundColor: getNodeColor(selectedNode.threatLevel) + '20',
                  borderRadius: '4px',
                  border: `1px solid ${getNodeColor(selectedNode.threatLevel)}`,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '6px',
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: getNodeColor(selectedNode.threatLevel),
                      animation: selectedNode.threatLevel === 'critical' ? 'pulse 1.5s infinite' : 'none',
                    }} />
                    <span style={{
                      color: THEME_COLORS.text.primary,
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      ALERT: {selectedNode.region.toUpperCase()}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: THEME_COLORS.text.secondary,
                  }}>
                    {selectedNode.description || 'Suspicious transaction network detected'}
                  </div>
                </div>

                {/* Entity Details */}
                <div style={{
                  padding: '8px',
                  backgroundColor: THEME_COLORS.background.primary,
                  borderRadius: '4px',
                  fontSize: '11px',
                }}>
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px' }}>REGION</div>
                    <div style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold' }}>
                      {selectedNode.region}
                    </div>
                  </div>
                  {selectedNode.city && (
                    <div style={{ marginBottom: '6px' }}>
                      <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px' }}>CITY</div>
                      <div style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold' }}>
                        {selectedNode.city}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px' }}>RISK SCORE</div>
                    <div style={{ color: getNodeColor(selectedNode.threatLevel), fontWeight: 'bold' }}>
                      {selectedNode.riskScore}/100
                    </div>
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px' }}>TYPE</div>
                    <div style={{ color: THEME_COLORS.text.primary, textTransform: 'capitalize' }}>
                      {selectedNode.type}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px' }}>TRANSACTIONS</div>
                    <div style={{ color: THEME_COLORS.brand.cyan }}>{selectedNode.transactionCount || 0}</div>
                  </div>
                </div>

                {/* Volume */}
                <div style={{
                  padding: '8px',
                  backgroundColor: THEME_COLORS.background.primary,
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '10px', color: THEME_COLORS.text.tertiary, marginBottom: '4px' }}>
                    TRANSACTION VOLUME
                  </div>
                  <div style={{ fontSize: '14px', color: THEME_COLORS.brand.gold, fontWeight: 'bold' }}>
                    ${(selectedNode.transactionVolume / 1000000).toFixed(1)}M
                  </div>
                </div>

                {/* Suspicious Patterns */}
                {selectedNode.details?.suspiciousPatterns && selectedNode.details.suspiciousPatterns.length > 0 && (
                  <div style={{
                    padding: '8px',
                    backgroundColor: THEME_COLORS.background.primary,
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}>
                    <div style={{ color: THEME_COLORS.text.tertiary, marginBottom: '6px', fontWeight: 'bold' }}>
                      SUSPICIOUS PATTERNS
                    </div>
                    {selectedNode.details.suspiciousPatterns.map((pattern, idx) => (
                      <div key={idx} style={{
                        color: THEME_COLORS.text.secondary,
                        marginBottom: idx < selectedNode.details!.suspiciousPatterns!.length - 1 ? '4px' : 0,
                        paddingLeft: '8px',
                      }}>
                        • {pattern}
                      </div>
                    ))}
                  </div>
                )}

                {/* Context */}
                {selectedNode.details?.context && (
                  <div style={{
                    padding: '8px',
                    backgroundColor: THEME_COLORS.background.primary,
                    borderRadius: '4px',
                    fontSize: '10px',
                    lineHeight: '1.4',
                    color: THEME_COLORS.text.secondary,
                  }}>
                    {selectedNode.details.context}
                  </div>
                )}
              </>
            )}

            {selectedFlow && (
              <>
                <div style={{
                  padding: '10px',
                  backgroundColor: getFlowColor(selectedFlow.riskLevel) + '20',
                  borderRadius: '4px',
                  border: `1px solid ${getFlowColor(selectedFlow.riskLevel)}`,
                }}>
                  <div style={{
                    color: THEME_COLORS.text.primary,
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                  }}>
                    TRANSACTION FLOW
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: THEME_COLORS.text.secondary,
                  }}>
                    {selectedFlow.description || 'High-risk money movement detected'}
                  </div>
                </div>

                <div style={{
                  padding: '8px',
                  backgroundColor: THEME_COLORS.background.primary,
                  borderRadius: '4px',
                  fontSize: '11px',
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px', marginBottom: '2px' }}>
                      FROM
                    </div>
                    <div style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold' }}>
                      {nodes.find(n => n.id === selectedFlow.from)?.region}
                    </div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px', marginBottom: '2px' }}>
                      TO
                    </div>
                    <div style={{ color: THEME_COLORS.text.primary, fontWeight: 'bold' }}>
                      {nodes.find(n => n.id === selectedFlow.to)?.region}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: THEME_COLORS.text.tertiary, fontSize: '10px', marginBottom: '2px' }}>
                      RISK LEVEL
                    </div>
                    <div style={{ color: getFlowColor(selectedFlow.riskLevel), fontWeight: 'bold' }}>
                      {selectedFlow.riskLevel}/100
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '8px',
                  backgroundColor: THEME_COLORS.background.primary,
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '10px', color: THEME_COLORS.text.tertiary, marginBottom: '4px' }}>
                    TRANSACTION VOLUME
                  </div>
                  <div style={{ fontSize: '14px', color: THEME_COLORS.brand.gold, fontWeight: 'bold' }}>
                    ${(selectedFlow.volume / 1000000).toFixed(1)}M
                  </div>
                </div>

                <div style={{
                  padding: '8px',
                  backgroundColor: THEME_COLORS.background.primary,
                  borderRadius: '4px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: selectedFlow.isActive ? THEME_COLORS.brand.cyan : THEME_COLORS.text.tertiary,
                    borderRadius: '3px',
                    color: THEME_COLORS.background.primary,
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}>
                    {selectedFlow.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => {
                setSelectedNode(null);
                setSelectedFlow(null);
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: THEME_COLORS.border.primary,
                color: THEME_COLORS.text.primary,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: `all ${ANIMATIONS.fast}`,
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = THEME_COLORS.border.glow;
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = THEME_COLORS.border.primary;
              }}
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '8px',
        borderTop: `1px solid ${THEME_COLORS.border.primary}`,
        fontSize: '10px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {['critical', 'high', 'medium', 'low', 'safe'].map(level => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: getNodeColor(level),
                }}
              />
              <span style={{ color: THEME_COLORS.text.secondary }}>
                {level === 'safe' ? 'Safe' : level.charAt(0).toUpperCase() + level.slice(1)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: THEME_COLORS.text.tertiary }}>
          <div style={{
            width: '16px',
            height: '2px',
            backgroundColor: THEME_COLORS.brand.cyan,
            borderRadius: '1px',
          }} />
          <span>Transaction Flow</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

/**
 * Generate default threat data for demonstration
 */
function generateDefaultThreatData() {
  const nodes: ThreatNode[] = [
    // North America
    {
      id: 'us',
      region: 'United States',
      city: 'New York',
      lat: 40.7,
      lon: -74,
      transactionVolume: 450000000,
      riskScore: 35,
      threatLevel: 'low',
      type: 'hub',
      transactionCount: 1200,
      description: 'Major financial hub with moderate activity',
      details: {
        vehicleType: 'Wire Transfer',
        suspiciousPatterns: ['Frequent cryptocurrency conversions', 'High velocity transactions'],
        context: 'Multiple payment channels from emerging markets detected',
      },
    },
    {
      id: 'mx',
      region: 'Mexico',
      city: 'Mexico City',
      lat: 19.4,
      lon: -99.1,
      transactionVolume: 85000000,
      riskScore: 62,
      threatLevel: 'high',
      type: 'hub',
      transactionCount: 340,
      description: 'High-risk transaction origination point',
      details: {
        vehicleType: 'Structuring',
        suspiciousPatterns: ['Below-threshold transactions', 'Rapid fund movement'],
        context: 'Consistent pattern of small deposits followed by large withdrawals',
      },
    },
    // South America
    {
      id: 'co',
      region: 'Colombia',
      city: 'Bogota',
      lat: 4.7,
      lon: -74.1,
      transactionVolume: 120000000,
      riskScore: 78,
      threatLevel: 'critical',
      type: 'origin',
      transactionCount: 450,
      description: 'Suspicious transaction network detected',
      details: {
        vehicleType: 'Narcotics proceeds',
        suspiciousPatterns: [
          'Suspicious transaction network remittances',
          'Unidentified transaction network',
        ],
        context: 'Source point of illicit fund flows with connection to organized crime networks',
      },
    },
    {
      id: 'br',
      region: 'Brazil',
      city: 'São Paulo',
      lat: -23.5,
      lon: -46.6,
      transactionVolume: 200000000,
      riskScore: 55,
      threatLevel: 'medium',
      type: 'hub',
      transactionCount: 680,
      description: 'Regional redistribution center',
      details: {
        vehicleType: 'Trade-based money laundering',
        suspiciousPatterns: ['Over/under-invoicing', 'Multiple re-routing events'],
        context: 'Active redistribution hub for South American suspicious flows',
      },
    },
    // Europe
    {
      id: 'uk',
      region: 'United Kingdom',
      city: 'London',
      lat: 51.5,
      lon: -0.1,
      transactionVolume: 320000000,
      riskScore: 42,
      threatLevel: 'medium',
      type: 'hub',
      transactionCount: 900,
      description: 'European consolidation center',
      details: {
        vehicleType: 'Wire transfer layering',
        suspiciousPatterns: ['Multiple intermediaries', 'Rapid re-dispatch'],
        context: 'Major European clearing point for international suspicious transactions',
      },
    },
    {
      id: 'ch',
      region: 'Switzerland',
      city: 'Zurich',
      lat: 47.4,
      lon: 8.5,
      transactionVolume: 150000000,
      riskScore: 68,
      threatLevel: 'high',
      type: 'hub',
      transactionCount: 420,
      description: 'Offshore wealth management anomalies',
      details: {
        vehicleType: 'Precious metals',
        suspiciousPatterns: ['Unusual commodity trading', 'Quick value extraction'],
        context: 'Premium value extraction point with complex ownership structures',
      },
    },
    {
      id: 'nl',
      region: 'Netherlands',
      city: 'Amsterdam',
      lat: 52.4,
      lon: 4.9,
      transactionVolume: 200000000,
      riskScore: 55,
      threatLevel: 'medium',
      type: 'hub',
      transactionCount: 580,
      description: 'EU distribution network',
      details: {
        vehicleType: 'Diamond smuggling',
        suspiciousPatterns: ['Bulk commodity purchase', 'Rush shipments'],
        context: 'Commodities hub for rapid portfolio restructuring',
      },
    },
    // Middle East
    {
      id: 'ae',
      region: 'UAE',
      city: 'Dubai',
      lat: 25.2,
      lon: 55.3,
      transactionVolume: 180000000,
      riskScore: 72,
      threatLevel: 'high',
      type: 'destination',
      transactionCount: 510,
      description: 'Gold trading anomaly detection',
      details: {
        vehicleType: 'Hawala alternative banking',
        suspiciousPatterns: ['Informal value transfer', 'No documentation flow'],
        context: 'Major informal banking hub with $XX billion annual untracked flows',
      },
    },
    // Asia-Pacific
    {
      id: 'hk',
      region: 'Hong Kong',
      city: 'Central',
      lat: 22.3,
      lon: 114.2,
      transactionVolume: 290000000,
      riskScore: 65,
      threatLevel: 'high',
      type: 'hub',
      transactionCount: 750,
      description: 'Asian financial redistribution',
      details: {
        vehicleType: 'Trade finance',
        suspiciousPatterns: ['Invoice inflation', 'Complex BL amendments'],
        context: 'Critical node in Asia-Pacific trade-based money laundering network',
      },
    },
    {
      id: 'sg',
      region: 'Singapore',
      city: 'Marina Bay',
      lat: 1.3,
      lon: 103.8,
      transactionVolume: 210000000,
      riskScore: 48,
      threatLevel: 'medium',
      type: 'hub',
      transactionCount: 620,
      description: 'Regional compliance checkpoint',
      details: {
        vehicleType: 'Structured transactions',
        suspiciousPatterns: ['Multi-entity routing', 'Cross-border shell usage'],
        context: 'Frequent layering point for Southeast Asian suspicious activity',
      },
    },
    {
      id: 'kn',
      region: 'Cayman Islands',
      city: 'Georgetown',
      lat: 19.3,
      lon: -81.4,
      transactionVolume: 95000000,
      riskScore: 85,
      threatLevel: 'critical',
      type: 'destination',
      transactionCount: 280,
      description: 'Offshore intermediary shell network',
      details: {
        vehicleType: 'Entity ownership obscuring',
        suspiciousPatterns: ['Multiple beneficial owners', 'Dormant activation'],
        context: 'Highest concentration of shell entities in regional fund flows',
      },
    },
    {
      id: 'pa',
      region: 'Panama',
      city: 'Panama City',
      lat: 8.9,
      lon: -79.5,
      transactionVolume: 110000000,
      riskScore: 82,
      threatLevel: 'critical',
      type: 'destination',
      transactionCount: 320,
      description: 'Primary illicit capital gateway',
      details: {
        vehicleType: 'Entity structuring',
        suspiciousPatterns: ['Shell company activation', 'Rapid fund extraction'],
        context: 'Largest banking secrecy jurisdiction handling cross-border illicit capital',
      },
    },
  ];

  const flows: ThreatFlow[] = [
    { id: 'f1', from: 'co', to: 'mx', volume: 45000000, riskLevel: 85, isActive: true, description: 'High-velocity narcotics proceeds transfer' },
    { id: 'f2', from: 'co', to: 'us', volume: 65000000, riskLevel: 78, isActive: true, description: 'Drug trafficking fund routing' },
    { id: 'f3', from: 'co', to: 'kn', volume: 38000000, riskLevel: 92, isActive: true, description: 'Offshore intermediary deposit' },
    { id: 'f4', from: 'mx', to: 'us', volume: 52000000, riskLevel: 62, isActive: false, description: 'Cross-border fund consolidation' },
    { id: 'f5', from: 'br', to: 'uk', volume: 78000000, riskLevel: 55, isActive: false, description: 'South American redistribution to Europe' },
    { id: 'f6', from: 'br', to: 'ae', volume: 45000000, riskLevel: 68, isActive: true, description: 'Emerging markets commodities purchase' },
    { id: 'f7', from: 'uk', to: 'ch', volume: 85000000, riskLevel: 58, isActive: false, description: 'Wealth management transfer' },
    { id: 'f8', from: 'ch', to: 'hk', volume: 62000000, riskLevel: 72, isActive: true, description: 'Value extraction to Asia-Pacific' },
    { id: 'f9', from: 'ae', to: 'sg', volume: 48000000, riskLevel: 64, isActive: false, description: 'Informal alternative banking' },
    { id: 'f10', from: 'hk', to: 'nl', volume: 71000000, riskLevel: 61, isActive: false, description: 'Asian to European redistribution' },
    { id: 'f11', from: 'sg', to: 'pa', volume: 92000000, riskLevel: 88, isActive: true, description: 'Critical flow to primary secrecy jurisdiction' },
    { id: 'f12', from: 'nl', to: 'kn', volume: 58000000, riskLevel: 75, isActive: true, description: 'European offshore funnel' },
  ];

  return { nodes, flows };
}
