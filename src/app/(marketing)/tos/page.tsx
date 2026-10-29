import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using JumpToNine IELTS practice, AI feedback, accounts, and plans.",
};

export default function TermsOfServicePage() {
  return (
    <PageWrap tone="legal-page">
      <PageIntro
        eyebrow="LEGAL / TERMS"
        title="Terms of Service"
        description="JumpToNine ব্যবহার করার নিয়ম, প্ল্যান ও AI মূল্যায়নের সীমাবদ্ধতা সম্পর্কে জানো।"
      />
      <article className={styles.document}>
        <div className={styles.meta}>
          <span>JumpToNine · IELTS practice platform</span>
          <span>Last updated: 29 October 2026</span>
        </div>
        <p>
          These Terms of Service ("Terms") apply when you access or use
          JumpToNine. By using the platform you agree to these Terms.
          If you do not agree, please do not use the service.
        </p>

        <section className={styles.section}>
          <h2>1. What JumpToNine provides</h2>
          <p>
            JumpToNine offers IELTS-style practice materials, tests, study
            resources, and AI-assisted Writing and Speaking evaluation. We are
            an independent practice platform and are not an official IELTS
            examination body or affiliated with IELTS, the British Council,
            IDP, or Cambridge University Press &amp; Assessment unless expressly
            stated. Practice results do not constitute an official IELTS
            score, certificate, or guarantee of examination performance.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Accounts and security</h2>
          <p>
            You must provide accurate registration information and keep your
            credentials secure. Do not share your account, impersonate others,
            or attempt to bypass account verification, access controls, or
            subscription limits. You are responsible for activity under your
            account. We may restrict access when needed to address abuse,
            security incidents, or violations of these Terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Permitted use and content</h2>
          <p>
            Materials on JumpToNine are provided for personal educational
            practice. You may not redistribute paid content, copy or scrape
            substantial portions of the platform, interfere with the service,
            upload unlawful or infringing materials, or exploit technical
            vulnerabilities. Third-party names, trademarks, and materials
            remain the property of their respective owners.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. AI evaluation and practice results</h2>
          <p>
            AI-generated comments, scores, and band estimates are approximate
            educational feedback and may be inaccurate or incomplete. They
            should not be presented as official IELTS examiner assessments.
            You are responsible for reviewing suggestions and deciding how
            to use them. By submitting text or audio, you authorize JumpToNine
            and the service providers needed to process that submission to
            generate the requested feedback.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Free and premium plans</h2>
          <p>
            Free and paid features, limits, prices, and plan durations are
            described on the <Link href="/pricing">Pricing page</Link>.
            Where premium access is subject to manual approval, access begins
            after approval. A request does not itself create an automatic
            charge or renewal. Any refund or cancellation requests will be
            considered based on the plan terms presented at purchase and
            applicable law. We may change future plans or pricing, but any
            changes to an active purchase must respect applicable obligations.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Availability and changes</h2>
          <p>
            We work to keep JumpToNine available and useful, but access may
            be interrupted for maintenance, upgrades, outages, or security
            reasons. We may correct errors, update learning materials,
            modify features, or discontinue parts of the service. We cannot
            guarantee uninterrupted access or particular learning results.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Privacy and account requests</h2>
          <p>
            Information about how we handle personal data appears in our{" "}
            <Link href="/pp">Privacy Policy</Link>. For account or service
            questions, contact the user-support email shown on JumpToNine's
            Google sign-in consent screen.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Liability and updates</h2>
          <p>
            The service is provided on an "as available" basis to the extent
            permitted by applicable law. Nothing in these Terms limits rights
            that cannot legally be excluded. We may revise these Terms and
            publish the updated version and date here. Continued use after
            updated Terms become effective constitutes acceptance to the
            extent permitted by law.
          </p>
        </section>
      </article>
    </PageWrap>
  );
}
