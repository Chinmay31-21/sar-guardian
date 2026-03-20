import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, ChevronLeft, Edit } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSARData } from "@/context/SARDataContext";

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { sarReports, transactions } = useSARData();

  const sar = sarReports.find((s) => s.id === caseId);
  if (!sar) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">Case not found</p>
        <Button variant="outline" onClick={() => navigate("/sar/queue")} className="mt-4">
          Back to Queue
        </Button>
      </div>
    );
  }

  const relatedTxs = transactions.filter((t) => sar.transactionIds.includes(t.id));

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/sar/queue")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Queue
        </button>
        <div className="text-sm text-muted-foreground">
          Region: <span className="font-semibold">US-East</span>
        </div>
      </div>

      {/* Case Header Card */}
      <Card className="shadow-lg border-2 border-primary/10">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Case ID</p>
              <p className="text-lg font-bold">{sar.id}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Customer</p>
              <p className="text-base font-semibold">{sar.customerName}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Priority</p>
              {sar.priority === "high" && <Badge variant="riskHigh" className="capitalize text-[11px]">{sar.priority}</Badge>}
              {sar.priority === "medium" && <Badge variant="riskMedium" className="capitalize text-[11px]">{sar.priority}</Badge>}
              {sar.priority === "low" && <Badge variant="riskLow" className="capitalize text-[11px]">{sar.priority}</Badge>}
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Deadline</p>
              <p className="text-sm font-medium">{sar.deadline}</p>
              <p className="text-xs text-muted-foreground">{sar.daysRemaining}d remaining</p>
            </div>
            <div className="flex gap-2 items-end">
              <Badge variant={sar.status === "filed" ? "success" : sar.status === "approved" ? "default" : sar.status === "review" ? "warning" : "secondary"} className="capitalize text-[11px]">
                {sar.status}
              </Badge>
              {sar.status !== "filed" && <Button size="sm" className="text-xs">Submit for Review</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Transactions</CardTitle>
              <p className="text-xs text-muted-foreground">{relatedTxs.length} related transactions</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {relatedTxs.map((tx) => (
                  <div key={tx.id} className="p-2.5 rounded-md bg-muted/50 space-y-1">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">{tx.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Amount</p>
                        <p className="text-sm font-medium">${(tx.amount / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">{tx.type}</p>
                      {tx.flagType && <Badge variant="riskHigh" className="text-[9px] capitalize">{tx.flagType}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sar.timelineEvents?.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1" />
                      {i < (sar.timelineEvents?.length || 0) - 1 && (
                        <div className="absolute left-1.5 top-4 w-0.5 h-8 bg-border" />
                      )}
                    </div>
                    <div className="pb-2">
                      <p className="text-xs font-semibold text-muted-foreground">{event.date}</p>
                      <p className="text-xs text-foreground">{event.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center column - Narrative */}
        <div>
          <Card className="shadow-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">SAR Narrative</CardTitle>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">AI Generated</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground border-l-4 border-primary pl-3">
                  {sar.narrative}
                </p>
                {sar.evidenceAnchors && sar.evidenceAnchors.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Evidence Anchors</p>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-foreground">{sar.evidenceAnchors[0]}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Risk & Rules */}
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Risk Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sar.riskBreakdown?.map((risk, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-foreground">{risk.label}</span>
                    <span className="text-xs font-bold text-primary">{risk.value}%</span>
                  </div>
                  <Progress value={risk.value} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Trigger Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sar.triggerRules?.map((rule) => (
                <div key={rule.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{rule.id}: {rule.name}</p>
                    <p className="text-xs text-muted-foreground">Confidence: {rule.confidence}%</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Model Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground font-medium">Model</p>
                <p className="text-foreground font-semibold">{sar.modelUsed}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Prompt Version</p>
                <p className="text-foreground font-semibold">{sar.promptVersion}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Confidence Score</p>
                <p className="text-foreground font-semibold">{sar.confidenceScore}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subject Information */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Subject Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Entity Name</p>
              <p className="text-sm font-medium">{sar.customerName}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Entity Type</p>
              <p className="text-sm font-medium">{sar.entityType || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">EIN/TIN</p>
              <p className="text-sm font-medium">{sar.ein}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-1">Industry</p>
              <p className="text-sm font-medium">{sar.industryType || "N/A"}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-2">Primary Address</p>
            <p className="text-sm text-foreground">{sar.address}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
