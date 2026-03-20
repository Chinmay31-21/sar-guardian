import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export default function MetricCard({ title, value, subtitle, trend, icon: Icon, iconColor }: MetricCardProps) {
  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {(subtitle || trend !== undefined) && (
              <div className="flex items-center gap-1.5">
                {trend !== undefined && (
                  <span className={cn("flex items-center text-xs font-medium", trend > 0 ? "text-success" : "text-destructive")}>
                    {trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {Math.abs(trend)}%
                  </span>
                )}
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-lg", iconColor || "bg-primary/10")}>
            <Icon className={cn("w-5 h-5", iconColor ? "text-card-foreground" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
