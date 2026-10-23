import { NextRequest } from "next/server";
import { db } from "@/lib/auth/db";
import {
  appOrigin,
  googleReady,
  smtpReady,
  sessionCookieName,
} from "@/lib/auth/config";
import {
  hashPassword,
  verifyPassword,
  validPassword,
  validToken,
  randomToken,
  digest,
} from "@/lib/auth/crypto";
import {
  readSession,
  createSession,
  revokeSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import {
  assertMailReady,
  sendAuthMail,
  MailUnavailable,
} from "@/lib/auth/mail";
import {
  json,
  AuthHttpError,
  requireSameOrigin,
  readBody,
  parseEmail,
  parseName,
  limit,
  limitMany,
  networkKey,
  audit,
} from "@/lib/auth/http";
import { beginGoogle, finishGoogle } from "@/lib/auth/google";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const routePath = (request: NextRequest) =>
  request.nextUrl.pathname.replace(/^\/api\/auth\//, "").replace(/\/$/, "");
export async function GET(request: NextRequest) {
  try {
    const path = routePath(request);
    if (path === "get-session")
      return json(
        await readSession(request.cookies.get(sessionCookieName())?.value),
      );
    if (path === "config")
      return json({
        google: googleReady(),
        email: smtpReady(),
        provider: "custom",
      });
    if (path === "google") return await beginGoogle(request);
    if (path === "google/callback") return await finishGoogle(request);
    return json({ message: "Not found." }, 404);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const path = routePath(request);
    const input = await readBody(request);
    const network = networkKey(request);
    const sql = db();

    if (path === "sign-up/email") {
      const email = parseEmail(input.email),
        name = parseName(input.name);
      if (!validPassword(input.password))
        throw new AuthHttpError(400, "Use a password with 12–128 characters.");
      await limitMany([
        { key: "signup-network:" + network, max: 8, seconds: 3600 },
        { key: "signup-email:" + email, max: 3, seconds: 3600 },
      ]);
      assertMailReady();
      const existing = await sql.query(
        "SELECT id FROM app_auth.users WHERE email=$1",
        [email],
      );
      if (existing[0]) return json({ requiresVerification: true });
      const hash = await hashPassword(input.password);
      const token = randomToken();
      const rows = await sql.query(
        `WITH created AS (INSERT INTO app_auth.users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id), ticket AS (INSERT INTO app_auth.email_tokens(token_hash,user_id,kind,expires_at) SELECT $4,id,'verify_email',now()+interval '24 hours' FROM created RETURNING user_id) SELECT id FROM created`,
        [email, name, hash, digest(token)],
      );
      if (rows[0]) {
        await sendAuthMail(email, token, "verify_email");
        await audit(String(rows[0].id), "sign_up");
      }
      return json({ requiresVerification: true });
    }
    if (path === "sign-in/email") {
      const email = parseEmail(input.email);
      await limitMany([
        { key: "login-email:" + email, max: 8 },
        { key: "login-network:" + network, max: 30 },
      ]);
      if (typeof input.password !== "string" || input.password.length > 128)
        throw new AuthHttpError(
          401,
          "Email or password is incorrect.",
          "INVALID_CREDENTIALS",
        );
      const rows = await sql.query(
        "SELECT id,password_hash,email_verified,banned FROM app_auth.users WHERE email=$1",
        [email],
      );
      const user = rows[0];
      const matches = await verifyPassword(
        input.password,
        user?.password_hash as string | undefined,
      );
      if (!matches || !user || user.banned === true)
        throw new AuthHttpError(
          401,
          "Email or password is incorrect.",
          "INVALID_CREDENTIALS",
        );
      if (user.email_verified !== true)
        throw new AuthHttpError(
          403,
          "Verify your email before signing in. Use the verification page to request another link.",
          "EMAIL_UNVERIFIED",
        );
      const token = await createSession(String(user.id));
      await audit(String(user.id), "password_sign_in");
      const response = json({ signedIn: true });
      response.cookies.set(sessionCookieName(), token, sessionCookieOptions());
      return response;
    }
    if (path === "sign-out") {
      await revokeSession(request.cookies.get(sessionCookieName())?.value);
      const response = json({ signedOut: true });
      response.cookies.set(sessionCookieName(), "", {
        ...sessionCookieOptions(),
        maxAge: 0,
      });
      return response;
    }
    if (path === "update-user") {
      const session = await readSession(
        request.cookies.get(sessionCookieName())?.value,
      );
      if (!session)
        throw new AuthHttpError(401, "Sign in to update your profile.");
      await limit("profile:" + session.user.id, 20);
      // Reject unrecognized fields so role, email and password cannot be mass-assigned.
      if (Object.keys(input).some((key) => key !== "name"))
        throw new AuthHttpError(
          400,
          "Only your display name can be changed here.",
        );
      const name = parseName(input.name);
      await sql.query(
        "UPDATE app_auth.users SET name=$1,updated_at=now() WHERE id=$2",
        [name, session.user.id],
      );
      await audit(session.user.id, "profile_updated");
      return json({ updated: true });
    }
    if (path === "request-password-reset" || path === "resend-verification") {
      const email = parseEmail(input.email);
      await limitMany([
        { key: "mail-email:" + email, max: 3 },
        { key: "mail-network:" + network, max: 12 },
      ]);
      assertMailReady();
      const users = await sql.query(
        "SELECT id,email_verified FROM app_auth.users WHERE email=$1 AND banned=false",
        [email],
      );
      if (
        users[0] &&
        (path === "request-password-reset" || users[0].email_verified === false)
      ) {
        const token = randomToken(),
          kind =
            path === "request-password-reset"
              ? "reset_password"
              : "verify_email";
        await sql.query(
          `INSERT INTO app_auth.email_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,$3,now()+($4 * interval '1 second'))`,
          [
            digest(token),
            users[0].id,
            kind,
            kind === "reset_password" ? 1200 : 86400,
          ],
        );
        await sendAuthMail(email, token, kind);
      }
      return json({ accepted: true });
    }
    if (path === "reset-password") {
      if (!validToken(input.token) || !validPassword(input.newPassword))
        throw new AuthHttpError(
          400,
          "The link is invalid or the new password is too short.",
        );
      await limit("reset-network:" + network, 8);
      const hash = await hashPassword(input.newPassword);
      const rows = await sql.query(
        `WITH ticket AS (DELETE FROM app_auth.email_tokens t USING app_auth.users u WHERE t.token_hash=$1 AND t.kind='reset_password' AND t.expires_at>now() AND t.user_id=u.id AND u.banned=false RETURNING t.user_id), changed AS (UPDATE app_auth.users u SET password_hash=$2,email_verified=true,session_version=session_version+1,updated_at=now() FROM ticket WHERE u.id=ticket.user_id RETURNING u.id), revoked AS (DELETE FROM app_auth.sessions WHERE user_id IN(SELECT id FROM changed)), tokens AS (DELETE FROM app_auth.email_tokens WHERE user_id IN(SELECT id FROM changed) AND token_hash<>$1) SELECT id FROM changed`,
        [digest(input.token), hash],
      );
      if (!rows[0])
        throw new AuthHttpError(
          400,
          "This link is invalid, expired or already used.",
          "INVALID_TOKEN",
        );
      await audit(String(rows[0].id), "password_reset");
      const response = json({ updated: true });
      response.cookies.set(sessionCookieName(), "", {
        ...sessionCookieOptions(),
        maxAge: 0,
      });
      return response;
    }
    if (path === "verify-email") {
      if (
        !validToken(input.token) ||
        typeof input.password !== "string" ||
        input.password.length > 128
      )
        throw new AuthHttpError(400, "Invalid verification request.");
      await limit("verify-network:" + network, 8);
      const users = await sql.query(
        `SELECT u.id,u.password_hash FROM app_auth.email_tokens t JOIN app_auth.users u ON u.id=t.user_id WHERE t.token_hash=$1 AND t.kind='verify_email' AND t.expires_at>now() AND u.banned=false`,
        [digest(input.token)],
      );
      if (
        !(await verifyPassword(
          input.password,
          users[0]?.password_hash as string | undefined,
        ))
      )
        throw new AuthHttpError(
          400,
          "The link or password is incorrect.",
          "INVALID_VERIFICATION",
        );
      const rows = await sql.query(
        `WITH ticket AS (DELETE FROM app_auth.email_tokens t USING app_auth.users u WHERE t.token_hash=$1 AND t.kind='verify_email' AND t.expires_at>now() AND t.user_id=u.id AND u.password_hash=$2 AND u.banned=false RETURNING t.user_id), changed AS (UPDATE app_auth.users u SET email_verified=true,updated_at=now() FROM ticket WHERE u.id=ticket.user_id RETURNING u.id) SELECT id FROM changed`,
        [digest(input.token), users[0].password_hash],
      );
      if (!rows[0])
        throw new AuthHttpError(
          400,
          "This verification link has expired or was already used.",
        );
      const token = await createSession(String(rows[0].id));
      await audit(String(rows[0].id), "email_verified");
      const response = json({ verified: true });
      response.cookies.set(sessionCookieName(), token, sessionCookieOptions());
      return response;
    }
    return json({ message: "Not found." }, 404);
  } catch (e) {
    return failure(e);
  }
}
function failure(error: unknown) {
  if (error instanceof AuthHttpError)
    return json({ message: error.message, code: error.code }, error.status);
  if (error instanceof MailUnavailable)
    return json(
      {
        message:
          "Email delivery is not configured yet. Please try again later.",
        code: "EMAIL_UNAVAILABLE",
      },
      503,
    );
  console.error("[auth] Request failed", {
    type: error instanceof Error ? error.name : "UnknownError",
  });
  return json(
    {
      message: "Authentication is temporarily unavailable. Please try again.",
      code: "AUTH_UNAVAILABLE",
    },
    503,
  );
}
