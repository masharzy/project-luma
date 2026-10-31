import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/config";
export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const engine = request.nextUrl.pathname.startsWith("/speaking/") || request.nextUrl.pathname.startsWith("/admin/engine/") || request.nextUrl.pathname.startsWith("/exam/");
  const productMedia=request.nextUrl.pathname.startsWith("/writing-evaluation")||request.nextUrl.pathname.startsWith("/speaking-evaluation/results/");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    engine ? "style-src-attr 'unsafe-inline'" : "style-src-attr 'none'",
    (engine||productMedia) ? "img-src 'self' https: data: blob:" : "img-src 'self' data: blob:",
    (engine||productMedia) ? "media-src 'self' https: blob:" : "media-src 'self'",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev || request.nextUrl.protocol !== "https:"
      ? []
      : ["upgrade-insecure-requests"]),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  const secured = ["/account", "/dashboard", "/settings", "/admin"].some(
    (prefix) =>
      request.nextUrl.pathname === prefix ||
      request.nextUrl.pathname.startsWith(prefix + "/"),
  );
  if (secured) {
    // A cookie check only avoids unnecessary unauthenticated page work.
    // Server layouts and APIs always validate the opaque token in PostgreSQL.
    if (!request.cookies.get(sessionCookieName())?.value) {
      const signInUrl = new URL("/auth/sign-in", request.url);
      if (request.nextUrl.pathname === "/dashboard/subscription") {
        signInUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      }
      const redirect = NextResponse.redirect(signInUrl);
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }
    response.headers.set("Cache-Control", "private, no-store");
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|fonts/).*)",
  ],
};
