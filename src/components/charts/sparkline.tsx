/** 7-point trend line in the de-emphasis ink, with the peak year marked. */
export function Sparkline({ values, width = 96, height = 32 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const pad = 4;
  const step = (width - pad * 2) / Math.max(1, values.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const points = values.map((v, i) => `${pad + i * step},${y(v)}`).join(" ");
  const peak = values.indexOf(Math.max(...values));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block overflow-visible">
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="var(--grid)" strokeWidth={1} />
      <polyline points={points} fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values[peak] > 0 && <circle cx={pad + peak * step} cy={y(values[peak])} r={3.5} fill="var(--ink)" stroke="var(--bg)" strokeWidth={2} />}
    </svg>
  );
}
