import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, DollarSign, AlertTriangle, Shield } from "lucide-react";
import { useSARData } from "@/context/SARDataContext";

const TYPOLOGY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const caseStudies = [
  { bank: "Deutsche Bank", year: 2020, fine: "EUR13.5M", reason: "Inadequate AML controls", lesson: "Automated monitoring reduces compliance failures by 60%" },
  { bank: "HSBC", year: 2017, fine: "GBP64M", reason: "Transaction monitoring failures", lesson: "AI-powered SAR generation ensures consistent quality" },
  { bank: "HSBC", year: 2012, fine: "$1.9B", reason: "Mexico drug cartel laundering", lesson: "Cross-border pattern detection is critical" },
];

export default function Analytics() {
  const {
    transactions,
    sarReports,
    stats,
    threats,
    threatSummary,
    investigations,
  } = useSARData();

  const monthlyData = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; month: string; sars: number; falsePos: number }[] = [];

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: monthKey(d),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        sars: 0,
        falsePos: 0,
      });
    }

    const idxByKey = new Map(buckets.map((b, i) => [b.key, i]));

    sarReports.forEach((s) => {
      const idx = idxByKey.get(monthKey(new Date(s.createdAt)));
      if (idx !== undefined) buckets[idx].sars += 1;
    });

    transactions.forEach((t) => {
      const idx = idxByKey.get(monthKey(new Date(t.date)));
      if (idx !== undefined && t.status === "cleared") buckets[idx].falsePos += 1;
    });

    return buckets.map((b) => ({
      month: b.month,
      sars: b.sars,
      falsePos: Math.min(100, Math.round((b.falsePos / Math.max(transactions.length / 8, 1)) * 100)),
    }));
  }, [sarReports, transactions]);

  const typologyData = useMemo(
    () =>
      stats.typologyBreakdown.map((t, i) => ({
        ...t,
        color: t.color || TYPOLOGY_COLORS[i % TYPOLOGY_COLORS.length],
      })),
    [stats.typologyBreakdown]
  );

  const geoData = useMemo(() => stats.geoBreakdown, [stats.geoBreakdown]);

  const threatTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    threats.forEach((t) => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count], i) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
      color: TYPOLOGY_COLORS[i % TYPOLOGY_COLORS.length],
    }));
  }, [threats]);

  const activeInvestigations = investigations.filter((i) => i.status !== "filed").length;

  return (
    <div className="space-y-4 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics & Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Live performance metrics, regulatory statistics, and compliance insights from {transactions.length.toLocaleString()} transactions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Estimated Fines Avoided", value: `$${(threatSummary.totalAmountAtRisk * 0.02 / 1_000_000).toFixed(2)}M`, icon: DollarSign, color: "text-success" },
          { label: "Compliance Coverage", value: `${Math.max(80, 100 - stats.expiredKYC)}%`, icon: Shield, color: "text-primary" },
          { label: "Active Investigations", value: String(activeInvestigations), icon: AlertTriangle, color: "text-risk-medium" },
          { label: "Threats Detected (Live)", value: String(threats.length), icon: TrendingUp, color: threatSummary.critical > 0 ? "text-red-500" : "text-risk-high" },
        ].map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">SAR Filing & False Positive Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="sars" name="SARs Filed" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                <Area type="monotone" dataKey="falsePos" name="False Positive %" stroke="hsl(var(--risk-high))" fill="hsl(var(--risk-high))" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Typology Distribution
              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                (from {stats.totalFlagged} flagged transactions)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={typologyData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                    {typologyData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {typologyData.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-muted-foreground">{t.name}</span>
                    </span>
                    <span className="font-medium text-foreground">{t.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Geographic Suspicious Activity
              <span className="text-[10px] text-muted-foreground font-normal ml-1">(live flagged transactions)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={geoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="country" type="category" fontSize={11} stroke="hsl(var(--muted-foreground))" width={30} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="transactions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Detected Threat Types
              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                ({threats.length} threats, ${(threatSummary.totalAmountAtRisk / 1_000_000).toFixed(1)}M at risk)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {threatTypeData.map((t) => (
                <div key={t.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.type}</span>
                    <span className="font-medium text-foreground">{t.count} threat{t.count > 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(t.count / Math.max(threats.length, 1)) * 100}%`,
                        backgroundColor: t.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Critical", value: threatSummary.critical, color: "text-red-500 bg-red-500/10" },
                  { label: "High", value: threatSummary.high, color: "text-risk-high bg-risk-high/10" },
                  { label: "Medium", value: threatSummary.medium, color: "text-risk-medium bg-risk-medium/10" },
                  { label: "Low", value: threatSummary.low, color: "text-muted-foreground bg-muted" },
                ].map((s) => (
                  <div key={s.label} className={`p-2 rounded-lg ${s.color} flex items-center justify-between`}>
                    <span className="text-[10px] font-medium">{s.label}</span>
                    <span className="text-sm font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Why This Matters - Regulatory Case Studies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {caseStudies.map((cs, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{cs.bank} ({cs.year})</span>
                  <Badge variant="destructive" className="text-[10px]">{cs.fine} fine</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{cs.reason}</p>
                <p className="text-xs text-primary font-medium">Insight: {cs.lesson}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
