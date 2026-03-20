import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useSARData } from "@/context/SARDataContext";

export default function Customers() {
  const { customers } = useSARData();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.businessType.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-4 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Database</h1>
        <p className="text-sm text-muted-foreground">{customers.length} customer profiles · live context</p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Business Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-center">Accounts</TableHead>
                <TableHead>Risk Rating</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead className="text-center">Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.businessType}</TableCell>
                  <TableCell className="text-xs">{c.country}</TableCell>
                  <TableCell className="text-center text-sm">{c.accounts.length}</TableCell>
                  <TableCell>
                    <Badge variant={c.riskRating === "high" ? "riskHigh" : c.riskRating === "medium" ? "riskMedium" : "riskLow"} className="text-[10px] capitalize">
                      {c.riskRating}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.kycStatus === "verified" ? "success" : c.kycStatus === "expired" ? "destructive" : "warning"} className="text-[10px] capitalize">
                      {c.kycStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {c.flagCount > 0 && (
                      <span className="text-xs font-medium text-risk-high">{c.flagCount}</span>
                    )}
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
