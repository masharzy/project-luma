import type { Metadata } from "next";

export const siteUrl = "https://jumptonine.com";
export const ogImage = { url: "/images/og-jumptonine.png", width: 1200, height: 630, alt: "JumpToNine — Academic IELTS practice" };

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = new URL(path, siteUrl).toString();
  const fullTitle = `${title} · JumpToNine`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "JumpToNine", locale: "bn_BD", title: fullTitle, description, url, images: [ogImage] },
    twitter: { card: "summary", title: fullTitle, description },
  };
}
