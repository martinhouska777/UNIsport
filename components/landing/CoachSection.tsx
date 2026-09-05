import CoachPhone from "@/components/landing/CoachPhone";
import { coach, mailtoHref, type Segment } from "@/lib/landingCopy";

/*
  THE COACH SECTION — the third door, after the varsity story.

  Ported natively from the "One Coach, Forty Athletes" design piece rather than
  iframed: it is plain layout with no scroll choreography, so there was nothing
  to isolate. That means real selectable text, real <Image> loading of the six
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

/* The phone frame the captures sit in is components/landing/CoachPhone.tsx —
   the shared landing Phone, following the light/dark switch. */

/** `solo`: on the Coach view (/for/coaches) the section OPENS the page —
    nothing above it but the bar. So: no top rule, hero-height top padding,
    the coach's own button right under the opener (the same mail as the one
    at the foot), and the three lines that leant on the varsity story above
    (lead-in, sub, bridge) read their solo variants. */
export default function CoachSection({ solo = false }: { solo?: boolean }) {
  return (
    <section
      id="coaches"
      data-phone-screens
      className={`relative z-[1] scroll-mt-20 px-6 pb-28 sm:px-8 ${solo ? "l-glow-varsity pt-10 sm:pt-14" : "border-t border-l-line pt-24"}`}
    >
      <div className="mx-auto max-w-[1160px]">
        {/* ── The opener ── */}
        <div className={`flex flex-col items-center gap-[clamp(11px,1.8vh,18px)] pb-7 text-center ${solo ? "l-fade-up" : ""}`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-l-varsity-soft bg-l-varsity-dim px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-l-varsity">
            {coach.badge}
          </div>
          <h2 className="max-w-[14ch] font-display text-[clamp(40px,min(7vw,8.6vh),68px)] font-normal leading-[1.02] tracking-tight text-balance text-l-text">
            {coach.headline} <em className="italic text-l-varsity">{coach.headlineEm}</em>
          </h2>
          <Body
            parts={solo ? coach.subSolo : coach.sub}
            className="max-w-[60ch] text-[clamp(15px,1.9vw,17px)] leading-[1.6] text-balance text-l-text-2"
          />
          {solo && (
            <a
              href={mailtoHref(coach.cta.mailSubject, coach.cta.mailBody)}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-l-varsity px-7 py-4 text-[15px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
            >
              {coach.cta.label} →
            </a>
          )}

          {/* THE WAY IN, on the opening screen — the varsity intro's own
              outlined pill, worn here (owner, 2026-09-05: "I want the same
              style as varsity, there's a see-how-it-works and then you just
              scroll and see"). It replaced a heading and a sentence that stood
              between this screen and the phones. */}
          <a
            href={coach.overview.href}
            className="mt-1 inline-flex items-center gap-2 rounded-full border border-l-varsity-soft px-6 py-3 text-[14px] font-medium tracking-tight text-l-text transition-colors hover:border-l-varsity hover:bg-l-varsity-dim"
          >
            {coach.overview.label} →
          </a>
        </div>

        {/* ── Six screens, six explanations. The rule is all that stands
            between them and the opener now. ── */}
        <div
          id="coach-steps"
          className="mt-16 flex scroll-mt-24 flex-wrap items-start justify-center gap-x-11 gap-y-[60px] border-t border-l-line pt-16"
        >
          {coach.steps.map((s, i) => (
            <article
              key={s.n}
              className="flex shrink grow-0 basis-[300px] flex-col items-center gap-[18px] text-center"
            >
              {/* Only the first capture preloads; the rest are far below the fold.
                  (Next 16 deprecated `priority` in favour of `preload`.) */}
              <CoachPhone shot={s.shot} alt={s.alt} preload={i === 0} />
              <div className="flex flex-col items-center">
                {/* THE STEP NUMBER — its own small gold coin above the headline
                    (the owner, 2026-09-05: the number was ugly). It rode INSIDE
                    the headline before, as "1 ·" set in the display serif, which
                    pulled the gold into the sentence and left the dot hanging at
                    a line break. As a coin it wears the numbering idiom the page
                    already has — mono digits in the outlined gold pill of the
                    section badge and the story chips (OpeningSteps.tsx) — and
                    the headline is left to read as one clean line, which is what
                    the owner asked for on the same day. Decorative, hence
                    aria-hidden: the order is already in the markup. */}
                <span
                  aria-hidden
                  className="mb-3 flex h-7 w-7 items-center justify-center rounded-full border border-l-varsity-soft bg-l-varsity-dim font-mono text-[12px] leading-none text-l-varsity"
                >
                  {s.n}
                </span>
                <h3 className="font-display text-[clamp(24px,2.7vw,31px)] font-normal leading-[1.1] tracking-tight text-balance text-l-text">
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

        {/* ── The summary, and the coach's own way in ──
            The owner, 2026-09-04: after the last screen, a summary and then the
            way in. Nothing between them any more — the bridge line and the
            three fact cards said the six steps over again before the only
            button on the section. */}
        <div className="mt-[76px] flex flex-col items-center gap-3.5 text-center">
          <p className="mx-auto max-w-[46ch] font-display text-[clamp(22px,3.2vw,32px)] leading-[1.3] tracking-tight text-balance text-l-text">
            {coach.summary}
          </p>
          <p className="mx-auto max-w-[52ch] text-[15px] leading-[1.65] text-l-text-2">
            {coach.summarySub}
          </p>
          <a
            href={mailtoHref(coach.cta.mailSubject, coach.cta.mailBody)}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-l-varsity px-7 py-4 text-[15px] font-semibold tracking-tight text-l-bg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
          >
            {coach.cta.label} →
          </a>
        </div>
      </div>
    </section>
  );
}
