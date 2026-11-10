/*
  "▲ −2.9s": the change against that person's own last go at the piece, in the
  units of the metric on show. Green when better, red when worse, plain when it
  rounds to nothing. All colours are theme tokens.
  Small coloured words, no box around them (owner, 2026-11-10: "the
  improvement number make it smaller the green or red ... bez toho
  rámečku"), set to the right so a column of them lines up under the results.
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
      className={`flex flex-shrink-0 items-center justify-end gap-0.5 whitespace-nowrap font-semibold leading-none tabular-nums ${
        lg ? "text-[12px]" : "text-[10px]"
      } ${better ? "text-success" : worse ? "text-danger" : "text-muted"}`}
    >
      {better && <IconChevronUp size={lg ? 11 : 9} />}
      {worse && <IconChevronDown size={lg ? 11 : 9} />}
      {improvementLabel(improvement, metric)}
    </span>
  );
}
