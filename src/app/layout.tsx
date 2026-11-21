import { headers } from "next/headers";
import type { Metadata } from "next";
import { site } from "@/config/site";
import { SiteFrame } from "@/components/site-frame";
import { BrandIntro, brandIntroScript } from "@/components/brand-intro";
import { SkipLink } from "@/components/skip-link";

import "@/styles/marketing.css";
import "@/styles/foundation.css";
import "@/styles/workspace.css";
import "@/styles/cambridge-question-practice.css";
import "@/styles/other-books.css";
import "@/styles/resources-hub.css";
import "@/styles/practice-guides.css";
import "@/styles/home-fonts.css";
import "@/styles/home-reference.css";
import "@/styles/resources-reference.css";
import "@/styles/plans-reference.css";
import "@/styles/library.css";
import "@/styles/brand-intro.css";
export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  metadataBase: new URL("https://jumptonine.com"),
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined; // Per-request rendering for nonce-based CSP.
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: brandIntroScript }} />
      </head>
      <body>
        <BrandIntro />
        <SkipLink />
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
