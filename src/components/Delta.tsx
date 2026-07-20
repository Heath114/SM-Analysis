import { IcUp, IcDown } from "../lib/icons";
import { pct } from "../lib/format";

export default function Delta({ value, digits = 1 }: { value: number; digits?: number }) {
  const cls = Math.abs(value) < 0.05 ? "flat" : value > 0 ? "pos" : "neg";
  return (
    <span className={`delta delta--${cls}`}>
      {cls === "pos" && <IcUp />}
      {cls === "neg" && <IcDown />}
      {pct(value, digits)}
    </span>
  );
}
