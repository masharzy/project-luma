import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  appOrigin,
  googleReady,
  oauthCookieName,
  secureCookies,
  sessionCookieName,
} from "./config";
import { randomToken, digest, validToken, sameSecret } from "./crypto";
import { db } from "./db";
import { createSession, sessionCookieOptions } from "./session";
import { AuthHttpError, audit, limit, networkKey, parseEmail } from "./http";
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export async function beginGoogle(request: NextRequest) {
  if (!googleReady())
    throw new AuthHttpError(
      503,
      "Google sign-in is not configured yet.",
      "GOOGLE_UNAVAILABLE",
    );
  await limit("google:" + networkKey(request), 30);
  const state = randomToken(),
    verifier = randomToken(),
    nonce = randomToken();
  await db().query(
    `INSERT INTO app_auth.oauth_flows(state_hash,verifier,nonce,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')`,
    [digest(state), verifier, nonce],
  );
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: appOrigin() + "/api/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(oauthCookieName(), state, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
export async function finishGoogle(request: NextRequest) {
  const fail = () => {
    const response = NextResponse.redirect(
      appOrigin() + "/auth/sign-in?error=oauth",
    );
    response.cookies.set(oauthCookieName(), "", {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  try {
    if (!googleReady()) return fail();
    await limit("google-callback:" + networkKey(request), 40);
    const state = request.nextUrl.searchParams.get("state");
    const cookie = request.cookies.get(oauthCookieName())?.value;
    const code = request.nextUrl.searchParams.get("code");
    if (
      !validToken(state) ||
      !cookie ||
      !sameSecret(state, cookie) ||
      !code ||
      code.length > 4096
    )
      return fail();
    const flows = await db().query(
      `DELETE FROM app_auth.oauth_flows WHERE state_hash=$1 AND expires_at>now() RETURNING verifier,nonce`,
      [digest(state)],
    );
    if (!flows[0]) return fail();
    const exchange = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: appOrigin() + "/api/auth/google/callback",
        grant_type: "authorization_code",
        code_verifier: String(flows[0].verifier),
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!exchange.ok) return fail();
    const tokens = await exchange.json();
    if (typeof tokens.id_token !== "string") return fail();
    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID,
      algorithms: ["RS256"],
      maxTokenAge: "10m",
      requiredClaims: ["exp", "iat", "sub", "email", "email_verified", "nonce"],
      clockTolerance: 10,
    });
    if (
      payload.email_verified !== true ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.nonce !== flows[0].nonce
    )
      return fail();
    const email = parseEmail(payload.email);
    const sql = db();
    let rows = await sql.query(
      `SELECT u.id,u.banned FROM app_auth.identities i JOIN app_auth.users u ON u.id=i.user_id WHERE i.provider='google' AND i.subject=$1`,
      [payload.sub],
    );
    if (!rows[0]) {
      // Never auto-link a pre-existing email to a new Google subject.
      const name =
        typeof payload.name === "string"
          ? payload.name.slice(0, 80).trim() || "Learner"
          : "Learner";
      rows = await sql.query(
        `WITH created AS (INSERT INTO app_auth.users(email,name,email_verified) VALUES($1,$2,true) ON CONFLICT(email) DO NOTHING RETURNING id,banned), identity AS (INSERT INTO app_auth.identities(provider,subject,user_id) SELECT 'google',$3,id FROM created RETURNING user_id) SELECT id,banned FROM created`,
        [email, name, payload.sub],
      );
    }
    if (!rows[0] || rows[0].banned === true) return fail();
    const token = await createSession(String(rows[0].id));
    await audit(String(rows[0].id), "google_sign_in");
    const response = NextResponse.redirect(appOrigin() + "/dashboard");
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(sessionCookieName(), token, sessionCookieOptions());
    response.cookies.set(oauthCookieName(), "", {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return fail();
  }
}
