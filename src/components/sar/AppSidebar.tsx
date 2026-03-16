import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Network,
  BarChart3,
  Clock,
  Search,
  Settings,
  Shield,
} from "lucide-react";

type View = "dashboard" | "investigation" | "sar-editor" | "network" | "analytics" | "audit";

interface AppSidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const navItems: { icon: typeof LayoutDashboard; label: string; view: View }[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" },
  { icon: AlertTriangle, label: "Cases", view: "investigation" },
  { icon: FileText, label: "SAR Editor", view: "sar-editor" },
  { icon: Network, label: "Network", view: "network" },
  { icon: BarChart3, label: "Analytics", view: "analytics" },
  { icon: Clock, label: "Audit Trail", view: "audit" },
];

const bottomItems = [
  { icon: Search, label: "Search" },
  { icon: Settings, label: "Settings" },
];

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  return (
    <div className="w-16 min-h-screen bg-sidebar border-r border-border flex flex-col items-center py-4 gap-1">
      <div className="mb-6 flex items-center justify-center w-10 h-10">
        <Shield className="w-6 h-6 text-primary" />
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-sm transition-colors ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1 bottom-1 w-[2px] bg-primary rounded-r"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className="w-[18px] h-[18px]" />
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors"
            title={item.label}
          >
            <item.icon className="w-[18px] h-[18px]" />
          </button>
        ))}
      </div>
    </div>
  );
}
