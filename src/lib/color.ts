const INK = "#15130f";
const WHITE = "#ffffff";

function channel(v: number) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Text color for content set on a solid group-accent fill: whichever of ink/white reads better. */
export function inkOn(hex: string): string {
  return contrast(hex, INK) >= contrast(hex, WHITE) ? INK : WHITE;
}

/** CSS variables that scope a group's accent to a subtree. */
export function accentVars(hex: string): React.CSSProperties {
  return { ["--accent" as string]: hex, ["--on-accent" as string]: inkOn(hex) };
}
