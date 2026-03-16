import { StatsCards } from "./StatsCards";
import { AlertsFeed } from "./AlertsFeed";
import { NetworkGraph } from "./NetworkGraph";
import { RiskTimeline, GeoDensityChart, EntityRadar } from "./RiskCharts";
import { ThreatModules } from "./ThreatModules";
import { RiskGauge } from "./RiskGauge";

export function DashboardView() {
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <StatsCards />
      <div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
        {/* Main content area */}
        <div className="col-span-9 flex flex-col gap-2 min-h-0">
          <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
            <div className="col-span-2">
              <NetworkGraph />
            </div>
            <RiskTimeline />
          </div>
          <div className="grid grid-cols-3 gap-2" style={{ flex: "0 0 45%" }}>
            <EntityRadar />
            <GeoDensityChart />
            <ThreatModules />
          </div>
        </div>

        {/* Right sidebar: Alerts + Metrics */}
        <div className="col-span-3 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0">
            <AlertsFeed />
          </div>
          <div className="panel p-3 flex items-center justify-around">
            <RiskGauge score={72} label="Threat Level" size="sm" />
            <div className="text-center">
              <span className="font-display text-2xl font-bold tracking-tighter text-destructive">18</span>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">Active Threats</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
