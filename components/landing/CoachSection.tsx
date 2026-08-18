import Image from "next/image";
import Phone from "@/components/landing/Phone";
import { coach, mailtoHref, type Segment } from "@/lib/landingCopy";

/*
  THE COACH SECTION — the third door, after the varsity story.

  Ported natively from the "One Coach, Forty Athletes" design piece rather than
  iframed: it is plain layout with no scroll choreography, so there was nothing
  to isolate. That means real selectable text, real <Image> loading of the five
  captures, and every colour from an `l-*` token (rule 1). The piece's own
  chrome — its title, theme script, mode toggle and background grid — is gone,
  because the landing already provides all four and two copies fight.

  The piece used crimson; this uses the gold varsity accent. See lib/landingCopy.ts.
*/

/** Body copy arrives as segments so emphasis is data, not markup (rule 7). */
function Body({ parts, className = "" }: { parts: Segment[]; className?: string }) {
  return (
    <p className={className}>
      {parts.map((p, i) =>
        p.bold ? (
          <b key={i} className="font-semibold text-l-text">
            {p.text}
          </b>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

/* The phone frame the captures sit in — the shared landing Phone, so a reader
   who scrolled through the stories meets a familiar object here. */
function CoachPhone({ shot, alt, preload }: { shot: string; alt: string; preload?: boolean }) {
  return (
    <Phone className="w-full max-w-[300px]">
      <Image
        src={`/landing/${shot}`}
        alt={alt}
        width={900}
        height={1479}
        preload={preload}
        sizes="(max-width: 640px) 80vw, 300px"
        className="block h-auto w-full"
      />
    </Phone>
  );
}

export default function CoachSection() {
  return (
    <section
      id="coaches"
      className="relative z-[1] scroll-mt-20 border-t border-l-line px-6 pt-24 pb-28 sm:px-8"
    >
      <div className="mx-auto max-w-[1160px]">
        {/* ── The opener ── */}
        <div className="flex flex-col items-center gap-[18px] pb-7 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-l-varsity-soft bg-l-varsity-dim px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-l-varsity">
            {coach.badge}
          </div>
          <p className="font-display text-[clamp(19px,3vw,27px)] text-l-text-2">{coach.leadIn}</p>
          <h2 className="max-w-[14ch] font-display text-[clamp(46px,9vw,96px)] font-normal leading-[0.99] tracking-tight text-balance text-l-text">
            {coach.headline} <em className="italic text-l-varsity">{coach.headlineEm}</em>
          </h2>
          <Body
            parts={coach.sub}
            className="max-w-[52ch] text-[clamp(16px,2.2vw,19px)] leading-relaxed text-balance text-l-text-2"
          />
        </div>

        {/* ── Five screens, five explanations ── */}
        <div className="mt-12 flex flex-wrap items-start justify-center gap-x-11 gap-y-[60px]">
          {coach.steps.map((s, i) => (
            <article
              key={s.n}
              className="flex shrink grow-0 basis-[300px] flex-col items-center gap-[22px] text-center"
            >
              {/* Only the first capture preloads; the rest are far below the fold.
                  (Next 16 deprecated `priority` in favour of `preload`.) */}
              <CoachPhone shot={s.shot} alt={s.alt} preload={i === 0} />
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-l-varsity">
                  {s.step}
                </div>
                <h3 className="mt-1.5 font-display text-[clamp(26px,3vw,34px)] font-normal leading-[1.08] tracking-tight text-balance text-l-text">
                  {s.head}
                </h3>
                <Body
                  parts={s.body}
                  className="mx-auto mt-2.5 max-w-[36ch] text-[15px] leading-[1.65] text-l-text-2"
                />
              </div>
            </article>
          ))}
        </div>

        {/* ── The bridge back to the athlete story ── */}
        <p className="mx-auto mt-[76px] max-w-[46ch] text-center font-display text-[clamp(22px,3.2vw,32px)] leading-[1.3] tracking-tight text-balance text-l-text">
          {coach.bridge}
        </p>
        <p className="mx-auto mt-3.5 max-w-[52ch] text-center text-[15px] leading-[1.65] text-l-text-2">
          {coach.bridgeSub}
        </p>

        {/* ── Three plain facts ── */}
        <div className="mt-14 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {coach.facts.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-l-line bg-l-bg-elevated px-5 py-[22px] text-center"
            >
              <b className="block font-display text-[clamp(22px,2.6vw,28px)] font-normal tracking-tight text-balance text-l-text">
                {f.title}
              </b>
              <span className="mt-[7px] block text-[13px] leading-[1.55] text-l-text-2">
                {f.body}
              </span>
            </div>
          ))}
        </div>

        {/* ── The coach's own way in ── */}
        <div className="mt-12 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-5">
          <span className="font-display text-[clamp(20px,2.4vw,26px)] tracking-tight text-l-text-2">{coach.cta.lead}</span>
          <a
            href={mailtoHref(coach.cta.mailSubject, coach.cta.mailBody)}
            className="inline-flex items-center gap-2 rounded-full bg-l-varsity px-6 py-3 text-[14px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
          >
            {coach.cta.label} →
          </a>
        </div>
      </div>
    </section>
  );
}
