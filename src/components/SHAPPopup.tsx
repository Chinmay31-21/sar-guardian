import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SHAPFeature {
  name: string;
  value: number;
  baseValue?: string;
}

interface SHAPPopupProps {
  features: SHAPFeature[];
  selectedText: string;
  onClose: () => void;
  position?: { top: number; left: number };
}

export default function SHAPPopup({ features, selectedText, onClose, position }: SHAPPopupProps) {
  const sortedFeatures = [...features].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const totalRiskContribution = features.reduce((sum, f) => sum + f.value, 0);

  return (
    <div
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <Card className="w-[380px] shadow-2xl border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="text-primary">SHAP</span> Feature Attribution
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                "{selectedText}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-2 rounded-md bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Risk Impact</span>
              <Badge
                variant={totalRiskContribution > 0.3 ? "riskHigh" : totalRiskContribution > 0.1 ? "riskMedium" : "default"}
                className="text-xs gap-1"
              >
                {totalRiskContribution > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {totalRiskContribution > 0 ? "+" : ""}{totalRiskContribution.toFixed(3)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Contributing Features</p>
            {sortedFeatures.map((feature, idx) => {
              const absValue = Math.abs(feature.value);
              const maxAbsValue = Math.max(...sortedFeatures.map(f => Math.abs(f.value)));
              const barWidth = (absValue / maxAbsValue) * 100;
              const isPositive = feature.value > 0;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{feature.name}</span>
                    <div className="flex items-center gap-1.5">
                      {feature.baseValue && (
                        <span className="text-muted-foreground font-mono text-[10px]">{feature.baseValue}</span>
                      )}
                      <Badge
                        variant={isPositive ? "riskHigh" : "success"}
                        className="text-[10px] font-mono min-w-[60px] justify-center"
                      >
                        {isPositive ? "+" : ""}{feature.value.toFixed(3)}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        isPositive ? "bg-destructive" : "bg-success"
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>SHAP values</strong> explain how each feature contributes to the risk score for this text segment.
              Positive values (red) increase risk; negative values (green) decrease risk.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
