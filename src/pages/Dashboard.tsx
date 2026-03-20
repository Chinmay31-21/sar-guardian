import {
  FileText,
  Clock,
  Target,
  Zap,
  Plus,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  Shield,
  CheckCircle,
  TrendingUp,
  Activity,
  Radio,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MetricCard from "@/components/MetricCard";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useSARData } from "@/context/SARDataContext";
import { GlobalThreatMap } from "@/components/intelligence/GlobalThreatMap";
import { EntityRelationshipGraph } from "@/components/intelligence/EntityRelationshipGraph";
import { RiskRadarChart } from "@/components/intelligence/RiskRadarChart";
import { InvestigationTimeline } from "@/components/intelligence/InvestigationTimeline";
import { RealTimeAlertFeed } from "@/components/intelligence/RealTimeAlertFeed";
import { GlobalTransactionHeatmap } from "@/components/intelligence/GlobalTransactionHeatmap";
import { SARNarrativePanel } from "@/components/intelligence/SARNarrativePanel";
import { SystemHealthIndicators } from "@/components/intelligence/SystemHealthIndicators";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-500",
  high: "text-risk-high",
  medium: "text-risk-medium",
  low: "text-muted-foreground",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "border-l-red-500 bg-red-500/5",
  high: "border-l-risk-high bg-risk-high/5",
  medium: "border-l-risk-medium bg-risk-medium/5",
  low: "border-l-border bg-muted/30",
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "threats" | "risk" | "timeline" | "alerts" | "health">("overview");
  const {
    transactions,
    sarReports,
    stats,
    threats,
    threatSummary,
    activeInvestigationEntity,
    investigations,
  } = useSARData();

  const monthlyTrend = useMemo(() => {
    const buckets: { key: string; month: string; sars: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: monthKey(d),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        sars: 0,
      });
    }

    const idxByKey = new Map(buckets.map((b, idx) => [b.key, idx]));
    sarReports.forEach((sar) => {
      const d = new Date(sar.createdAt);
      const idx = idxByKey.get(monthKey(d));
      if (idx !== undefined) buckets[idx].sars += 1;
    });

    return buckets;
  }, [sarReports]);

  const metrics = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const filedThisMonth = sarReports.filter((s) => {
      const d = new Date(s.updatedAt || s.createdAt);
      return s.status === "filed" && d.getMonth() === month && d.getFullYear() === year;
    }).length;

    const filedThisYear = sarReports.filter((s) => {
      const d = new Date(s.updatedAt || s.createdAt);
      return s.status === "filed" && d.getFullYear() === year;
    }).length;

    const pendingReviews = sarReports.filter((s) => s.status === "review").length;
    const urgentReviews = sarReports.filter(
      (s) => s.status === "review" && s.daysRemaining > 0 && s.daysRemaining <= 2
    ).length;

    const falsePositiveRate =
      transactions.length > 0
        ? Math.round(
            (transactions.filter((t) => t.status === "cleared").length / transactions.length) * 1000
          ) / 10
        : 0;

    const processingHours = sarReports
      .filter((s) => s.updatedAt && s.createdAt)
      .map((s) => {
        const start = new Date(s.createdAt);
        const end = new Date(s.updatedAt);
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return Number.isFinite(diff) && diff >= 0 ? diff : 0;
      });

    const avgProcessingTime = processingHours.length
      ? Math.round((processingHours.reduce((sum, v) => sum + v, 0) / processingHours.length) * 10) /
        10
      : 0;

    return {
      filedThisMonth,
      filedThisYear,
      pendingReviews,
      urgentReviews,
      falsePositiveRate,
      avgProcessingTime,
    };
  }, [sarReports, transactions]);

  const monitoringPreview = useMemo(() => transactions.slice(0, 8), [transactions]);

  const activeInvestigation = useMemo(
    () => investigations.find((i) => i.entityId === activeInvestigationEntity),
    [investigations, activeInvestigationEntity]
  );

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">AML Compliance Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Live CSV monitoring · {transactions.length.toLocaleString()} transactions analysed · {threats.length} threats detected
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => navigate("/sar/generate")} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> New SAR
          </Button>
          <Button variant="outline" onClick={() => navigate("/sar/queue")} className="gap-2 w-full sm:w-auto">
            <ClipboardList className="w-4 h-4" /> Review Queue
          </Button>
          <Button variant="outline" onClick={() => navigate("/analytics")} className="gap-2 w-full sm:w-auto hidden sm:flex">
            <BarChart3 className="w-4 h-4" /> Analytics
          </Button>
        </div>
      </div>

      {/* Intelligence Dashboard Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
        {[
          { id: "overview", label: "📊 Overview" },
          { id: "threats", label: "🌍 Threat Map" },
          { id: "risk", label: "⚖️ Risk Radar" },
          { id: "timeline", label: "📅 Timeline" },
          { id: "alerts", label: "🚨 Alerts" },
          { id: "health", label: "💚 Health" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "overview" | "threats" | "risk" | "timeline" | "alerts" | "health")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab - Traditional Dashboard */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {activeInvestigation && (
            <Card className="border-primary/30 bg-primary/5 shadow-card">
              <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary animate-pulse" />
                  <p className="text-sm font-medium text-foreground">
                    Investigation focus active: <span className="font-mono text-primary">{activeInvestigation.entityId}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate(`/sar/generate?entity=${activeInvestigation.entityId}`)}
                >
                  Open Investigation Context
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="SARs Filed"
          value={metrics.filedThisMonth}
          subtitle={`${metrics.filedThisYear} this year`}
          icon={FileText}
        />
        <MetricCard
          title="Pending Reviews"
          value={metrics.pendingReviews}
          subtitle={`${metrics.urgentReviews} urgent`}
          icon={Clock}
        />
        <MetricCard
          title="False Positive Rate"
          value={`${metrics.falsePositiveRate}%`}
          subtitle="derived from live outcomes"
          icon={Target}
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${metrics.avgProcessingTime}h`}
          subtitle="review-to-update cycle"
          icon={Zap}
        />
      </div>

      <Card className="border-risk-high/30 bg-risk-high/5 shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-risk-high animate-pulse" />
              <CardTitle className="text-sm font-semibold">
                Live Threat Intelligence
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/flagged")} className="text-xs text-risk-high hover:text-risk-high">
              Investigate All -&gt;
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {threatSummary.critical > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] gap-1">
                <AlertTriangle className="w-3 h-3" /> {threatSummary.critical} Critical
              </Badge>
            )}
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="w-3 h-3" /> {threatSummary.high} High
            </Badge>
            <Badge variant="warning" className="text-[10px]">{threatSummary.medium} Medium</Badge>
            <Badge variant="secondary" className="text-[10px]">{threatSummary.low} Low</Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">
              ${(threatSummary.totalAmountAtRisk / 1_000_000).toFixed(1)}M at risk · {stats.totalFlagged} flagged txns · {stats.expiredKYC} expired KYC · {stats.highRiskCustomers} high-risk customers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {threats.slice(0, 4).map((threat) => (
              <button
                key={threat.id}
                onClick={() => navigate("/flagged")}
                className={`text-left p-3 rounded-lg border-l-2 transition-colors hover:opacity-80 ${SEVERITY_BG[threat.severity]}`}
              >
                <div className="flex items-start gap-2">
                  <TrendingUp className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${SEVERITY_COLOR[threat.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground leading-tight">{threat.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{threat.description}</p>
                    {threat.affectedCustomer && (
                      <p className="text-[10px] text-primary font-medium mt-0.5">{threat.affectedCustomer}</p>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold shrink-0 ${SEVERITY_COLOR[threat.severity]}`}>
                    {threat.riskScore}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Continuous Transaction Monitoring</CardTitle>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate("/transactions")}>View All Transactions <ArrowRight className="w-3 h-3" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {monitoringPreview.map((tx) => (
            <button
              key={tx.id}
              onClick={() => navigate(`/transactions?q=${encodeURIComponent(tx.id)}`)}
              className="w-full text-left flex items-center justify-between p-2.5 rounded-md bg-muted/40 hover:bg-muted transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{tx.id} · {tx.customerName}</p>
                <p className="text-[10px] text-muted-foreground">{tx.type} · {tx.country} · {tx.date}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-xs font-mono font-semibold">{formatAmount(tx.amount)}</p>
                <Badge variant={tx.riskScore >= 80 ? "riskHigh" : tx.riskScore >= 50 ? "riskMedium" : "riskLow"} className="text-[9px] mt-0.5">
                  Risk {tx.riskScore}
                </Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Risk Distribution
              <span className="text-[10px] text-muted-foreground font-normal ml-1">({transactions.length} txns)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={stats.riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {stats.riskDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {stats.riskDistribution.map((r) => (
                <div key={r.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-muted-foreground">{r.name}: {r.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">SAR Filing Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="sars" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent SAR Reports</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/sar/queue")} className="text-xs">View All</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[220px] overflow-y-auto">
            {sarReports.slice(0, 6).map((sar) => {
              const highlighted = sar.customerId === activeInvestigationEntity;
              return (
                <div
                  key={sar.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    highlighted ? "bg-primary/10 border border-primary/30" : "bg-muted/50 hover:bg-muted"
                  }`}
                  onClick={() => navigate(`/case/${sar.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {sar.status === "filed" ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : sar.status === "approved" ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{sar.id}</p>
                      <p className="text-[10px] text-muted-foreground">{sar.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        sar.status === "filed"
                          ? "success"
                          : sar.status === "approved"
                            ? "default"
                            : sar.status === "review"
                              ? "warning"
                              : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {sar.status}
                    </Badge>
                    {sar.daysRemaining > 0 && sar.daysRemaining <= 2 && (
                      <span className="text-[10px] text-risk-high font-medium">{sar.daysRemaining}d left</span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
        </div>
      )}

      {/* Threat Map Tab */}
      {activeTab === "threats" && (
        <Card className="shadow-card border-primary/20 h-[500px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Global Threat Intelligence Map</CardTitle>
          </CardHeader>
          <CardContent className="h-full">
            <GlobalThreatMap />
          </CardContent>
        </Card>
      )}

      {/* Risk Radar Tab */}
      {activeTab === "risk" && (
        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="shadow-card border-primary/20 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Multi-Dimensional Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent className="h-[450px] flex items-center justify-center">
              <RiskRadarChart width={350} height={350} />
            </CardContent>
          </Card>
          <Card className="shadow-card border-primary/20 flex-1 h-[500px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">SAR Narrative Generation</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto">
              <SARNarrativePanel />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <Card className="shadow-card border-primary/20 h-[600px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Investigation Timeline & Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto">
            <InvestigationTimeline />
          </CardContent>
        </Card>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-card border-primary/20 h-[500px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Real-Time Alert Feed</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto">
              <RealTimeAlertFeed />
            </CardContent>
          </Card>
          <Card className="shadow-card border-primary/20 h-[500px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Transaction Heatmap</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto">
              <GlobalTransactionHeatmap />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Health Tab */}
      {activeTab === "health" && (
        <Card className="shadow-card border-primary/20 h-[500px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">System Health & Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto">
            <SystemHealthIndicators />
          </CardContent>
        </Card>
      )}

      {/* Entity Network (always visible as bonus) */}
      {activeTab === "overview" && (
        <Card className="shadow-card border-primary/20 mt-8">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Fraud Network Visualization</CardTitle>
            <Badge variant="outline" className="text-xs">Advanced</Badge>
          </CardHeader>
          <CardContent className="h-[400px]">
            <EntityRelationshipGraph width={800} height={400} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
