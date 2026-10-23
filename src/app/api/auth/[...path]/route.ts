import { NextRequest } from "next/server";
import { db } from "@/lib/auth/db";
import {
  appOrigin,
  googleReady,
  emailReady,
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
  readAccountSession,
  createPendingSession,
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
import { claimVerificationDelivery, verificationResendAt } from "@/lib/auth/verification";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const routePath = (request: NextRequest) =>
  request.nextUrl.pathname.replace(/^\/api\/auth\//, "").replace(/\/$/, "");
export async function GET(request: NextRequest) {
  try {
    const path = routePath(request);
    if (path === "get-session")
      return json(
        await readAccountSession(request.cookies.get(sessionCookieName())?.value),
      );
    if (path === "verification-status") {
      const session = await readAccountSession(request.cookies.get(sessionCookieName())?.value);
      if (!session) throw new AuthHttpError(401, "Sign in to verify your email.");
      return json({ email: session.user.email, verified: session.user.emailVerified,
        resendAt: session.user.emailVerified ? 0 : await verificationResendAt(session.user.id) });
    }
    if (path === "config")
      return json({
        google: googleReady(),
        email: emailReady(),
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
    if (path === "sign-up/email") {
      const sql = db();
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
      if (existing[0]) throw new AuthHttpError(409, "Unable to create this account. Try signing in or resetting your password.");
      const hash = await hashPassword(input.password);
      const token = randomToken();
      const rows = await sql.query(
        `WITH created AS (INSERT INTO app_auth.users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id), ticket AS (INSERT INTO app_auth.email_tokens(token_hash,user_id,kind,expires_at) SELECT $4,id,'verify_email',now()+interval '24 hours' FROM created RETURNING user_id) SELECT id FROM created`,
        [email, name, hash, digest(token)],
      );
      if (!rows[0]) throw new AuthHttpError(409, "Unable to create this account. Try signing in or resetting your password.");
      const userId = String(rows[0].id);
      const sessionToken = await createPendingSession(userId);
      const resendAt = await claimVerificationDelivery(userId, network);
      let emailSent = false;
      try {
        await sendAuthMail(email, token, "verify_email");
        emailSent = true;
      } catch {
        // The created account/session remain usable for a later authenticated resend.
      }
      await audit(userId, "sign_up");
      const response = json({ requiresVerification: true, emailSent, resendAt });
      response.cookies.set(sessionCookieName(), sessionToken, { ...sessionCookieOptions(), maxAge: 86400 });
      return response;
    }

    if (path === "sign-in/email") {
      const sql = db();
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
      const pending = user.email_verified !== true;
      const token = pending
        ? await createPendingSession(String(user.id))
        : await createSession(String(user.id));
      await audit(String(user.id), "password_sign_in");
      const response = json({ signedIn: true, requiresVerification: pending });
      response.cookies.set(sessionCookieName(), token, { ...sessionCookieOptions(), ...(pending ? { maxAge: 86400 } : {}) });
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
      const sql = db();
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
    if (path === "resend-verification") {
      const session = await readAccountSession(request.cookies.get(sessionCookieName())?.value);
      if (!session) throw new AuthHttpError(401, "Sign in to resend your verification email.");
      // The recipient comes exclusively from the authenticated database user.
      if (Object.keys(input).length) throw new AuthHttpError(400, "Recipient overrides are not allowed.");
      if (session.user.emailVerified) throw new AuthHttpError(400, "Your email is already verified.");
      assertMailReady();
      const sql = db();
      const resendAt = await claimVerificationDelivery(session.user.id, network);
      const token = randomToken();
      await sql.query(
        "INSERT INTO app_auth.email_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,'verify_email',now()+interval '24 hours')",
        [digest(token), session.user.id],
      );
      await sendAuthMail(session.user.email, token, "verify_email");
      return json({ accepted: true, resendAt });
    }
    if (path === "request-password-reset") {
      const sql = db();
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
      if (users[0]) {
        const token = randomToken(), kind = "reset_password";
        await sql.query(
          `INSERT INTO app_auth.email_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,$3,now()+($4 * interval '1 second'))`,
          [
            digest(token),
            users[0].id,
            kind,
            1200,
          ],
        );
        await sendAuthMail(email, token, kind);
      }
      return json({ accepted: true });
    }
    if (path === "reset-password") {
      const sql = db();
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
      const sql = db();
      if (!validToken(input.token))
        throw new AuthHttpError(400, "Invalid verification request.");
      await limit("verify-network:" + network, 8);
      const rows = await sql.query(
        `WITH ticket AS (DELETE FROM app_auth.email_tokens t USING app_auth.users u WHERE t.token_hash=$1 AND t.kind='verify_email' AND t.expires_at>now() AND t.user_id=u.id AND u.banned=false RETURNING t.user_id), changed AS (UPDATE app_auth.users u SET email_verified=true,updated_at=now() FROM ticket WHERE u.id=ticket.user_id RETURNING u.id) SELECT id FROM changed`,
        [digest(input.token)],
      );
      if (!rows[0])
        throw new AuthHttpError(
          400,
          "This verification link has expired or was already used.",
        );
      await audit(String(rows[0].id), "email_verified");
      // Email ownership is not authentication. Never create a session here.
      return json({ verified: true });
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
