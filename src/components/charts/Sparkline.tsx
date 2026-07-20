interface Props {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({ values, color = "currentColor", width = 70, height = 26 }: Props) {
  if (values.length < 2) return <svg width={width} height={height} className="kpi__spark" />;
  const pad = 2;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const X = (i: number) => pad + (width - 2 * pad) * (i / (values.length - 1));
  const Y = (v: number) => pad + (height - 2 * pad) * (1 - (v - min) / range);
  const line = values.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(values.length - 1).toFixed(1)} ${height} L${X(0).toFixed(1)} ${height} Z`;
  return (
    <svg width={width} height={height} className="kpi__spark" viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={color} opacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={X(values.length - 1)} cy={Y(values[values.length - 1])} r={2} fill={color} />
    </svg>
  );
}
