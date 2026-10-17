export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Round axis: about four ticks on 1/2/5 steps, e.g. 64 -> 0, 20, 40, 60, 80. */
export function niceTicks(maxValue: number, target = 4): number[] {
  const raw = Math.max(1, maxValue) / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  const top = Math.max(step, Math.ceil(maxValue / step) * step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}
