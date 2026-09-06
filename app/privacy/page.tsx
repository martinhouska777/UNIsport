import type { Metadata } from "next";
import LegalPage, { Section, List } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — UNIsport",
  description:
    "What UNIsport collects, why, who it is shared with, where it is stored, and how to get your data removed.",
};

/*
  PRIVACY POLICY. Written to match what the app ACTUALLY does today — the
  onboarding fields in lib/onboarding.ts, the tables in db/, the browser
  storage in lib/gymSocial.ts, the Drive permission in lib/varsity/drive.ts and
  the vision call in app/api/varsity/erg-scan/route.ts. If a feature starts
  collecting something new, this page has to change with it.

  2026-09-06 pass. Two things here were WRONG about the app as built, and both
  are the kind of wrong that matters:

    • it said we do not request access to Drive. The varsity video upload asks
      Google for FULL Drive access (lib/varsity/drive.ts explains why a
      narrower one cannot see a folder the squad made). That is now its own
      section — Google's OAuth reviewer reads this page against the scope the
      app asks for, and a mismatch is a refusal, quite apart from it being an
      untrue sentence in a legal document.
    • Anthropic was missing from the processors, though the erg-scan feature
      sends a photo from an athlete's phone to their API.

  Added at the same time, because the app has real people in it now and the
  operator is in the EU: the legal basis for each kind of data, the fact that
  training data says something about your health, where the servers actually
  are (Supabase, AWS us-east-1 — the United States), and what a varsity coach
  can see.

  One typography trap, found by reading the rendered page rather than the file:
  the space after a bold lead-in `<span>` is SWALLOWED in any paragraph that
  also contains an entity like `&apos;` — "Notifications.If you turn on…" shipped
  that way. Every lead-in here now ends `</span>{" "}` so the space is a real
  child, not whitespace the compiler may trim. Keep that when adding one.
*/
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="6 September 2026">
      <Section heading="The short version">
        <p>
          UNIsport is a fitness app for university students. To work, it needs to know who you
          are, what you like to train, and who you train with. We collect what the app needs for
          that and nothing else. We do not sell your data, we do not run ads, and we do not hand
          your information to your university. The one exception is deliberate and you choose it:
          if you join a varsity team, your coach sees your training on that team.
        </p>
        <p>
          UNIsport is an independent product. It is not affiliated with, endorsed by, or operated
          by Harvard University or any other university.
        </p>
      </Section>

      <Section heading="Who is responsible for your data">
        <p>
          UNIsport is operated by Martin Houska, based in the Czech Republic, who is the data
          controller for everything described here. For any privacy question, correction, or
          deletion request, email{" "}
          <a href="mailto:martinhouska777@gmail.com" className="text-l-accent hover:underline">
            martinhouska777@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section heading="What we collect">
        <p>
          <span className="text-l-text">Account details.</span>{" "}
          Your email address and a password. Passwords are stored only as a salted hash by our
          authentication provider — we never see or store your actual password. If you sign in
          with Google instead, we receive your email address, your name, and your Google profile
          picture. We do not receive your Google password. Signing in with Google does not give us
          access to your Gmail, Drive, Calendar, or contacts — the separate, optional Drive
          permission used by varsity video has its own section below.
        </p>
        <p>
          <span className="text-l-text">Your profile.</span>{" "}
          What you enter during onboarding and later edit on your profile:
        </p>
        <List
          items={[
            "Name, class year, sex, and campus residence or house",
            "Concentration, hometown country, languages, and interests",
            "A short bio and a profile photo, if you add them",
            "Training details — your main activity, experience level, split, preferred gyms, weekly schedule, and running or cardio details",
            "Partner and mentoring preferences",
            "Personal records, if you add them",
          ]}
        />
        <p>
          <span className="text-l-text">Training activity.</span>{" "}
          Sessions you log: the date, activity type, gym, who you trained with, exercises with
          sets, reps and weights, distance and duration, notes, and any photos you attach.
        </p>
        <p>
          <span className="text-l-text">Social activity.</span>{" "}
          Direct messages, posts in community channels, session plans you propose or accept, buddy
          board posts, who you follow, and who you record as a training partner.
        </p>
        <p>
          <span className="text-l-text">Notifications.</span>{" "}
          If you turn on push notifications, we store the subscription your browser issues and
          your browser&apos;s user-agent string, so we can deliver notifications to the right
          device.
        </p>
        <p>
          <span className="text-l-text">Varsity athletes.</span>{" "}
          If your team uses UNIsport, this also covers training plans, session logs, race results,
          lineups, and the notes your coach writes about you.
        </p>
        <p>
          <span className="text-l-text">Photos of an erg monitor.</span>{" "}
          If you use the camera to read a workout off a rowing machine, that photo is sent to
          Anthropic, who read the numbers off the screen and return them to the app. We do not
          store the photo.
        </p>
        <p>
          <span className="text-l-text">Stored only on your device.</span>{" "}
          Your gym favourites, gym ratings, crowd reports, and the email address of your last
          sign-in stay in your browser&apos;s local storage and are not sent to our servers.
          Clearing your browser data removes them.
        </p>
      </Section>

      <Section heading="Why we are allowed to use it">
        <p>
          Under UK and EU data protection law we have to say what entitles us to hold each kind of
          data. In plain terms:
        </p>
        <List
          items={[
            "Your account, profile, matches, messages and logs — because you asked us to give you the app, and it cannot work without them.",
            "Your training details, personal records, session logs and the photos you attach — with your consent. Some of it says something about your body and your health, which the law treats as a special category, so we hold it only because you chose to enter it, and you can remove it, or your whole account, at any time.",
            "Push notifications — with your consent, given when your browser asks and withdrawn by turning them off.",
            "Keeping the app working, safe, and free of abuse — our legitimate interest in running a service people can trust.",
          ]}
        />
      </Section>

      <Section heading="What other people can see">
        <p>
          Other signed-in UNIsport users can see your profile: your name, photo, class year,
          residence, training details, bio, and interests. This is the point of the app — it is how
          people find a training partner.
        </p>
        <p>
          Your session photos and personal records are shown on your public profile only if you
          leave those sections switched on. You can turn either off from your profile at any time.
        </p>
        <p>
          Your logged sessions, direct messages, and notification settings are private to you and,
          where relevant, the person you exchanged them with. Posts in community channels are
          visible to everyone in that channel.
        </p>
        <p>
          <span className="text-l-text">If you are on a varsity team.</span>{" "}
          Your coach sees your team training: the sessions you log against the team plan, your
          results, the lineups you are in, the videos uploaded for your crew, and the notes they
          write about you. Your teammates see your name, photo, the lineups you share with them,
          and what is published to the whole squad. What happens on the student side of the app —
          your matches, your direct messages, and the community feed — is not part of the
          coach&apos;s console.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p>
          We do not sell your data and we do not share it for advertising. We use a small number of
          service providers to run the app, and they only process data on our behalf:
        </p>
        <List
          items={[
            "Supabase — database, accounts, and authentication",
            "Vercel — hosting and delivery of the website",
            "Google — if you choose to sign in with Google, and for the varsity video upload described below",
            "Anthropic — only for reading a photo of an erg monitor, when you use that feature",
            "Your browser's push service (Apple, Google, or Mozilla, depending on your device) — only if you enable notifications",
          ]}
        />
        <p>
          We may also disclose information if we are legally required to, or where it is necessary
          to protect someone&apos;s safety.
        </p>
      </Section>

      <Section heading="Google Drive, and your crew's videos">
        <p>
          This applies only to varsity teams, and only if you upload a video. It is optional — the
          rest of the app never asks for it.
        </p>
        <p>
          A crew&apos;s videos belong to the squad, not to us, so they go into the squad&apos;s own
          Google Drive folder rather than onto our servers. To put a file into a folder your team
          already made, Google requires the broad Drive permission: the narrower one only ever sees
          files the app itself created, which is not where your team keeps its videos.
        </p>
        <p>We use that permission for exactly two things, and nothing else:</p>
        <List
          items={[
            "creating the dated folders for a session inside your team's folder, if they are not there yet;",
            "uploading the video you picked, and giving it a link your teammates can open.",
          ]}
        />
        <p>
          We do not read, list, download, or index anything else in your Drive, and no other file of
          yours is ever copied to our servers. The permission itself is a short-lived key that lives
          in the tab you are using, expires within the hour, and is never sent to us or stored by
          us. You can withdraw it at any time at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-l-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          .
        </p>
        <p>
          One thing to know before you upload: so that teammates can actually watch a clip, the app
          asks Drive to make that file viewable by anyone who has its link. The link is only shown
          inside your team&apos;s part of the app, but treat it as you would any shareable link. The
          file stays in your team&apos;s Drive, under your team&apos;s control — deleting it there
          deletes it, and we cannot bring it back.
        </p>
      </Section>

      <Section heading="Where your data is stored">
        <p>
          Our database and accounts are hosted by Supabase on servers in the United States (AWS,
          Northern Virginia). The website itself is delivered by Vercel&apos;s global network.
          Videos are stored in your team&apos;s Google Drive, wherever Google holds it.
        </p>
        <p>
          If you are in the UK or EU, that means your data leaves the UK and the EEA. Those
          transfers are covered by our providers&apos; data processing agreements, which include the
          European Commission&apos;s standard contractual clauses.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          We keep your data for as long as your account exists. If you ask us to delete your
          account, we remove your profile, logs, messages, and posts. Some records may persist
          briefly in routine backups before being overwritten. Videos in your team&apos;s Google
          Drive are not ours to delete — ask whoever administers that folder.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can view and edit most of your information directly in the app, from your profile.
          You can also ask us to give you a copy of your data, correct it, or delete it entirely —
          email the address above and we will action it. If you are in the UK or EU, you have these
          rights under the GDPR, including the right to withdraw consent at any time and the right
          to complain to your local data protection authority.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Data is transmitted over HTTPS and stored with access rules that restrict each row to the
          people entitled to see it. No system is perfectly secure, but we do not store passwords in
          readable form and we keep the data we collect to what the app genuinely needs.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          UNIsport is intended for university students. It is not directed at children under 16, and
          we do not knowingly collect their data. If you believe a child has created an account,
          contact us and we will remove it.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If we change what we collect or how we use it, we will update this page and change the
          date at the top. Significant changes will be flagged in the app.
        </p>
      </Section>
    </LegalPage>
  );
}
