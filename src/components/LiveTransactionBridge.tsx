/**
 * LiveTransactionBridge — invisible component mounted inside providers.
 * Drips CSV transactions into SARDataContext at timed intervals.
 *
 * Timing model:
 *   • Normal transactions:  every 5–8 s (constant, shows platform activity)
 *   • Suspicious transactions: burst-based, rate doubles during "risky hours"
 *       Risky hours: 22–06h (late night), 12–14h (lunch), 17–20h (after work)
 *       Off-peak: one suspicious txn per 60–120 s max
 *       Risky hours: one suspicious txn per 20–40 s
 */
import { useEffect, useRef } from "react";
import { useCSVData } from "@/hooks/useCSVData";
import { useSARData } from "@/context/SARDataContext";
import type { CsvTransaction } from "@/lib/csvLoader";
import type { Transaction, FlagType } from "@/data/synthetic";

const PATTERN_TO_FLAG: Record<string, FlagType | undefined> = {
  structuring: "structuring",
  smurfing: "smurfing",
  round_amount: "round_amounts",
  cross_border: "cross_border",
  layering: "high_value",
  crypto: "crypto",
  trade_based: "trade_based",
  normal: undefined,
};

function csvToTransaction(t: CsvTransaction): Omit<Transaction, "id"> {
  const isSuspicious = t.is_suspicious;
  const isHighRisk = t.is_high_risk_country;
  const logNorm = Math.min(15, t.log_amount);
  const riskScore = Math.min(
    100,
    Math.round(logNorm * 4.5 + (isHighRisk ? 20 : 0) + (isSuspicious ? 22 : 0))
  );
  const flagType = isSuspicious
    ? (PATTERN_TO_FLAG[t.pattern] ?? "high_value")
    : null;

  return {
    customerId: t.sender_account,
    customerName: t.sender_account,
    senderAccount: t.sender_account,
    receiverAccount: t.receiver_account,
    amount: Math.round(t.amount * 100) / 100,
    currency: "USD",
    date: t.timestamp.split("T")[0],
    status: isSuspicious ? "flagged" : "pending",
    riskScore,
    flagType,
    country: t.country,
    type: t.type,
  };
}

/** Returns true if the current local hour is in a "risky" window for AML activity. */
function isRiskyWindow(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h <= 5 || (h >= 12 && h <= 14) || (h >= 17 && h <= 19);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function LiveTransactionBridge() {
  const { data } = useCSVData();
  const { addTransaction } = useSARData();

  const normalIdxRef = useRef(0);
  const suspIdxRef = useRef(0);
  const lastSuspTimeRef = useRef(0);

  useEffect(() => {
    if (!data) return;

    const normalPool = data.transactions.filter((t) => !t.is_suspicious);
    const suspPool = data.transactions.filter(
      (t) => t.is_suspicious && t.is_high_risk_country
    );

    if (!normalPool.length && !suspPool.length) return;

    // ── Normal transaction drip ──────────────────────────────────────────────
    let normalTimer: ReturnType<typeof setTimeout>;
    const fireNormal = () => {
      if (normalPool.length) {
        const t = normalPool[normalIdxRef.current % normalPool.length];
        normalIdxRef.current++;
        addTransaction(csvToTransaction(t));
      }
      const delay = randomBetween(5_000, 8_000);
      normalTimer = setTimeout(fireNormal, delay);
    };
    normalTimer = setTimeout(fireNormal, randomBetween(3_000, 6_000));

    // ── Suspicious transaction bursts ────────────────────────────────────────
    let suspTimer: ReturnType<typeof setTimeout>;
    const fireSuspicious = () => {
      const now = Date.now();
      const risky = isRiskyWindow();

      // Minimum gap: 20s risky, 55s off-peak
      const minGap = risky ? 20_000 : 55_000;

      if (suspPool.length && now - lastSuspTimeRef.current >= minGap) {
        // Fire 1-3 suspicious txns in a burst (with small delays between them)
        const burstCount = risky ? Math.floor(randomBetween(1, 4)) : 1;
        for (let i = 0; i < burstCount; i++) {
          const delay = i * randomBetween(1_500, 3_500);
          setTimeout(() => {
            const t = suspPool[suspIdxRef.current % suspPool.length];
            suspIdxRef.current++;
            addTransaction(csvToTransaction(t));
          }, delay);
        }
        lastSuspTimeRef.current = now;
      }

      // Schedule next check
      const nextCheck = risky
        ? randomBetween(18_000, 35_000)
        : randomBetween(50_000, 110_000);
      suspTimer = setTimeout(fireSuspicious, nextCheck);
    };
    // First suspicious txn fires after a short initial delay
    suspTimer = setTimeout(fireSuspicious, randomBetween(8_000, 15_000));

    return () => {
      clearTimeout(normalTimer);
      clearTimeout(suspTimer);
    };
  }, [data, addTransaction]);

  return null;
}
