import { motion } from "framer-motion";

const tickerData = [
  "TSCR: 0.91",
  "DPI: 12.7231",
  "INGESTION: 189,092",
  "RISK_IDX: 66.61%",
  "MARGIN: 45%",
  "PORTFM: 63.089%",
  "GOVR: M1 13.520%",
  "TICK: 15,089",
  "HDDX: 62.29%",
  "ANOMALY_CT: 47",
  "SAR_QUEUE: 12",
  "ENTITY_SCAN: ACTIVE",
];

export function DataTicker() {
  return (
    <div className="h-6 bg-background border-b border-border overflow-hidden flex items-center">
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: [0, -1200] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {[...tickerData, ...tickerData].map((item, i) => {
          const [label, value] = item.split(": ");
          return (
            <span key={i} className="data-ticker">
              <span className="text-muted-foreground">{label}: </span>
              <span className="text-primary">{value}</span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}
