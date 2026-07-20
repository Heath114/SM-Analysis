interface Row {
  key: string;
  label: string;
  value: number;      // raw value used for bar width (relative to max)
  display: string;    // formatted label on the right
  color?: string;
}

export default function BarList({ rows, keyWidth = 120 }: { rows: Row[]; keyWidth?: number }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar" key={r.key} style={{ gridTemplateColumns: `${keyWidth}px 1fr 46px` }}>
          <span className="k">{r.label}</span>
          <span className="track">
            <span className="fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--text)" }} />
          </span>
          <span className="v tnum">{r.display}</span>
        </div>
      ))}
    </div>
  );
}
