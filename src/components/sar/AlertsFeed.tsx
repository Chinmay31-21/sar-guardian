import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";

const alerts = [
  { id: "THR_081", entity: "Entity Alpha_X", type: "ABNORMAL VELOCITY", risk: 98.2, time: "1 hour ago", priority: "CRITICAL" as const },
  { id: "THR_079", entity: "Entity Alpha_NY", type: "STRUCTURING", risk: 91.5, time: "3 hours ago", priority: "CRITICAL" as const },
  { id: "THR_074", entity: "Entity Beta_LDN", type: "LAYERING", risk: 87.3, time: "5 hours ago", priority: "HIGH" as const },
  { id: "THR_071", entity: "Entity Gamma_HK", type: "MULE ACCOUNT", risk: 82.1, time: "7 hours ago", priority: "HIGH" as const },
  { id: "THR_068", entity: "Entity Delta_SG", type: "RAPID MOVEMENT", risk: 76.8, time: "8 hours ago", priority: "MEDIUM" as const },
];

export function AlertsFeed() {
  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>Suspicious Transaction Alerts</span>
        <span className="text-destructive text-[10px]">● LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {alerts.map((alert, i) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="px-3 py-2.5 border-b border-border hover:bg-muted/30 cursor-pointer transition-colors group"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-3 h-3 ${alert.priority === "CRITICAL" ? "text-destructive" : alert.priority === "HIGH" ? "text-risk-mid" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-mono uppercase tracking-wider ${alert.priority === "CRITICAL" ? "text-destructive" : "text-risk-mid"}`}>
                  {alert.priority}
                </span>
              </div>
              <span className="font-display text-lg tracking-tighter text-destructive font-semibold">{alert.risk}</span>
            </div>
            <p className="text-xs text-foreground font-medium">{alert.entity}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">TYPE: {alert.type}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{alert.id} · {alert.time}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
