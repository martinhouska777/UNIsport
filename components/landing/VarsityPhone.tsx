// Static "proof" mockup for the Varsity deep-dive: an athlete's "Today" screen
// (countdown, AM lineup, session) inside a phone frame. Pure decoration.
const SEATS = [
  { num: "B", name: "L. Bessler", meta: "P · 5:47" },
  { num: "7", name: "O. Marcovitz", meta: "S · 5:53" },
  { num: "6", name: "J. Brangan", meta: "P · 5:53" },
  { num: "5", name: "A. Lykomitros", meta: "S · 5:53" },
];

export default function VarsityPhone() {
  return (
    <div className="flex items-center justify-center">
      <div className="h-[580px] w-[280px] shrink-0 rounded-[44px] border border-l-border-hover bg-l-bg-elevated p-3 shadow-2xl sm:h-[620px] sm:w-[300px]">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[32px] bg-l-bg">
          {/* status bar */}
          <div className="flex shrink-0 items-center justify-between px-6 pt-3.5 pb-2 font-mono text-[13px] font-medium text-l-text">
            <span>7:14</span>
            <span className="font-sans text-xs text-l-text-2">5G</span>
          </div>

          {/* header */}
          <div className="shrink-0 px-5 pt-[18px] pb-3.5">
            <div className="font-display text-[28px] tracking-tight text-l-text">Today</div>
            <div className="text-[13px] text-l-text-2">Varsity · Heavyweight squad</div>
          </div>

          {/* countdown row */}
          <div className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-l-varsity-soft bg-l-bg-elevated px-3.5 py-2.5">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-l-text-3">
                IRA Championship
              </div>
              <div className="font-display text-lg italic text-l-varsity">47 days</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-l-border bg-l-bg px-2.5 py-1 font-mono text-[10px] text-l-text-2">
              58° · Calm
            </span>
          </div>

          {/* lineup card */}
          <div className="mx-4 mb-2.5 rounded-[14px] border border-l-border bg-l-bg-elevated p-3.5">
            <div className="mb-3 flex items-center justify-between border-b border-l-border pb-2.5">
              <span className="text-[13px] font-medium text-l-text">1V — AM piece</span>
              <span className="rounded-full bg-l-varsity-dim px-2 py-[3px] font-mono text-[9px] uppercase tracking-wider text-l-varsity">
                Lineup
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {SEATS.map((s) => (
                <div
                  key={s.num}
                  className="flex items-center gap-2.5 rounded-lg border border-l-border bg-l-bg px-2 py-[7px]"
                >
                  <span className="w-3.5 text-center font-mono text-[10px] text-l-varsity">
                    {s.num}
                  </span>
                  <span className="flex-1 text-xs text-l-text">{s.name}</span>
                  <span className="font-mono text-[9px] text-l-text-2">{s.meta}</span>
                </div>
              ))}
            </div>
          </div>

          {/* session card */}
          <div className="mx-4 rounded-[14px] border border-l-varsity-soft bg-l-bg-elevated p-3.5">
            <div className="mb-1 font-display text-[17px] tracking-tight text-l-text">
              6×500m @ 2k
            </div>
            <div className="mb-2.5 font-mono text-[10px] tracking-wide text-l-varsity">
              06:00 AM · Newell Boathouse
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-l-border pt-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wide text-l-text-3">Rate</span>
                <span className="text-xs font-medium text-l-text">32–36 spm</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wide text-l-text-3">Rest</span>
                <span className="text-xs font-medium text-l-text">2:00 light</span>
              </div>
            </div>
          </div>

          {/* bottom nav */}
          <div className="mt-auto flex shrink-0 items-center justify-around border-t border-l-border bg-l-bg px-4 pt-3 pb-[18px]">
            {[
              { label: "Home", active: true },
              { label: "Calendar", active: false },
              { label: "Log", active: false },
              { label: "Team", active: false },
              { label: "Profile", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex flex-col items-center gap-[3px] text-[9px] tracking-wide ${
                  item.active ? "text-l-varsity" : "text-l-text-3"
                }`}
              >
                <span className="h-[18px] w-[18px] rounded-[5px] border border-current opacity-80" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
