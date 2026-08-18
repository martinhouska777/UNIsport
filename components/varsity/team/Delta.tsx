/*
  "▲ −2.9s": the change against that person's own last go at the piece, in the
  units of the metric on show. Green when better, red when worse, plain when it
  rounds to nothing. A fixed width so a column of chips lines up. All colours
  are theme tokens.
*/
import { improvementLabel, type MetricKey } from "@/lib/varsity/teamBoard";
import { IconChevronUp, IconChevronDown } from "@/components/icons";

export default function Delta({
  improvement,
  metric,
  size = "sm",
}: {
  improvement: number;
  metric: MetricKey;
  size?: "sm" | "lg";
}) {
  const better = improvement > 0.05;
  const worse = improvement < -0.05;
  const lg = size === "lg";
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center gap-0.5 rounded-md border font-semibold tabular-nums ${
        lg ? "min-w-[72px] px-1.5 py-1 text-[13px]" : "w-[62px] px-1 py-[3px] text-[11px]"
      } ${
        better
          ? "border-success-line bg-success-tint text-success"
          : worse
            ? "border-danger-line bg-danger-tint text-danger"
            : "border-border bg-surface-2 text-muted"
      }`}
    >
      {better && <IconChevronUp size={lg ? 13 : 11} />}
      {worse && <IconChevronDown size={lg ? 13 : 11} />}
      {improvementLabel(improvement, metric)}
    </span>
  );
}
