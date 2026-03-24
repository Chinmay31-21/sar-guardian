import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Shield, Radio, Eye, Search, Maximize2, Minimize2 } from "lucide-react";
import { useSARData } from "@/context/SARDataContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSarReportPdfBlob } from "@/lib/pdfExport";
import { cn } from "@/lib/utils";

export default function FiledReports() {
  const { sarReports, highlightedEntities, activeInvestigationEntity, pipelinesByEntity } = useSARData();
  const [searchQ, setSearchQ] = useState("");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; filename: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  const filed = sarReports.filter((s) => s.status === "filed");
  const filteredFiled = useMemo(() => {
    if (!searchQ.trim()) return filed;
    const q = searchQ.toLowerCase();
    return filed.filter((s) =>
      (s.caseId || "").toLowerCase().includes(q) ||
      (s.customerName || "").toLowerCase().includes(q) ||
      (s.customerId || "").toLowerCase().includes(q) ||
      (s.sourceTransactionId || "").toLowerCase().includes(q) ||
      s.transactionIds.some((id) => id.toLowerCase().includes(q))
    );
  }, [filed, searchQ]);

  function openPdfPreview(sarId: string) {
    const sar = sarReports.find((s) => s.id === sarId);
    const report = sar?.finalReportSnapshot || sar?.draftReportSnapshot;
    if (!report) return;
    const { blob, filename } = createSarReportPdfBlob(report, {
      engine: "rule_engine_fallback",
      engineNote: "Filed report preview",
    });
    setPreviewLoading(true);
    setPdfPreview({ url: URL.createObjectURL(blob), filename });
  }

  function closePdfPreview() {
    setPdfPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    setPreviewLoading(false);
    setPdfFullscreen(false);
  }

  return (
    <div className="space-y-4 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Filed Reports</h1>
        <p className="text-sm text-muted-foreground">{filteredFiled.length} filed reports · latest finalized version with filing stamp</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by case ID, transaction ID, or entity"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-3 gap-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-success shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Automatic Transaction Resolution</p>
              <p className="text-xs text-muted-foreground mt-1">
                When a SAR is filed, all linked transactions are automatically marked as resolved and removed from Flagged Clusters. 
                The investigation focus is also cleared temporarily.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeInvestigationEntity && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">
            Highlighting investigation-linked reports for {activeInvestigationEntity}
          </span>
        </div>
      )}

      <Card className="shadow-card">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SAR ID</TableHead>
                <TableHead>Case ID</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Filed Date</TableHead>
                <TableHead>Filed Stamp</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Resolved Txns</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="text-center">Verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiled.map((sar) => {
                const highlighted = highlightedEntities.includes(sar.customerId);
                const pipeline = pipelinesByEntity[sar.customerId];
                const timelineText = (sar.timelineEvents || []).map((e) => e.event.toLowerCase()).join(" ");
                const reviewReached = timelineText.includes("review") || ["review", "approved", "filed"].includes(sar.status);
                const approvalReached = timelineText.includes("approved") || ["approved", "filed"].includes(sar.status);
                const filedReached = sar.status === "filed";

                return (
                  <TableRow key={sar.id} className={highlighted ? "bg-primary/5" : undefined}>
                    <TableCell className="font-mono text-xs font-medium">{sar.id}</TableCell>
                    <TableCell className="font-mono text-xs">{sar.caseId || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{sar.sourceTransactionId || sar.transactionIds[0] || "-"}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <span>{sar.customerName}</span>
                        {highlighted && (
                          <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">investigated</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sar.status === "filed" ? "success" : "default"} className="text-[10px] capitalize gap-1">
                        {sar.status === "filed" && <CheckCircle className="w-3 h-3" />}
                        {sar.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sar.assignedTo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sar.modelUsed}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{sar.confidenceScore}%</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sar.updatedAt}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sar.filingStamp ? (
                        <div className="space-y-0.5">
                          <div className="font-mono">{sar.filingStamp.statusLabel}</div>
                          <div>By {sar.filingStamp.filedBy}</div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5 min-w-[170px]">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={cn("inline-block w-2 h-2 rounded-full", reviewReached ? "bg-amber-500" : "bg-muted")}></span>
                          <span className={reviewReached ? "text-foreground" : "text-muted-foreground"}>Under Review</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={cn("inline-block w-2 h-2 rounded-full", approvalReached ? "bg-primary" : "bg-muted")}></span>
                          <span className={approvalReached ? "text-foreground" : "text-muted-foreground"}>Under Approval</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={cn("inline-block w-2 h-2 rounded-full", filedReached ? "bg-green-500" : "bg-muted")}></span>
                          <span className={filedReached ? "text-foreground" : "text-muted-foreground"}>Filed Report Successfully</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pipeline ? (
                        <Badge variant="outline" className="text-[9px]">{pipeline.modules.length} layers</Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                        <span className="text-xs font-medium text-success">{sar.transactionIds?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() => openPdfPreview(sar.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview PDF
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-success" />
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!pdfPreview} onOpenChange={(open) => { if (!open) closePdfPreview(); }}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden flex flex-col",
            pdfFullscreen
              ? "w-screen h-screen max-w-none max-h-none rounded-none border-0"
              : "w-[min(96vw,1200px)] max-w-none h-[90vh] max-h-[90vh]"
          )}
        >
          <DialogHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-2 pr-8">
              <DialogTitle className="text-sm font-semibold">Filed SAR PDF Preview</DialogTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => setPdfFullscreen((v) => !v)}
              >
                {pdfFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {pdfFullscreen ? "Exit Full Screen" : "Full Screen"}
              </Button>
            </div>
          </DialogHeader>
          <div className="relative flex-1 min-h-0 bg-muted/20">
            {previewLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground bg-background/70">
                Rendering preview...
              </div>
            )}
            {pdfPreview && (
              <iframe
                ref={previewFrameRef}
                src={`${pdfPreview.url}#view=FitH`}
                className={cn("w-full h-full border-0", previewLoading ? "opacity-0" : "opacity-100")}
                title={pdfPreview.filename}
                onLoad={() => setPreviewLoading(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
