import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section, List } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — UNIsport",
  description: "The rules for using UNIsport.",
};

/*
  TERMS OF SERVICE. Kept deliberately short and readable — the app is a student
  fitness product, not an enterprise service. Required alongside the privacy
  policy by Google's OAuth consent screen.
*/
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="14 August 2026">
      <Section heading="Using UNIsport">
        <p>
          UNIsport helps university students find gyms, training partners, and sessions on campus.
          By creating an account you agree to these terms. If you do not agree with them, please
          do not use the app.
        </p>
        <p>
          UNIsport is an independent product. It is not affiliated with, endorsed by, or operated
          by Harvard University or any other university. Gym names and campus locations are
          referenced for identification only.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You need an account to use the app, and you must give accurate information when you
          create one. You are responsible for keeping your login details safe and for what happens
          under your account. Do not create an account for someone else or pretend to be another
          person.
        </p>
        <p>
          The app is intended for university students and is not for anyone under 16.
        </p>
      </Section>

      <Section heading="How to behave">
        <p>Because this app puts real students in touch with each other, the rules matter:</p>
        <List
          items={[
            "Treat other members with respect. No harassment, threats, hate speech, or discrimination.",
            "Do not post sexual, violent, or illegal content, and do not upload photos of other people without their agreement.",
            "Do not use the app to advertise, recruit, spam, or sell anything.",
            "Do not misrepresent who you are, your experience, or your qualifications.",
            "Do not attempt to break, overload, scrape, or gain unauthorised access to the service.",
          ]}
        />
        <p>
          We can suspend or remove any account that breaks these rules, and we can remove content
          without notice where it is necessary.
        </p>
      </Section>

      <Section heading="Your content">
        <p>
          What you post — your profile, photos, logs, and messages — stays yours. By posting it you
          give us permission to store and display it inside the app so the app can function. You
          can delete your content, or your whole account, at any time.
        </p>
      </Section>

      <Section heading="Training safety — please read this one">
        <p>
          UNIsport is not a medical service and does not give medical, health, or professional
          fitness advice. Training plans, logs, and anything suggested by other members are not
          professional guidance. Speak to a doctor before starting a new training programme.
        </p>
        <p>
          You train at your own risk. You are also responsible for your own judgement when meeting
          people you find through the app — meet in public gym spaces, and tell someone where you
          are going. We do not vet, background-check, or verify members beyond confirming an email
          address.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The app is provided as it is, without guarantees. It may be unavailable, may lose data, or
          may change or stop entirely. To the extent the law allows, we are not liable for loss
          arising from your use of the app, including injury from training or anything that happens
          between you and another member.
        </p>
      </Section>

      <Section heading="Changes and contact">
        <p>
          We may update these terms; the date at the top will change and significant updates will be
          flagged in the app. Continuing to use UNIsport after a change means you accept it.
        </p>
        <p>
          Questions go to{" "}
          <a href="mailto:martinhouska777@gmail.com" className="text-l-accent hover:underline">
            martinhouska777@gmail.com
          </a>
          . See also our{" "}
          <Link href="/privacy" className="text-l-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
