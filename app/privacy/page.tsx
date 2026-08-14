import type { Metadata } from "next";
import LegalPage, { Section, List } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — UNIsport",
  description:
    "What UNIsport collects, why, who it is shared with, and how to get your data removed.",
};

/*
  PRIVACY POLICY. Written to match what the app ACTUALLY does today — the
  onboarding fields in lib/onboarding.ts, the tables in db/, and the browser
  storage in lib/gymSocial.ts. If a feature starts collecting something new,
  this page has to change with it.
*/
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="14 August 2026">
      <Section heading="The short version">
        <p>
          UNIsport is a fitness app for university students. To work, it needs to know who you
          are, what you like to train, and who you train with. We collect what the app needs for
          that and nothing else. We do not sell your data, we do not run ads, and we do not share
          your information with your university.
        </p>
        <p>
          UNIsport is an independent product. It is not affiliated with, endorsed by, or operated
          by Harvard University or any other university.
        </p>
      </Section>

      <Section heading="Who is responsible for your data">
        <p>
          UNIsport is operated by Martin Houska. For any privacy question, correction, or deletion
          request, email{" "}
          <a href="mailto:martinhouska777@gmail.com" className="text-l-accent hover:underline">
            martinhouska777@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section heading="What we collect">
        <p>
          <span className="text-l-text">Account details.</span> Your email address and a password.
          Passwords are stored only as a salted hash by our authentication provider — we never see
          or store your actual password. If you sign in with Google instead, we receive your email
          address, your name, and your Google profile picture. We do not receive your Google
          password, and we do not request access to Gmail, Drive, Calendar, or your contacts.
        </p>
        <p>
          <span className="text-l-text">Your profile.</span> What you enter during onboarding and
          later edit on your profile:
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
          <span className="text-l-text">Training activity.</span> Sessions you log: the date,
          activity type, gym, who you trained with, exercises with sets, reps and weights,
          distance and duration, notes, and any photos you attach.
        </p>
        <p>
          <span className="text-l-text">Social activity.</span> Direct messages, posts in community
          channels, session plans you propose or accept, buddy board posts, who you follow, and who
          you record as a training partner.
        </p>
        <p>
          <span className="text-l-text">Notifications.</span> If you turn on push notifications, we
          store the subscription your browser issues and your browser&apos;s user-agent string, so
          we can deliver notifications to the right device.
        </p>
        <p>
          <span className="text-l-text">Varsity athletes.</span> If your team uses UNIsport, this
          also covers training plans, session logs, lineups, and coach notes associated with you.
        </p>
        <p>
          <span className="text-l-text">Stored only on your device.</span> Your gym favourites, gym
          ratings, crowd reports, and the email address of your last sign-in stay in your
          browser&apos;s local storage and are not sent to our servers. Clearing your browser data
          removes them.
        </p>
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
            "Google — only if you choose to sign in with Google",
            "Your browser's push service (Apple, Google, or Mozilla, depending on your device) — only if you enable notifications",
          ]}
        />
        <p>
          We may also disclose information if we are legally required to, or where it is necessary
          to protect someone&apos;s safety.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          We keep your data for as long as your account exists. If you ask us to delete your
          account, we remove your profile, logs, messages, and posts. Some records may persist
          briefly in routine backups before being overwritten.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can view and edit most of your information directly in the app, from your profile.
          You can also ask us to give you a copy of your data, correct it, or delete it entirely —
          email the address above and we will action it. If you are in the UK or EU, you have these
          rights under the GDPR, including the right to complain to your local data protection
          authority.
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
