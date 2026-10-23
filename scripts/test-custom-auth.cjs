/* Requires an explicitly approved disposable database and owner URL. Never targets production implicitly. */
const { spawn } = require("node:child_process");
const { SMTPServer } = require("smtp-server");
const { neon } = require("@neondatabase/serverless");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const file = process.argv[2];
if (!file) throw Error("Pass a private test env file explicitly.");
const env = Object.fromEntries(
  fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const at = l.indexOf("=");
      return [l.slice(0, at), l.slice(at + 1)];
    }),
);
if (
  env.AUTH_TEST_DATABASE_APPROVED !== "custom-auth-validation" ||
  !env.DATABASE_URL ||
  !env.AUTH_TEST_OWNER_DATABASE_URL
)
  throw Error("Disposable test database approval and owner URL required.");
const host = new URL(env.DATABASE_URL).hostname;
if (
  host !== new URL(env.AUTH_TEST_OWNER_DATABASE_URL).hostname ||
  host.includes("ep-jolly-cherry")
)
  throw Error("Refusing mismatched or production database.");
const sql = neon(env.DATABASE_URL),
  owner = neon(env.AUTH_TEST_OWNER_DATABASE_URL);
const origin = env.APP_ORIGIN;
if (origin !== "http://127.0.0.1:3110" || env.SMTP_HOST !== "127.0.0.1")
  throw Error("Test origin/mail transport must be local.");
