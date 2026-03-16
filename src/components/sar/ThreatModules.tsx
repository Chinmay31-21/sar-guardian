import { CheckCircle, AlertCircle, Clock, Shield } from "lucide-react";

const modules = [
  { name: "KYC Verification", status: "active", detail: "Entity Alpha_X Profile Analysis", icon: CheckCircle },
  { name: "Transaction Monitoring", status: "active", detail: "Suspicious Pattern Detection", icon: Shield },
  { name: "AML Screening", status: "active", detail: "Suspicious Pattern Detection", icon: AlertCircle },
  { name: "Cyber Intelligence", status: "pending", detail: "OSINT/Dark Web Link Check", icon: Clock },
];

export function ThreatModules() {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>Active Threat Modules</span>
        <span className="text-[10px] font-mono text-foreground">Active: {modules.filter(m => m.status === "active").length}</span>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {modules.map(mod => (
          <div
            key={mod.name}
            className={`p-2.5 rounded-sm border ${
              mod.status === "active" ? "border-compliance/30 bg-compliance/5" : "border-border bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <mod.icon className={`w-3 h-3 ${mod.status === "active" ? "text-compliance" : "text-risk-mid"}`} />
              <span className="text-[10px] font-mono uppercase text-foreground">{mod.status === "active" ? "ACTIVE" : "PENDING"}</span>
            </div>
            <p className="text-xs font-medium text-foreground">{mod.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">({mod.detail})</p>
          </div>
        ))}
      </div>
    </div>
  );
}
