export function percentToBand(
  scorePercent: number | null | undefined,
  module: "listening" | "reading" | string = "reading"
): number | null {
  if (scorePercent == null) return null;

  const pctRaw = Number(scorePercent);
  if (!Number.isFinite(pctRaw)) return null;

  const pct = pctRaw > 1 ? pctRaw / 100 : pctRaw;
  if (pct <= 0) return 0;

  const raw = Math.round(Math.max(0, Math.min(pct, 1)) * 40);
  const isListening = String(module).toLowerCase() === "listening";

  if (isListening) {
    if (raw >= 39) return 9;
    if (raw >= 37) return 8.5;
    if (raw >= 35) return 8;
    if (raw >= 32) return 7.5;
    if (raw >= 30) return 7;
    if (raw >= 26) return 6.5;
    if (raw >= 23) return 6;
    if (raw >= 18) return 5.5;
    if (raw >= 16) return 5;
    if (raw >= 13) return 4.5;
    if (raw >= 11) return 4;
    if (raw >= 8) return 3.5;
    if (raw >= 6) return 3;
    if (raw >= 4) return 2.5;
    if (raw >= 3) return 2;
    if (raw >= 2) return 1.5;
    return 1;
  }

  if (raw >= 39) return 9;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8;
  if (raw >= 33) return 7.5;
  if (raw >= 30) return 7;
  if (raw >= 27) return 6.5;
  if (raw >= 23) return 6;
  if (raw >= 19) return 5.5;
  if (raw >= 15) return 5;
  if (raw >= 13) return 4.5;
  if (raw >= 10) return 4;
  if (raw >= 8) return 3.5;
  if (raw >= 6) return 3;
  if (raw >= 4) return 2.5;
  if (raw >= 3) return 2;
  if (raw >= 2) return 1.5;
  return 1;
}

export function displayAttemptBand(score: number | string | null | undefined): number {
  if (score === null || score === undefined || score === "") return 0;

  const value = typeof score === "string" ? Number(score) : score;

  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 2) / 2;
}

export function formatBandScore(score: number | string | null | undefined): string {
  return displayAttemptBand(score).toFixed(1);
}
