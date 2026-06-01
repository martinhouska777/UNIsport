// Static "proof" mockup shown in the hero: the student app's Gyms screen
// rendered inside a phone frame. Pure decoration — no interactivity.
export default function HeroPhone() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Spec-sheet annotations (hidden on small screens) */}
      <div className="absolute top-[90px] right-[-50px] hidden items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-l-text-2 lg:flex">
        <span className="h-px w-8 bg-gradient-to-r from-l-border-hover to-transparent" />
        Real photos
      </div>
      <div className="absolute bottom-[240px] left-[-70px] hidden items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-l-text-2 lg:flex">
        Live crowd data
        <span className="h-px w-8 bg-gradient-to-l from-l-border-hover to-transparent" />
      </div>

      <div className="h-[620px] w-[300px] shrink-0 rounded-[44px] border border-l-border-hover bg-l-bg-elevated p-3 shadow-2xl sm:h-[700px] sm:w-[340px]">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[32px] bg-l-bg">
          {/* status bar */}
          <div className="flex shrink-0 items-center justify-between px-6 pt-3.5 pb-2 font-mono text-[13px] font-medium text-l-text">
            <span>9:41</span>
            <span className="font-sans text-xs text-l-text-2">5G</span>
          </div>

          {/* header */}
          <div className="shrink-0 px-5 pt-[18px] pb-3.5">
            <div className="font-display text-[28px] tracking-tight text-l-text">Gyms</div>
            <div className="text-[13px] text-l-text-2">8 locations on campus</div>
          </div>

          {/* filter pills */}
          <div className="flex shrink-0 gap-1.5 px-5 pb-4">
            <span className="rounded-full border border-l-text bg-l-text px-3.5 py-1.5 text-xs font-medium text-l-bg">All</span>
            <span className="rounded-full border border-l-border px-3.5 py-1.5 text-xs font-medium text-l-text-2">Main</span>
            <span className="rounded-full border border-l-border px-3.5 py-1.5 text-xs font-medium text-l-text-2">House</span>
          </div>

          {/* gym list */}
          <div className="flex flex-1 flex-col gap-3 overflow-hidden px-5">
            <GymCard
              variant="mac"
              label="Main · Strength"
              crowd={{ tone: "success", text: "Quiet" }}
              name="Murr Athletic Center"
              rating="4.8"
              hours="6am – 11pm"
              here="12 here now"
              featured
            />
            <GymCard
              variant="malkin"
              label="Main · Cardio"
              crowd={{ tone: "warn", text: "Moderate" }}
              name="Malkin Athletic Center"
              rating="4.6"
              hours="5am – 12am"
              here="28 here now"
            />
          </div>

          {/* bottom nav */}
          <div className="mt-auto flex shrink-0 items-center justify-around border-t border-l-border bg-l-bg px-5 pt-3 pb-[18px]">
            {[
              { label: "Gyms", active: true },
              { label: "Match", active: false },
              { label: "Messages", active: false },
              { label: "Profile", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex flex-col items-center gap-[3px] text-[9px] tracking-wide ${
                  item.active ? "text-l-accent" : "text-l-text-3"
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

function GymCard({
  variant,
  label,
  crowd,
  name,
  rating,
  hours,
  here,
  featured = false,
}: {
  variant: "mac" | "malkin";
  label: string;
  crowd: { tone: "success" | "warn" | "danger"; text: string };
  name: string;
  rating: string;
  hours: string;
  here: string;
  featured?: boolean;
}) {
  const dot =
    crowd.tone === "success" ? "bg-l-success" : crowd.tone === "warn" ? "bg-l-warn" : "bg-l-danger";
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-l-bg-elevated ${
        featured ? "border-l-accent-soft" : "border-l-border"
      }`}
    >
      <div
        className={`relative flex h-[120px] items-end p-3 ${
          variant === "mac" ? "l-gym-mac" : "l-gym-malkin"
        }`}
      >
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-l-bg/70 px-2.5 py-1 text-[10px] font-medium text-l-text backdrop-blur">
          <span className={`h-[5px] w-[5px] rounded-full ${dot}`} />
          {crowd.text}
        </span>
        <span className="relative z-10 font-mono text-[9px] uppercase tracking-widest text-white/50">
          {label}
        </span>
      </div>
      <div className="px-3.5 pt-3 pb-3.5">
        <div className="mb-1.5 text-[15px] font-medium text-l-text">{name}</div>
        <div className="flex items-center gap-2.5 text-[11px] text-l-text-2">
          <span>
            <span className="text-l-warn">★</span> {rating}
          </span>
          <span className="h-[2px] w-[2px] rounded-full bg-l-text-3" />
          <span>{hours}</span>
          <span className="h-[2px] w-[2px] rounded-full bg-l-text-3" />
          <span>{here}</span>
        </div>
      </div>
    </div>
  );
}
