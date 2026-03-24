import React, { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSARData } from "@/context/SARDataContext";

type CountryPoint = {
  name: string;
  lat: number;
  lng: number;
};

type SuspiciousFlow = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  fromCountry: string;
  toCountry: string;
  amount: number;
  riskScore: number;
  timestamp: string;
  riskCategory: "critical" | "high" | "medium" | "low";
  clusterId: string;
  txId: string;
  customerName: string;
  color: string;
  isDomestic: boolean;
};

type PreviewProps = {
  title?: string;
};

const countries: CountryPoint[] = [
  { name: "USA", lat: 37.0902, lng: -95.7129 },
  { name: "United Kingdom", lat: 55.3781, lng: -3.4360 },
  { name: "India", lat: 20.5937, lng: 78.9629 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Germany", lat: 51.1657, lng: 10.4515 },
  { name: "France", lat: 46.2276, lng: 2.2137 },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { name: "UAE", lat: 23.4241, lng: 53.8478 },
  { name: "Canada", lat: 56.1304, lng: -106.3468 },
  { name: "Australia", lat: -25.2744, lng: 133.7751 },
  { name: "Switzerland", lat: 46.8182, lng: 8.2275 },
  { name: "Netherlands", lat: 52.1326, lng: 5.2913 },
  { name: "Mexico", lat: 23.6345, lng: -102.5528 },
  { name: "Brazil", lat: -14.235, lng: -51.9253 },
  { name: "Russia", lat: 61.524, lng: 105.3188 },
  { name: "South Korea", lat: 35.9078, lng: 127.7669 },
];

const FLOW_COLORS = [
  "#5b8def",
  "#4da3a6",
  "#5f6b87",
  "#9a7ec8",
  "#d18f5d",
  "#89a04d",
  "#c86f7f",
  "#3f8a9c",
];

const countryMap = new Map(countries.map((c) => [c.name, c]));

function categoryFromRisk(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function countryCoords(country: string, seed = 0): { lat: number; lng: number } {
  const hit = countryMap.get(country);
  if (hit) return { lat: hit.lat, lng: hit.lng };

  const h = hashCode(`${country}-${seed}`);
  return {
    lat: -55 + (h % 110),
    lng: -170 + (h % 340),
  };
}

function riskBadgeColor(category: SuspiciousFlow["riskCategory"]): string {
  if (category === "critical") return "#f87171";
  if (category === "high") return "#fb923c";
  if (category === "medium") return "#fbbf24";
  return "#94a3b8";
}

export default function ThreatGlobe({
  title = "Real-Time Suspicious Transactions Across Countries",
}: PreviewProps) {
  const navigate = useNavigate();
  const { transactions, beginInvestigation, resolvedClusters } = useSARData();
  const [hoveredFlowId, setHoveredFlowId] = useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  const globeRef = useRef<GlobeMethods | null>(null);

  const suspiciousFlows = useMemo<SuspiciousFlow[]>(() => {
    const suspicious = transactions
      .filter((tx) => !resolvedClusters.includes(tx.customerId))
      .filter((tx) => tx.status === "flagged" || tx.status === "under_review")
      .filter((tx) => tx.riskScore >= 70) // only High / Critical Risk
      .sort((a, b) => b.riskScore - a.riskScore) // review critical first
      .slice(0, 30); // show top 30 without distortion

    const latestByCustomer = new Map<string, typeof suspicious[number]>();
    const flows: SuspiciousFlow[] = [];

    suspicious.forEach((tx) => {
      const previous = latestByCustomer.get(tx.customerId);
      latestByCustomer.set(tx.customerId, tx);

      const sourceCountry = previous?.country || tx.country;
      const destinationCountry = tx.country;
      const source = countryCoords(sourceCountry, hashCode(tx.id));
      const destinationBase = countryCoords(destinationCountry, hashCode(`${tx.id}-to`));
      const domestic = sourceCountry === destinationCountry;
      const destination = domestic
        ? {
            lat: destinationBase.lat + ((hashCode(`${tx.id}-lat`) % 8) - 4) * 0.4,
            lng: destinationBase.lng + ((hashCode(`${tx.id}-lng`) % 8) - 4) * 0.4,
          }
        : destinationBase;

      const riskCategory = categoryFromRisk(tx.riskScore);
      const flowColor = FLOW_COLORS[hashCode(tx.id) % FLOW_COLORS.length];

      flows.push({
        id: tx.id,
        txId: tx.id,
        clusterId: tx.customerId,
        customerName: tx.customerName,
        startLat: source.lat,
        startLng: source.lng,
        endLat: destination.lat,
        endLng: destination.lng,
        fromCountry: sourceCountry,
        toCountry: destinationCountry,
        amount: tx.amount,
        riskScore: tx.riskScore,
        timestamp: tx.date,
        riskCategory,
        color: flowColor,
        isDomestic: domestic,
      });
    });

    return flows;
  }, [transactions, resolvedClusters]);

  const visibleFlows = useMemo(
    () => suspiciousFlows,
    [suspiciousFlows]
  );

  const hoveredFlow = useMemo(
    () => visibleFlows.find((f) => f.id === hoveredFlowId) || null,
    [visibleFlows, hoveredFlowId]
  );

  const selectedFlow = useMemo(
    () => visibleFlows.find((f) => f.id === selectedFlowId) || hoveredFlow,
    [visibleFlows, selectedFlowId, hoveredFlow]
  );

  const activeFlow = selectedFlow || hoveredFlow;

  const points = useMemo<CountryPoint[]>(() => {
    const used = new Map<string, CountryPoint>();
    visibleFlows.forEach((flow) => {
      const src = countryCoords(flow.fromCountry);
      const dst = countryCoords(flow.toCountry);
      used.set(flow.fromCountry, { name: flow.fromCountry, lat: src.lat, lng: src.lng });
      used.set(flow.toCountry, { name: flow.toCountry, lat: dst.lat, lng: dst.lng });
    });
    return [...used.values()];
  }, [visibleFlows]);

  useEffect(() => {

    const globe = globeRef.current;
    if (!globe) return;

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.35;

    const t1 = window.setTimeout(() => {
      globe.pointOfView({ lat: 42, lng: -10, altitude: 1.45 }, 2500);
    }, 2800);

    const t2 = window.setTimeout(() => {
      globe.pointOfView({ lat: 26, lng: 58, altitude: 1.25 }, 2600);
    }, 7600);

    const t3 = window.setTimeout(() => {
      globe.pointOfView({ lat: 18, lng: 95, altitude: 1.22 }, 2600);
    }, 12400);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };

  }, []);

  function onOpenFlagged(flow: SuspiciousFlow) {
    navigate("/flagged", {
      state: {
        focusClusterId: flow.clusterId,
        focusTransactionId: flow.txId,
        flow: {
          customerName: flow.customerName,
          amount: flow.amount,
          riskScore: flow.riskScore,
          fromCountry: flow.fromCountry,
          toCountry: flow.toCountry,
          date: flow.timestamp,
          txId: flow.txId,
          clusterId: flow.clusterId,
          flagType: flow.riskCategory,
        },
      },
    });
  }

  function onInvestigate(flow: SuspiciousFlow) {
    beginInvestigation(flow.clusterId, "flagged_clusters");
    navigate(`/risk-graph?entity=${encodeURIComponent(flow.clusterId)}&action=sar`);
  }

  return (
    <div
      style={{
        height: "650px",
        background: "transparent",
        borderRadius: "12px",
        position: "relative",
        border: "1px solid rgba(148, 163, 184, 0.16)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 18%, rgba(59,130,246,0.08), transparent 38%), radial-gradient(circle at 80% 72%, rgba(15,23,42,0.3), transparent 46%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          zIndex: 3,
          background: "rgba(2, 6, 23, 0.55)",
          color: "#e2e8f0",
          fontSize: "12px",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid rgba(148,163,184,0.22)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ opacity: 0.8, marginTop: "2px" }}>
          {visibleFlows.length} suspicious flows · live monitoring
        </div>
      </div>

      {activeFlow && (
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: "12px",
            width: "330px",
            zIndex: 4,
            background: "rgba(2, 6, 23, 0.72)",
            color: "#e2e8f0",
            borderRadius: "10px",
            border: "1px solid rgba(148,163,184,0.24)",
            padding: "10px",
            backdropFilter: "blur(7px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "12px", fontWeight: 600 }}>Suspicious Transaction</div>
            <span
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: riskBadgeColor(activeFlow.riskCategory),
                fontWeight: 700,
              }}
            >
              {activeFlow.riskCategory}
            </span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11px", lineHeight: 1.55, color: "#cbd5e1" }}>
            <div><strong>From:</strong> {activeFlow.fromCountry}</div>
            <div><strong>To:</strong> {activeFlow.toCountry}</div>
            <div><strong>Amount:</strong> ${activeFlow.amount.toLocaleString()}</div>
            <div><strong>Risk Score:</strong> {activeFlow.riskScore}</div>
            <div><strong>Timestamp:</strong> {activeFlow.timestamp}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => onOpenFlagged(activeFlow)}>
              Open Flagged Transactions
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => onInvestigate(activeFlow)}
            >
              Investigate
            </Button>
          </div>
        </div>
      )}

      <Globe
        ref={globeRef}

        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"

        backgroundColor="rgba(0,0,0,0)"

        arcsData={visibleFlows}

        onArcHover={(flow) => {
          const id = (flow as SuspiciousFlow | null)?.id || null;
          setHoveredFlowId(id);
        }}
        onArcClick={(flow) => {
          const clicked = flow as SuspiciousFlow;
          setSelectedFlowId(clicked.id);
          onOpenFlagged(clicked);
        }}

        arcStartLat={(d: SuspiciousFlow) => d.startLat}
        arcStartLng={(d: SuspiciousFlow) => d.startLng}

        arcEndLat={(d: SuspiciousFlow) => d.endLat}
        arcEndLng={(d: SuspiciousFlow) => d.endLng}

        // Raise the altitude of hovered arcs significantly to avoid overlapping
        arcAltitude={(d: SuspiciousFlow) => {
          if (!hoveredFlowId) return 0.25;
          return d.id === hoveredFlowId ? 0.45 : 0.15;
        }}

        arcColor={(d: SuspiciousFlow) => {
          if (!hoveredFlowId) return [d.color, d.color];
          return d.id === hoveredFlowId ? [d.color, d.color] : ["rgba(71,85,105,0.3)", "rgba(71,85,105,0.3)"];
        }}

        arcDashLength={1.0}
        arcDashGap={0.1}
        arcDashInitialGap={() => Math.random()}
        arcDashAnimateTime={2000}

        arcStroke={(d: SuspiciousFlow) => {
          if (!hoveredFlowId) return d.riskCategory === "critical" ? 1.35 : 1.05;
          return d.id === hoveredFlowId ? 2.2 : 0.7;
        }}

        labelsData={points}

        labelLat={(d: CountryPoint) => d.lat}
        labelLng={(d: CountryPoint) => d.lng}

        labelText={(d: CountryPoint) => d.name}

        labelColor={(d: CountryPoint) => {
          if (!hoveredFlowId) return "#e2e8f0";
          if (activeFlow && (d.name === activeFlow.fromCountry || d.name === activeFlow.toCountry)) return "#f8fafc";
          return "#64748b";
        }}

        labelSize={1.8}
        labelDotRadius={0.4}
        labelAltitude={0.05}
      />

      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          right: "10px",
          zIndex: 3,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "6px",
        }}
      >
        {visibleFlows.slice(0, 4).map((flow) => (
          <button
            key={flow.id}
            onMouseEnter={() => setHoveredFlowId(flow.id)}
            onMouseLeave={() => setHoveredFlowId(null)}
            onClick={() => {
              setSelectedFlowId(flow.id);
              onOpenFlagged(flow);
            }}
            style={{
              textAlign: "left",
              fontSize: "10px",
              lineHeight: 1.3,
              color: "#cbd5e1",
              borderRadius: "7px",
              border: "1px solid rgba(148,163,184,0.2)",
              background: hoveredFlowId === flow.id ? "rgba(30,41,59,0.8)" : "rgba(15,23,42,0.55)",
              padding: "6px",
              cursor: "pointer",
              transition: "all 140ms ease",
            }}
          >
            <div style={{ color: flow.color, fontWeight: 700 }}>{flow.fromCountry} {"->"} {flow.toCountry}</div>
            <div>Risk {flow.riskScore} · ${Math.round(flow.amount / 1000)}K</div>
          </button>
        ))}
      </div>

    </div>
  );
}