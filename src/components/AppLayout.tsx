import { Outlet, useNavigate } from "react-router-dom";
import AppSidebar from "./sar/AppSidebar";
import { Search, Bell, Menu, X, ShieldCheck, AlertTriangle, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef, useMemo } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useSARData } from "@/context/SARDataContext";
import { useCSVData } from "@/hooks/useCSVData";

const severityBorderColor: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-risk-high",
  medium: "border-l-risk-medium",
  low: "border-l-border",
};

const severityTextColor: Record<string, string> = {
  critical: "text-red-500",
  high: "text-risk-high",
  medium: "text-risk-medium",
  low: "text-muted-foreground",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface GlobalSearchResult {
  id: string;
  type: "transaction" | "sar" | "customer" | "entity";
  title: string;
  subtitle: string;
  route: string;
  entityId?: string;
}

export default function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { profile } = useProfile();
  const {
    threats,
    threatSummary,
    transactions,
    sarReports,
    customers,
    beginInvestigation,
  } = useSARData();
  const { data: csvData } = useCSVData();

  const alertCount = threatSummary.critical + threatSummary.high;

  const searchResults = useMemo<GlobalSearchResult[]>(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];

    const txMatches = transactions
      .filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerId.toLowerCase().includes(q) ||
          t.country.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map<GlobalSearchResult>((t) => ({
        id: `txn-${t.id}`,
        type: "transaction",
        title: `${t.id} · ${t.customerName}`,
        subtitle: `${t.type} · ${t.country} · $${Math.round(t.amount).toLocaleString()}`,
        route: `/transactions?q=${encodeURIComponent(t.id)}`,
        entityId: t.customerId,
      }));

    const sarMatches = sarReports
      .filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.customerId.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map<GlobalSearchResult>((s) => ({
        id: `sar-${s.id}`,
        type: "sar",
        title: `${s.id} · ${s.customerName}`,
        subtitle: `Status: ${s.status} · Confidence: ${s.confidenceScore}%`,
        route: `/case/${s.id}`,
        entityId: s.customerId,
      }));

    const customerMatches = customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.businessType.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map<GlobalSearchResult>((c) => ({
        id: `cust-${c.id}`,
        type: "customer",
        title: `${c.name} (${c.id})`,
        subtitle: `${c.businessType} · ${c.country}`,
        route: "/customers",
        entityId: c.id,
      }));

    const seenEntityIds = new Set<string>();
    const entityMatches = (csvData?.externalRisk || [])
      .filter((e) => e.entity.toLowerCase().includes(q))
      .filter((e) => {
        if (seenEntityIds.has(e.entity)) return false;
        seenEntityIds.add(e.entity);
        return true;
      })
      .slice(0, 3)
      .map<GlobalSearchResult>((e) => ({
        id: `entity-${e.entity}`,
        type: "entity",
        title: `${e.entity}`,
        subtitle: `${e.risk_type} · ${(e.risk_score * 100).toFixed(0)}% risk · ${e.source}`,
        route: `/sar/generate?entity=${encodeURIComponent(e.entity)}`,
        entityId: e.entity,
      }));

    return [...txMatches, ...sarMatches, ...customerMatches, ...entityMatches].slice(0, 10);
  }, [searchQ, transactions, sarReports, customers, csvData]);

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [navigate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSearchSelect(result: GlobalSearchResult) {
    if (result.entityId) {
      beginInvestigation(result.entityId, "search");
    }
    setSearchOpen(false);
    setSearchQ("");
    navigate(result.route);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onNavigate={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-3 sm:px-5 bg-card shrink-0 sticky top-0 z-20">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand for mobile */}
          <div className="md:hidden flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">SAR <span className="text-primary">Gen AI</span></span>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md mx-3 hidden sm:block" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions, SARs, customers..."
              value={searchQ}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  e.preventDefault();
                  handleSearchSelect(searchResults[0]);
                }
              }}
              className="pl-9 bg-muted/50 border-none h-9 text-sm"
            />

            {searchOpen && searchQ.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">
                    No matches found for "{searchQ}".
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSearchSelect(result)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">{result.title}</p>
                          <Badge variant="outline" className="text-[9px] capitalize shrink-0">{result.type}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{result.subtitle}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search */}
            <button
              className="sm:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => navigate("/transactions")}
              aria-label="Open transaction search"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Clock */}
            <span className="hidden lg:block text-xs font-mono text-muted-foreground tabular-nums">
              {clock.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} UTC
            </span>

            {/* Notifications dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Threat notifications"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                    {alertCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-risk-high" />
                      <span className="text-sm font-semibold text-foreground">Live Threat Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">{alertCount} Active</Badge>
                      <button
                        className="text-[11px] text-primary hover:underline"
                        onClick={() => { setNotifOpen(false); navigate("/flagged"); }}
                      >
                        View All
                      </button>
                    </div>
                  </div>

                  {/* Summary bar */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border text-[10px]">
                    {threatSummary.critical > 0 && (
                      <span className="text-red-500 font-semibold">{threatSummary.critical} Critical</span>
                    )}
                    <span className="text-risk-high font-semibold">{threatSummary.high} High</span>
                    <span className="text-risk-medium font-semibold">{threatSummary.medium} Medium</span>
                    <span className="ml-auto text-foreground font-medium">
                      ${(threatSummary.totalAmountAtRisk / 1_000_000).toFixed(1)}M at risk
                    </span>
                  </div>

                  {/* Threat list */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {threats.slice(0, 8).map((threat) => (
                      <button
                        key={threat.id}
                        onClick={() => { setNotifOpen(false); navigate("/flagged"); }}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-l-2 ${severityBorderColor[threat.severity]}`}
                      >
                        <div className="flex items-start gap-2">
                          <TrendingUp className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityTextColor[threat.severity]}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground leading-tight">{threat.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{threat.description}</p>
                            {threat.affectedCustomer && (
                              <p className="text-[10px] text-primary mt-0.5 font-medium">
                                Customer: {threat.affectedCustomer}
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold shrink-0 ml-2 ${severityTextColor[threat.severity]}`}>
                            {threat.riskScore}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {threats.length} threats detected from live dataset
                    </span>
                    <button
                      onClick={() => { setNotifOpen(false); navigate("/analytics"); }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Analytics →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Regulatory Badge */}
            <Badge variant="success" className="hidden lg:inline-flex text-[10px] gap-1">
              <ShieldCheck className="w-3 h-3" /> Regulatory Compliant
            </Badge>

            {/* User Profile — reads from ProfileContext */}
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-primary flex items-center justify-center text-xs font-bold text-white">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(profile.name)}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{profile.role}</p>
              </div>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
