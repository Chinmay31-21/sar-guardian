import { motion } from "framer-motion";
import { RiskGauge } from "./RiskGauge";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, CartesianGrid,
} from "recharts";

const velocityData = [
  { day: "Mon", value: 42 }, { day: "Tue", value: 55 }, { day: "Wed", value: 48 },
  { day: "Thu", value: 72 }, { day: "Fri", value: 89 }, { day: "Sat", value: 94 }, { day: "Sun", value: 91 },
];

const structuringData = Array.from({ length: 90 }, (_, i) => ({
  day: i,
  count: Math.floor(Math.random() * 15) + (i > 60 ? 20 : 5),
}));

const peerComparison = [
  { metric: "Txn Volume", entity: 89, peer: 45 },
  { metric: "Velocity", entity: 95, peer: 52 },
  { metric: "Cross-Border", entity: 78, peer: 23 },
  { metric: "Cash Ratio", entity: 72, peer: 38 },
  { metric: "Frequency", entity: 88, peer: 41 },
];

const tooltipStyle = {
  contentStyle: { background: "hsl(222, 47%, 7%)", border: "1px solid hsl(197, 100%, 47%, 0.2)", fontSize: 11 },
};

export function RiskAnalytics() {
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Top Row: Velocity Gauge + Chart */}
      <div className="grid grid-cols-4 gap-2 min-h-0" style={{ flex: "0 0 45%" }}>
        <div className="panel flex flex-col items-center justify-center p-4">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-3">Risk Velocity</span>
          <RiskGauge score={92} label="Current Index" size="lg" />
          <div className="mt-3 text-center">
            <span className="font-display text-2xl font-bold tracking-tighter text-destructive">92.4</span>
            <p className="text-[10px] text-muted-foreground font-mono mt-1">+15.2% FROM BASELINE</p>
          </div>
        </div>
        <div className="col-span-2 panel flex flex-col">
          <div className="panel-header">
            <span>Risk Velocity — 7 Day Trend</span>
          </div>
          <div className="flex-1 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="value" stroke="hsl(0, 84%, 60%)" fill="url(#velGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel flex flex-col">
          <div className="panel-header">
            <span>Model Performance</span>
          </div>
          <div className="p-3 space-y-3">
            {[
              { label: "Precision", value: "94.2%", color: "text-compliance" },
              { label: "Recall", value: "87.5%", color: "text-primary" },
              { label: "F1 Score", value: "90.7%", color: "text-accent" },
              { label: "AUC-ROC", value: "0.962", color: "text-compliance" },
              { label: "False Pos Rate", value: "5.8%", color: "text-risk-mid" },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">{stat.label}</span>
                <span className={`font-display text-sm font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
        <div className="panel flex flex-col">
          <div className="panel-header">
            <span>Structuring Behaviour — 90 Days</span>
          </div>
          <div className="flex-1 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={structuringData}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="hsl(38, 92%, 50%)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel flex flex-col">
          <div className="panel-header">
            <span>Peer Group Comparison</span>
          </div>
          <div className="flex-1 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peerComparison} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis dataKey="metric" type="category" tick={{ fontSize: 9, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="entity" fill="hsl(0, 84%, 60%)" radius={[0, 2, 2, 0]} barSize={8} />
                <Bar dataKey="peer" fill="hsl(197, 100%, 47%, 0.4)" radius={[0, 2, 2, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel flex flex-col">
          <div className="panel-header">
            <span>Typology Distribution</span>
          </div>
          <div className="p-3 space-y-2 flex-1">
            {[
              { type: "Structuring", count: 47, pct: 35 },
              { type: "Layering", count: 32, pct: 24 },
              { type: "Mule Accounts", count: 28, pct: 21 },
              { type: "Rapid Movement", count: 18, pct: 13 },
              { type: "Trade-Based", count: 9, pct: 7 },
            ].map((t, i) => (
              <div key={t.type}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-foreground">{t.type}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{t.count} ({t.pct}%)</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${t.pct}%` }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
