import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Lock, Download } from "lucide-react";
import { auditEntries } from "@/data/synthetic";
import { useState, useMemo } from "react";

const actionColors: Record<string, string> = {
  Created: "default",
  Generated: "secondary",
  Edited: "warning",
  Approved: "success",
  Filed: "success",
  Reviewed: "default",
  Commented: "secondary",
};

export default function AuditTrail() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return auditEntries;
    const q = search.toLowerCase();
    return auditEntries.filter(
      (e) => e.sarId.toLowerCase().includes(q) || e.user.toLowerCase().includes(q) || e.action.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-4 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Immutable Audit Trail</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Append-only audit log · AES-256 encrypted · {auditEntries.length} entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by SAR ID, user, or action..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>SAR ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Model / Prompt</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-center">Integrity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 30).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium">{entry.sarId}</TableCell>
                  <TableCell className="text-sm">{entry.user}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{entry.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(actionColors[entry.action] as any) || "default"} className="text-[10px]">
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {entry.modelVersion && <span className="block">{entry.modelVersion}</span>}
                    {entry.promptVersionId && <span className="block font-mono">{entry.promptVersionId}</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{entry.details}</TableCell>
                  <TableCell className="text-center">
                    <Lock className="w-3.5 h-3.5 text-success mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
