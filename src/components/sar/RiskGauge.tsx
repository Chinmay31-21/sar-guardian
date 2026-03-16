import { motion } from "framer-motion";

interface RiskGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

export function RiskGauge({ score, label, size = "sm" }: RiskGaugeProps) {
  const radius = size === "lg" ? 50 : 32;
  const stroke = size === "lg" ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference * 0.75;
  const svgSize = (radius + stroke) * 2;

  const getColor = () => {
    if (score >= 75) return "hsl(var(--risk-high))";
    if (score >= 50) return "hsl(var(--risk-mid))";
    return "hsl(var(--compliance))";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="rotate-[135deg]">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          <motion.circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={stroke}
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${progress} ${circumference - progress}` }}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-bold tracking-tighter ${size === "lg" ? "text-2xl" : "text-base"}`} style={{ color: getColor() }}>
            {score}
          </span>
          <span className="text-[8px] text-muted-foreground font-mono">/100</span>
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{label}</span>
    </div>
  );
}
