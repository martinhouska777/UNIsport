/*
  A small tear-off calendar page — the month on a school-colour strip, the day
  under it. Stands in front of a planned session on its chat card (`big`) and
  on Upcoming sessions, so the words beside it can say just "Tuesday at 5 PM".
  Colours are theme tokens (rule 1).
*/
export default function PlanDateTile({ iso, big = false }: { iso: string; big?: boolean }) {
  const d = new Date(iso);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface text-center ${
        big ? "h-11 w-11" : "h-9 w-9"
      }`}
    >
      <span
        className={`bg-primary font-bold uppercase tracking-wider text-primary-contrast ${
          big ? "py-[2px] text-[9px]" : "py-[1px] text-[8px]"
        }`}
      >
        {d.toLocaleDateString("en-US", { month: "short" })}
      </span>
      <span
        className={`flex flex-1 items-center justify-center font-bold text-text ${
          big ? "text-[18px]" : "text-[15px]"
        }`}
      >
        {d.getDate()}
      </span>
    </span>
  );
}
