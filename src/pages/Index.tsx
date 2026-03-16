import { useState } from "react";
import { AppSidebar } from "@/components/sar/AppSidebar";
import { TopBar } from "@/components/sar/TopBar";
import { DataTicker } from "@/components/sar/DataTicker";
import { DashboardView } from "@/components/sar/DashboardView";
import { CaseInvestigation } from "@/components/sar/CaseInvestigation";
import { SAREditor } from "@/components/sar/SAREditor";
import { NetworkGraph } from "@/components/sar/NetworkGraph";
import { RiskAnalytics } from "@/components/sar/RiskAnalytics";
import { AuditTrail } from "@/components/sar/AuditTrail";

type View = "dashboard" | "investigation" | "sar-editor" | "network" | "analytics" | "audit";

const viewTitles: Record<View, string> = {
  dashboard: "COMMAND CENTER",
  investigation: "CASE INVESTIGATION",
  "sar-editor": "SAR NARRATIVE ENGINE",
  network: "ENTITY NETWORK ANALYSIS",
  analytics: "RISK ANALYTICS",
  audit: "AUDIT TRAIL",
};

const Index = () => {
  const [activeView, setActiveView] = useState<View>("dashboard");

  const renderView = () => {
    switch (activeView) {
      case "dashboard": return <DashboardView />;
      case "investigation": return <CaseInvestigation />;
      case "sar-editor": return <SAREditor />;
      case "network": return <NetworkGraph />;
      case "analytics": return <RiskAnalytics />;
      case "audit": return <AuditTrail />;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopBar />
        <DataTicker />
        <div className="px-3 py-2 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-semibold tracking-widest text-foreground uppercase">
              {viewTitles[activeView]}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">AI LOG: THREAT_081</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            SYSTEM_STATUS: <span className="text-compliance">OPERATIONAL</span>
          </div>
        </div>
        <main className="flex-1 p-2 overflow-hidden">
          {renderView()}
        </main>
        {/* Audit ticker at bottom */}
        <div className="h-6 bg-background border-t border-border flex items-center px-4 overflow-hidden">
          <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
            AUDIT_TRAIL: 14:23:45 A. Sharma viewed Entity Alpha_NY Profile &nbsp;&nbsp;|&nbsp;&nbsp; 14:22:30 System: RAG query completed &nbsp;&nbsp;|&nbsp;&nbsp; 14:20:15 J. Chen approved CASE-2024-079 &nbsp;&nbsp;|&nbsp;&nbsp; 14:18:00 XGBoost model retrained (v4.3)
          </span>
        </div>
      </div>
    </div>
  );
};

export default Index;
