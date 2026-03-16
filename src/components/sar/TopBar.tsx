import { Bell, ChevronDown, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-10 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-6">
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          SENTINEL<span className="text-primary ml-1">AI</span>
        </span>
        <nav className="hidden md:flex items-center gap-4 text-[12px] uppercase tracking-widest text-muted-foreground">
          <span className="text-foreground cursor-pointer">Home</span>
          <span className="cursor-pointer hover:text-foreground transition-colors">Alerts</span>
          <span className="cursor-pointer hover:text-foreground transition-colors">Reports</span>
          <span className="cursor-pointer hover:text-foreground transition-colors">Settings</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-muted rounded-sm px-2 py-1">
          <Search className="w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-32"
          />
        </div>
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-1.5 cursor-pointer">
          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
            <span className="text-[10px] font-medium text-primary">AS</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">A. Sharma</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </div>
        <div className="font-mono text-[10px] text-muted-foreground hidden lg:block">
          14:06:50 UTC
        </div>
      </div>
    </header>
  );
}
