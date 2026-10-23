import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
const protect = auth.middleware({ loginUrl: "/auth/sign-in" });
export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const authOrigin = new URL(process.env.NEON_AUTH_BASE_URL!).origin;
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${authOrigin}${isDev ? " ws:" : ""}`,
    `frame-src ${authOrigin} https://accounts.google.com`,
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
    const authResponse = await protect(new NextRequest(request, { headers }));
    if (authResponse.headers.get("location")) {
      authResponse.headers.set("Cache-Control", "private, no-store");
      return authResponse;
    }
    for (const cookie of authResponse.cookies.getAll())
      response.cookies.set(cookie);
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
