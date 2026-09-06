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

          {/* THE WAY IN, on the opening screen. It began as the varsity intro's
              outlined pill (owner, 2026-09-05: "I want the same style as
              varsity, there's a see-how-it-works and then you just scroll and
              see"), which replaced a heading and a sentence standing between
              this screen and the phones.

              A DOWN ARROW NOW, and no pill (owner, 2026-09-06: "chci dat jako
              šipku dolů a nemusí to být taková bublina protože je to hned pod
              tím"). The interlude's pill is a jump across the page and has to
              look like a button; this one only says "keep going" — what it
              points at is the next thing down. So the chrome goes and the
              arrow turns to face the way it means. */}
          <a
            href={coach.overview.href}
            className="tap44 mt-1 inline-flex flex-col items-center gap-1.5 px-3 py-2 text-[14px] font-medium tracking-tight text-l-text-2 transition-colors hover:text-l-text"
          >
            {coach.overview.label}
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="text-l-varsity"
            >
              <path
                d="M12 5.5v13m0 0-5.6-5.6M12 18.5l5.6-5.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
              className="flex shrink grow-0 basis-[300px] flex-col items-center gap-[20px] text-center"
            >
              {/* Only the first capture preloads; the rest are far below the fold.
                  (Next 16 deprecated `priority` in favour of `preload`.) */}
              <CoachPhone shot={s.shot} alt={s.alt} preload={i === 0} />
              <div>
                {/* THE STEP NUMBER — a small gold coin BESIDE the headline (the
                    owner, 2026-09-05: "udělej ho hezčí a třeba v kolečku a vedle
                    toho názvu"). Four goes in one day: its own label line above
                    the title ("2 · PLAN"), the same size as the headline in the
                    display serif ("1 ·" — the gold cut the sentence in two and
                    the dot hung at a line break), a coin stacked above it, a
                    bare superior figure, and now the coin brought down onto the
                    line.

                    It is INLINE, inside the <h3>, not a flex row beside it: that
                    keeps the headline centred and lets `text-balance` set the
                    two lines evenly, and the coin can only ever sit in front of
                    the first word. Everything is sized in `em` off the headline,
                    so one clamp drives both and the coin holds its proportion
                    from a phone to a wide monitor. Mono digits in the outlined
                    gold pill are the page's own numbering idiom — the section
                    badge and the story chips (OpeningSteps.tsx) wear it too. */}
                <h3 className="font-display text-[clamp(24px,2.7vw,31px)] font-normal leading-[1.1] tracking-tight text-balance text-l-text">
                  <span className="mr-[0.34em] inline-flex h-[1.72em] w-[1.72em] items-center justify-center rounded-full border border-l-varsity-soft bg-l-varsity-dim align-[0.42em] font-mono text-[0.42em] leading-none text-l-varsity">
                    {s.n}
                  </span>
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
