import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Eye, FileCheck } from "lucide-react";

const stats = [
  { label: "Active Threats", value: "18", icon: AlertTriangle, change: "+3", color: "text-destructive" },
  { label: "Cases Open", value: "42", icon: Eye, change: "+7", color: "text-primary" },
  { label: "SARs Drafted", value: "12", icon: FileCheck, change: "+2", color: "text-accent" },
  { label: "Monitoring", value: "9.4M+", icon: TrendingUp, change: "", color: "text-compliance" },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="panel px-3 py-2.5"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{stat.label}</span>
            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-xl font-bold tracking-tighter ${stat.color}`}>{stat.value}</span>
            {stat.change && (
              <span className="text-[10px] font-mono text-destructive">{stat.change}</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
