import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Tooltip,
} from "recharts";

const riskTimeline = [
  { time: "10:00", score: 45 }, { time: "11:00", score: 52 }, { time: "12:00", score: 67 },
  { time: "13:00", score: 78 }, { time: "14:00", score: 92 }, { time: "15:00", score: 88 },
];

const geoDensity = [
  { city: "London", aml: 800, fraud: 600, cyber: 200 },
  { city: "NY", aml: 700, fraud: 450, cyber: 350 },
  { city: "HK", aml: 500, fraud: 400, cyber: 300 },
  { city: "SG", aml: 300, fraud: 250, cyber: 150 },
  { city: "Tokyo", aml: 200, fraud: 150, cyber: 100 },
];

const radarData = [
  { subject: "KYC", A: 80 }, { subject: "Fraud", A: 92 },
  { subject: "AML", A: 88 }, { subject: "Cyber", A: 45 },
  { subject: "Txn", A: 72 },
];

export function RiskTimeline() {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>Risk Scoring — Real Time</span>
      </div>
      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={riskTimeline}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "hsl(222, 47%, 7%)", border: "1px solid hsl(197, 100%, 47%, 0.2)", fontSize: 11 }}
              labelStyle={{ color: "hsl(210, 40%, 92%)" }}
            />
            <Area type="monotone" dataKey="score" stroke="hsl(0, 84%, 60%)" fill="url(#riskGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GeoDensityChart() {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>Geographical Threat Density</span>
      </div>
      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={geoDensity}>
            <XAxis dataKey="city" tick={{ fontSize: 10, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215, 16%, 50%)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "hsl(222, 47%, 7%)", border: "1px solid hsl(197, 100%, 47%, 0.2)", fontSize: 11 }}
            />
            <Bar dataKey="aml" stackId="a" fill="hsl(197, 100%, 47%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fraud" stackId="a" fill="hsl(0, 84%, 60%)" />
            <Bar dataKey="cyber" stackId="a" fill="hsl(38, 92%, 50%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function EntityRadar() {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>Entity Risk Profile</span>
      </div>
      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(215, 16%, 50%, 0.2)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(215, 16%, 50%)" }} />
            <Radar dataKey="A" stroke="hsl(185, 100%, 50%)" fill="hsl(185, 100%, 50%)" fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
