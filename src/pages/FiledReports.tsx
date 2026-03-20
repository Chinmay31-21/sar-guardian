import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Shield, Radio } from "lucide-react";
import { useSARData } from "@/context/SARDataContext";

export default function FiledReports() {
  const { sarReports, highlightedEntities, activeInvestigationEntity, pipelinesByEntity } = useSARData();
  const filed = sarReports.filter((s) => s.status === "filed" || s.status === "approved");

  return (
    <div className="space-y-4 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Filed Reports</h1>
        <p className="text-sm text-muted-foreground">{filed.length} reports filed or approved · live from review workflow</p>
      </div>

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
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Filed Date</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead className="text-center">Verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filed.map((sar) => {
                const highlighted = highlightedEntities.includes(sar.customerId);
                const pipeline = pipelinesByEntity[sar.customerId];

                return (
                  <TableRow key={sar.id} className={highlighted ? "bg-primary/5" : undefined}>
                    <TableCell className="font-mono text-xs font-medium">{sar.id}</TableCell>
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
                    <TableCell>
                      {pipeline ? (
                        <Badge variant="outline" className="text-[9px]">{pipeline.modules.length} layers</Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">-</span>
                      )}
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
    </div>
  );
}
