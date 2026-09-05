import Link from "next/link";
import { about, contact, type SocialLink } from "@/lib/landingCopy";

/*
  CONTACT — its own tab (/contact) and the section after About on the whole
  page. The address (the one on /privacy and /terms), then the socials row.
  The socials are data in lib/landingCopy.ts: a platform with an `href`
  renders as a link with its handle; one without renders as a muted
  "coming soon" chip that is not a link — so the row can be reviewed before
  the accounts exist and never points anywhere dead.
*/

/* The three marks, drawn as simple single-colour glyphs (currentColor) so
   they take the text colour like everything else in the bar. */
function Glyph({ icon }: { icon: SocialLink["icon"] }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  if (icon === "instagram") {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (icon === "tiktok") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M13.5 3h2.6c.2 1.2.8 2.3 1.7 3.1.9.8 2 1.3 3.2 1.4v2.7a7.6 7.6 0 0 1-4.9-1.6v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.8a2.9 2.9 0 1 0 2.1 2.7V3z" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="currentColor">
      <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
    </svg>
  );
}

function Social({ s }: { s: SocialLink }) {
  const base = "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium tracking-tight transition-colors";
  if (s.href) {
    return (
      <a
        href={s.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} border-l-line text-l-text hover:border-l-line-hover hover:bg-l-surface`}
      >
        <Glyph icon={s.icon} />
        {s.name}
        {s.handle && <span className="text-l-text-2">{s.handle}</span>}
      </a>
    );
  }
  return (
    <span aria-disabled className={`${base} border-l-line text-l-text-2`}>
      <Glyph icon={s.icon} />
      {s.name}
      <span className="font-mono text-[11px] uppercase tracking-wider">{contact.comingSoon}</span>
    </span>
  );
}

export default function Contact() {
  return (
    <section id="contact" className="relative z-[1] scroll-mt-20 border-t border-l-line px-6 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1160px] gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-l-accent">{contact.kicker}</div>
        <div>
          <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[1.02] tracking-tight text-balance text-l-text">
            {contact.headline}
          </h2>
          <p className="mt-6 max-w-[62ch] text-[clamp(16px,1.8vw,18px)] leading-[1.65] text-l-text-2">{contact.body}</p>

          {/* The owner, 2026-09-04: the Why is important for students, so it is
              linked from here too, not only from the About section. Same label
              as that link (about.readWhy) — one wording for one destination. */}
          <p className="mt-5 text-[15px]">
            <Link
              href={contact.whyHref}
              className="tap44 inline-block font-medium text-l-accent underline-offset-4 transition-colors hover:underline"
            >
              {about.readWhy} →
            </Link>
          </p>

          <p className="mt-8 font-mono text-[13px] tracking-wide text-l-text-2">
            <span className="uppercase">{contact.emailLabel}</span>{" "}
            <a href={`mailto:${about.email}`} className="ml-3 text-l-text underline-offset-4 transition-colors hover:underline">
              {about.email}
            </a>
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3">
            <span className="mr-1 font-mono text-[13px] uppercase tracking-wide text-l-text-2">{contact.socialsLabel}</span>
            {contact.socials.map((s) => (
              <Social key={s.name} s={s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
