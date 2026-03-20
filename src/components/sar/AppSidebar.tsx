import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle, FileText,
  ClipboardList, FileCheck, Network, BarChart3, ScrollText,
  Users, Settings, Shield, Lock, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/context/ProfileContext";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const navSections = [
  {
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { to: "/transactions", icon: ArrowLeftRight, label: "All Transactions" },
      { to: "/flagged", icon: AlertTriangle, label: "Flagged Clusters" },
    ],
  },
  {
    title: "SAR Management",
    items: [
      { to: "/sar/generate", icon: FileText, label: "Generate SAR" },
      { to: "/sar/queue", icon: ClipboardList, label: "Review Queue" },
      { to: "/sar/filed", icon: FileCheck, label: "Filed Reports" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/risk-graph", icon: Network, label: "Risk Attribution" },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { to: "/audit", icon: ScrollText, label: "Audit Trail" },
      { to: "/customers", icon: Users, label: "Customer Database" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
  onNavigate,
  isOpen: isMobileOpen = false,
  onClose: onMobileClose,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const location = useLocation();
  const { profile } = useProfile();

  const handleCollapse = () => {
    const next = !collapsed;
    setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Branding */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center px-3 py-4" : "gap-3 px-5 py-4"
      )}>
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground truncate">Barclays SAMRGS</p>
            <p className="text-[10px] text-sidebar-muted truncate">SAR Gen AI Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.title && !collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted px-3 pb-1.5">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
                  collapsed ? "justify-center px-0 py-2 w-10 mx-auto" : "",
                  isActive(item.to)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Admin Profile Link */}
      <div className="border-t border-sidebar-border p-2">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
            collapsed ? "justify-center px-0 py-2 w-10 mx-auto" : "",
            isActive("/profile")
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          title={collapsed ? profile.name : undefined}
        >
          {/* Avatar */}
          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-sidebar-primary flex items-center justify-center text-[10px] font-bold text-sidebar-primary-foreground">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span>{getInitials(profile.name)}</span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate leading-tight">{profile.name}</p>
              <p className="text-[9px] truncate opacity-60 leading-tight">{profile.role}</p>
            </div>
          )}
        </NavLink>

        {/* Security footer */}
        {!collapsed && (
          <div className="mt-3 px-3 pb-2">
            <div className="flex items-center gap-1.5 text-[9px] text-sidebar-muted">
              <Lock className="w-3 h-3 shrink-0" />
              <span>AES-256 · TLS 1.2+ · Audit Secured</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle for desktop */}
      <button
        onClick={handleCollapse}
        className="hidden md:flex items-center justify-center h-8 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-sidebar-foreground">Barclays SAMRGS</p>
                  <p className="text-[10px] text-sidebar-muted">SAR Gen AI Platform</p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="text-sidebar-muted hover:text-sidebar-foreground p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
              {navSections.map((section, si) => (
                <div key={si} className={si > 0 ? "mt-4" : ""}>
                  {section.title && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted px-3 pb-1.5">
                      {section.title}
                    </p>
                  )}
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full",
                        isActive(item.to)
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="border-t border-sidebar-border p-2">
              <NavLink
                to="/profile"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full",
                  isActive("/profile")
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-sidebar-primary flex items-center justify-center text-[10px] font-bold text-sidebar-primary-foreground">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(profile.name)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{profile.name}</p>
                  <p className="text-[10px] opacity-60 truncate leading-tight">{profile.role}</p>
                </div>
              </NavLink>
              <div className="mt-3 px-3 pb-2">
                <div className="flex items-center gap-1.5 text-[9px] text-sidebar-muted">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>AES-256 · TLS 1.2+ · Audit Secured</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
