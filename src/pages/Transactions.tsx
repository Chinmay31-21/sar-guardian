import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  Radio, ArrowDown, AlertTriangle,
} from "lucide-react";
import { useSARData } from "@/context/SARDataContext";
import type { Transaction } from "@/data/synthetic";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

function riskBadgeVariant(score: number) {
  if (score > 80) return "riskHigh" as const;
  if (score > 50) return "riskMedium" as const;
  return "riskLow" as const;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

const PAGE_SIZE = 20;

export default function Transactions() {
  const { transactions, activeInvestigationEntity } = useSARData();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Transaction>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const baselineRef = useRef<number | null>(null);

  useEffect(() => {
    const incomingQ = searchParams.get("q") || "";
    if (incomingQ) {
      setSearch(incomingQ);
      setPage(0);
    }
  }, [searchParams]);

  // Track new arrivals
  useEffect(() => {
    if (baselineRef.current === null) {
      baselineRef.current = transactions.length;
      return;
    }
    const incoming = transactions.length - baselineRef.current;
    if (incoming > 0) {
      setNewCount((prev) => prev + incoming);
      baselineRef.current = transactions.length;
    }
  }, [transactions.length]);

  const filtered = useMemo(() => {
    let data = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.country.toLowerCase().includes(q) ||
          (t.flagType ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      data = data.filter((t) => t.status === statusFilter);
    }
    data.sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return data;
  }, [transactions, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: keyof Transaction) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const flaggedCount = transactions.filter((t) => t.status === "flagged").length;
  const normalCount = transactions.filter((t) => t.status === "pending" || t.status === "cleared").length;

  // Is a transaction CSV-sourced? (ACCT prefix from LiveTransactionBridge)
  const isCsvSource = (t: Transaction) => t.customerId.startsWith("ACCT");

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Transaction Monitoring</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <Radio className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-[10px] font-medium text-green-600 dark:text-green-400">LIVE</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {transactions.length.toLocaleString()} total ·{" "}
            <span className="text-destructive font-medium">{flaggedCount} suspicious</span> ·{" "}
            <span className="text-muted-foreground">{normalCount} normal</span>
          </p>
        </div>
      </div>

      {/* New arrivals banner */}
      {newCount > 0 && (
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors text-left"
          onClick={() => {
            setNewCount(0);
            setPage(0);
            setSortField("date");
            setSortDir("desc");
          }}
        >
          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-primary animate-bounce shrink-0" />
            <span className="text-sm font-medium text-primary">
              {newCount} new transaction{newCount > 1 ? "s" : ""} received — click to view latest
            </span>
          </div>
          <span className="text-xs text-primary/70">Sort by newest</span>
        </button>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, account, country, type…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(0); }}
            >
              <SelectTrigger className="w-44 h-9">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="flagged">Suspicious / Flagged</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="pending">Normal / Pending</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground shrink-0">
              {filtered.length.toLocaleString()} results
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort("id")}
                >
                  <span className="flex items-center gap-1">TX ID <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort("customerName")}
                >
                  <span className="flex items-center gap-1">Account <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-right whitespace-nowrap"
                  onClick={() => toggleSort("amount")}
                >
                  <span className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => toggleSort("date")}
                >
                  <span className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-center whitespace-nowrap"
                  onClick={() => toggleSort("riskScore")}
                >
                  <span className="flex items-center justify-center gap-1">Risk <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Flag Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((tx) => {
                const csv = isCsvSource(tx);
                return (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      "transition-colors",
                      tx.riskScore > 80 && "bg-destructive/5 hover:bg-destructive/10",
                      tx.riskScore > 50 && tx.riskScore <= 80 && "hover:bg-amber-500/5",
                      activeInvestigationEntity === tx.customerId && "ring-1 ring-primary/30 bg-primary/5",
                    )}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{tx.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {tx.riskScore > 80 && (
                          <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                        )}
                        <span className={cn(
                          "text-sm font-medium truncate max-w-[140px]",
                          csv ? "font-mono text-xs" : ""
                        )}>
                          {tx.customerName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatAmount(tx.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{tx.date}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={riskBadgeVariant(tx.riskScore)} className="text-[10px] tabular-nums">
                        {tx.riskScore}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === "flagged" ? "destructive" :
                          tx.status === "under_review" ? "warning" :
                          tx.status === "cleared" ? "success" : "secondary"
                        }
                        className="text-[10px] capitalize whitespace-nowrap"
                      >
                        {tx.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.flagType ? (
                        <span className="text-[10px] font-medium text-muted-foreground capitalize whitespace-nowrap">
                          {tx.flagType.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-mono text-muted-foreground">{tx.country || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[9px] font-medium px-1.5 py-0.5 rounded",
                        csv
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {csv ? "CSV" : "SYN"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Showing {Math.min(page * PAGE_SIZE + 1, filtered.length)}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page + 1} / {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
