import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "https://jumptonine.com/pp" },
  title: "Privacy Policy",
  description: "How JumpToNine collects, uses, shares, and protects information for IELTS practice, Google sign-in, and AI evaluation.",
};

export default function PrivacyPolicyPage() {
  return (
    <PageWrap tone="legal-page">
      <PageIntro
        eyebrow="LEGAL / PRIVACY"
        title="Privacy Policy"
        description="তোমার তথ্য কীভাবে ব্যবহার ও সুরক্ষিত রাখা হয়, তা এখানে পরিষ্কারভাবে জানানো হয়েছে।"
      />
      <article className={styles.document}>
        <div className={styles.meta}>
          <span>JumpToNine · IELTS practice platform</span>
          <span>Last updated: 29 October 2026</span>
        </div>
        <p>
          JumpToNine ("we", "us", or "our") provides online IELTS preparation,
          practice tests, and AI-assisted Writing and Speaking feedback. This
          policy explains what information we process when you visit or use
          JumpToNine and what choices you have.
        </p>

        <section className={styles.section}>
          <h2>1. Information we collect</h2>
          <ul>
            <li><strong>Account information:</strong> your name, email address,
              account identifiers, verification status, and sign-in method.
              Passwords for email accounts are stored as secure hashes, not
              readable passwords.</li>
            <li><strong>Google sign-in information:</strong> your Google account
              identifier and basic profile details, including your name and
              email address, when you choose Sign in with Google.</li>
            <li><strong>Practice information:</strong> test selections, answers,
              progress, writing submissions, speaking recordings, evaluation
              results, and feedback associated with your account or attempts.</li>
            <li><strong>Subscription information:</strong> plan selections,
              access status, and requests for a paid plan, if applicable.</li>
            <li><strong>Technical and security information:</strong> IP
              address, browser or device information, session identifiers,
              authentication events, and error or abuse-prevention logs.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. How Google sign-in data is used</h2>
          <p>
            Google sign-in requests only the <code>openid</code>, <code>email</code>,
            and <code>profile</code> scopes. We use this information to identify
            you, create or access your JumpToNine account, and secure your
            session. We do not request access to Gmail, Google Drive, or your
            other Google content. Google profile data is not used to train
            JumpToNine's AI evaluation systems, and we do not sell it.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Why we process information</h2>
          <p>
            We use information to provide and protect accounts, enable practice
            tests and saved progress, evaluate Writing and Speaking submissions,
            manage plan access, send verification or account-related emails,
            respond to support requests, prevent abuse, and maintain the service.
            We do not sell your personal information.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. AI Writing and Speaking evaluation</h2>
          <p>
            If you submit writing or audio for AI feedback, the submission and
            relevant task context may be sent to external AI services used by
            JumpToNine, such as Google Gemini or models accessed through
            OpenRouter. Those providers process the submitted content to
            generate feedback. Please do not include passwords, financial
            details, or other sensitive personal information in your answers.
            AI band estimates are for practice, not official IELTS scores.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. When information is shared</h2>
          <p>
            We share only the information necessary to operate the platform
            with service providers that support hosting, database and file
            storage, account email delivery, and AI evaluation. Providers may
            include Vercel, Neon, Cloudflare, email delivery services, Google,
            and OpenRouter, depending on the feature and configuration in use.
            We may also disclose information when required by law or to protect
            the security of our users and service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Cookies and security</h2>
          <p>
            We use essential cookies and similar technical identifiers to
            maintain sessions and protect sign-in flows. We use access controls
            and security safeguards intended to protect information, but no
            internet service can guarantee absolute security. You can control
            cookies in your browser; disabling essential cookies may prevent
            sign-in from working.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Retention and your choices</h2>
          <p>
            We retain account, practice, and technical information for as long
            as reasonably needed to provide the service, secure accounts, and
            meet applicable obligations. You may request access, correction,
            or deletion of your personal information. Some records may need
            to be retained for legitimate security or legal reasons. To make a
            privacy request, use the user-support email published on the
            JumpToNine Google sign-in consent screen and include
            "Privacy Request" in your subject. We may verify that the request
            relates to your account before acting.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Children and international services</h2>
          <p>
            JumpToNine is intended for people preparing for IELTS, not for
            children to use without appropriate parental or guardian guidance.
            Information may be processed by infrastructure or AI providers in
            countries other than your own.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Updates to this policy</h2>
          <p>
            We may update this policy when the service or applicable
            requirements change. We will post the revised date and policy
            on this page. For rules about using JumpToNine, read our{" "}
            <Link href="/tos">Terms of Service</Link>.
          </p>
        </section>
      </article>
    </PageWrap>
  );
}
