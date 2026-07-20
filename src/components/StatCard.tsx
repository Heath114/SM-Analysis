import Sparkline from "./charts/Sparkline";
import Delta from "./Delta";

interface Props {
  label: string;
  value: string;
  delta?: number;
  spark?: number[];
  color?: string;
}

export default function StatCard({ label, value, delta, spark, color }: Props) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value tnum">{value}</div>
      <div className="kpi__foot">
        {delta !== undefined ? <Delta value={delta} /> : <span />}
        {spark && spark.length > 1 && <Sparkline values={spark} color={color ?? "var(--text-2)"} />}
      </div>
    </div>
  );
}
