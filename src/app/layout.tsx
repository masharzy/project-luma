import type { Metadata } from "next";
import { site } from "@/config/site";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "@/styles/marketing.css";
import "@/styles/foundation.css";
export const metadata: Metadata = {
  title: { default: `${site.name} IELTS`, template: `%s · ${site.name} IELTS` },
  description: site.description,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <Header />
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
