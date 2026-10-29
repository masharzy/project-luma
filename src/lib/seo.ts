import type { Metadata } from "next";

export const siteUrl = "https://jumptonine.com";

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, siteUrl).toString();
  const fullTitle = `${title} · JumpToNine`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "JumpToNine", locale: "bn_BD", title: fullTitle, description, url },
    twitter: { card: "summary", title: fullTitle, description },
  };
}
