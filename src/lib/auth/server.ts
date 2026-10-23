import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
const baseUrl = process.env.NEON_AUTH_BASE_URL;
const secret = process.env.NEON_AUTH_COOKIE_SECRET;
if (!baseUrl || !secret || secret.length < 32) {
  throw new Error(
    "Set NEON_AUTH_BASE_URL and a 32+ character NEON_AUTH_COOKIE_SECRET.",
  );
}
export const auth = createNeonAuth({ baseUrl, cookies: { secret } });