const messages = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["AUTH", "STARTTLS"],
  onData(stream, session, callback) {
    let raw = "";
    stream.on("data", (b) => (raw += b.toString()));
    stream.on("end", () => {
      messages.push(raw.replace(/=\r?\n/g, "").replace(/=3D/g, "="));
      callback();
    });
  },
});
let server;
let logs = "";
let count = 0;
let cookie = "";
const ok = (label) => {
  count++;
  console.log("PASS", label);
};
const tokenFromLastMail = () => {
  const token = messages.at(-1)?.match(/token=([A-Za-z0-9_-]{43})/)?.[1];
  assert.ok(token, "Expected a token in captured local mail");
  return token;
};
async function call(path, input, options = {}) {
  const headers = {
    ...(input === undefined
      ? {}
      : { "content-type": "application/json", origin }),
    ...(cookie ? { cookie } : {}),
    ...options.headers,
  };
  const r = await fetch(origin + path, {
    method: input === undefined ? "GET" : "POST",
    headers,
    body: input === undefined ? undefined : JSON.stringify(input),
    redirect: "manual",
    signal: AbortSignal.timeout(90000),
  });
  return r;
}
function remember(r) {
  const value = r.headers.get("set-cookie");
  assert.ok(value);
  cookie = value.split(";")[0];
  assert.match(value, /HttpOnly/i);
  assert.match(value, /SameSite=lax/i);
}
(async () => {
  try {
    await new Promise((r) => smtp.listen(2525, "127.0.0.1", r));
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "-p",
        "3110",
        "-H",
        "127.0.0.1",
      ],
      {
        env: {
          ...process.env,
          ...env,
          GOOGLE_CLIENT_ID: "local-qa-client",
          GOOGLE_CLIENT_SECRET: "local-qa-only-not-a-real-secret",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    server.stdout.on("data", (b) => (logs += b));
    server.stderr.on("data", (b) => (logs += b));
    for (let i = 0; i < 40; i++) {
      try {
        const r = await call("/");
        if (r.status === 200) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    const email = "qa-" + randomUUID() + "@example.invalid",
      password = "A long test password " + randomUUID(),
      newPassword = "Another strong password " + randomUUID();
    let r = await call(
      "/api/auth/sign-up/email",
      { name: "QA User", email, password },
      { headers: { origin: "https://untrusted.example" } },
    );
    assert.equal(r.status, 403);
    ok("Cross-origin signup blocked");
    r = await call("/api/auth/sign-up/email", {
      name: "QA User",
      email,
      password: "short",
    });
    assert.equal(r.status, 400);
    ok("Short password blocked");
    r = await call("/api/auth/sign-up/email", {
      name: "QA User",
      email,
      password,
      role: "admin",
    });
    assert.equal(r.status, 200);
    const verifyToken = tokenFromLastMail();
    let rows = await sql.query(
      "SELECT id,role,password_hash,email_verified FROM app_auth.users WHERE email=$1",
      [email],
    );
    const userId = rows[0].id;
    assert.equal(rows[0].role, "user");
    assert.equal(rows[0].email_verified, false);
    assert.ok(!rows[0].password_hash.includes(password));
    ok(
      "Signup stores a hash, never accepts an injected admin role, and sends verification mail",
    );
    remember(r);
    const pendingCookie = cookie;
    r = await call("/dashboard");
    assert.equal(r.status, 307);
    assert.match(r.headers.get("location"), /auth\/verify-email/);
    r = await call("/api/account");
    assert.equal(r.status, 401);
    r = await call("/auth/verify-email");
    assert.equal(r.status, 200);
    const verificationPage = await r.text();
    assert.ok(verificationPage.includes(email));
    assert.ok(!verificationPage.includes('type="email"'));
    ok("Pending signup session reaches only its account-bound verification page");
    r = await call("/api/auth/resend-verification", { email: "other@example.invalid" });
    assert.equal(r.status, 400);
    r = await call("/api/auth/resend-verification", {});
    assert.equal(r.status, 429);
    await owner.query("UPDATE app_auth.rate_limits SET expires_at=now()-interval '1 second' WHERE key_hash=$1 AND window_start=0", [createHash("sha256").update("verification-cooldown:"+userId).digest("hex")]);
    r = await call("/api/auth/resend-verification", {});
    assert.equal(r.status, 200);
    assert.ok(messages.at(-1).includes(email));
    ok("Authenticated resend rejects recipient overrides and enforces backend cooldown");
    cookie = "";
    r = await call("/api/auth/resend-verification", {email});
    assert.equal(r.status, 401);
    ok("Anonymous API cannot send verification mail to an arbitrary email");
    r = await call("/api/auth/sign-in/email", { email, password });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).requiresVerification, true);
    remember(r);
    r = await call("/dashboard/results");
    assert.equal(r.status, 307);
    assert.match(r.headers.get("location"), /auth\/verify-email/);
    ok("Unverified password sign-in remains restricted on nested dashboard routes");
    cookie = "";
    r = await call("/api/auth/verify-email", { token: verifyToken });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("set-cookie"), null);
    r = await call("/api/auth/get-session");
    assert.equal(await r.json(), null);
    ok("Email link verifies without creating a session in another browser");
    cookie = pendingCookie;
    r = await call("/dashboard");
    assert.equal(r.status, 200);
    ok("Original signup session accesses dashboard immediately after verification");
    r = await call("/api/auth/verify-email", { token: verifyToken });
    assert.equal(r.status, 400);
    ok("Verification token cannot be replayed");
    r = await call("/api/auth/get-session");
    let session = await r.json();
    assert.equal(session.user.email, email);
    assert.equal(session.user.role, "user");
    ok("Session restores with fresh database user data");
    r = await call("/api/admin/access");
    assert.equal(r.status, 403);
    r = await call("/admin");
    assert.equal(r.status, 404);
    ok("Learner cannot access admin API or pages");
    r = await call("/api/auth/update-user", { name: "QA Name", role: "admin" });
    assert.equal(r.status, 400);
    ok("Profile mass-assignment blocked");
    r = await call("/api/auth/update-user", { name: "QA Updated" });
    assert.equal(r.status, 200);
    r = await call("/api/auth/get-session");
    assert.equal((await r.json()).user.name, "QA Updated");
    ok("Profile update persists");
    let denied = false;
    try {
      await sql.query("UPDATE app_auth.users SET role='admin' WHERE id=$1", [
        userId,
      ]);
    } catch {
      denied = true;
    }
    assert.ok(denied);
    ok("Runtime DB role cannot promote an account");
    await owner.query("UPDATE app_auth.users SET role='admin' WHERE id=$1", [
      userId,
    ]);
    r = await call("/api/admin/access");
    assert.equal(r.status, 200);
    await owner.query("UPDATE app_auth.users SET role='user' WHERE id=$1", [
      userId,
    ]);
    r = await call("/api/admin/access");
    assert.equal(r.status, 403);
    ok("Admin grant and revocation take effect immediately");
    const oldCookie = cookie;
    r = await call("/api/auth/request-password-reset", { email });
    assert.equal(r.status, 200);
    const resetToken = tokenFromLastMail();
    r = await call("/api/auth/reset-password", {
      token: resetToken,
      newPassword,
    });
    assert.equal(r.status, 200);
    cookie = oldCookie;
    r = await call("/api/auth/get-session");
    assert.equal(await r.json(), null);
    ok("Password reset revokes existing sessions");
    r = await call("/api/auth/reset-password", {
      token: resetToken,
      newPassword,
    });
    assert.equal(r.status, 400);
    ok("Password reset token cannot be replayed");
    r = await call("/api/auth/sign-in/email", { email, password });
    assert.equal(r.status, 401);
    r = await call("/api/auth/sign-in/email", { email, password: newPassword });
    assert.equal(r.status, 200);
    remember(r);
    ok("Only the new password works");
    const rawSession = cookie.split("=")[1];
    rows = await sql.query(
      "SELECT token_hash FROM app_auth.sessions WHERE user_id=$1",
      [userId],
    );
    assert.ok(
      rows.every(
        (row) => row.token_hash !== rawSession && row.token_hash.length === 64,
      ),
    );
    ok("Session tokens are hashed at rest");
    r = await call("/api/auth/sign-out", {});
    assert.equal(r.status, 200);
    r = await call("/api/auth/get-session");
    assert.equal(await r.json(), null);
    ok("Sign-out revokes the server session");
    cookie = "";
    const expired = randomBytes(32).toString("base64url");
    await sql.query(
      "INSERT INTO app_auth.email_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,'reset_password',now()-interval '1 minute')",
      [createHash("sha256").update(expired).digest("hex"), userId],
    );
    r = await call("/api/auth/reset-password", { token: expired, newPassword });
    assert.equal(r.status, 400);
    ok("Expired reset token rejected");
    r = await call("/api/auth/google");
    assert.equal(r.status, 307);
    const location = new URL(r.headers.get("location"));
    assert.equal(location.hostname, "accounts.google.com");
    assert.equal(location.searchParams.get("code_challenge_method"), "S256");
    assert.ok(location.searchParams.get("nonce"));
    assert.ok(location.searchParams.get("state"));
    ok("Google start uses PKCE, state and nonce");
    const state = location.searchParams.get("state");
    r = await call(
      "/api/auth/google/callback?state=" + state + "&code=not-a-real-code",
    );
    assert.match(r.headers.get("location"), /error=oauth/);
    ok("OAuth callback without the state cookie is rejected");
    const attackEmail = "rate-" + randomUUID() + "@example.invalid";
    let limited = false;
    for (let i = 0; i < 10; i++) {
      r = await call("/api/auth/sign-in/email", {
        email: attackEmail,
        password: "invalid-but-long-enough",
      });
      if (r.status === 429) {
        limited = true;
        break;
      }
    }
    assert.ok(limited);
    ok("Persistent database rate limiter blocks repeated login attempts");
    denied = false;
    try {
      await sql.query('SELECT count(*) FROM neon_auth."user"');
    } catch {
      denied = true;
    }
    assert.ok(denied);
    ok("Runtime role cannot read the old managed-auth schema");
    console.log("Custom auth integration checks passed:", count);
    console.log("No production users or external emails were created.");
  } catch (e) {
    console.error(e.message);
    console.log(logs.slice(-3000));
    process.exitCode = 1;
  } finally {
    if (server) server.kill();
    await new Promise((r) => smtp.close(r));
    setTimeout(() => process.exit(process.exitCode || 0), 500).unref();
  }
})();
