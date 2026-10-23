import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
for (const [path, content] of [
  ["/", "স্কোরের ওপারে"],
  ["/auth/sign-in", "Pick up where you left off."],
  ["/auth/sign-up", "Your next chapter starts here."],
  ["/auth/forgot-password", "Forgot your password?"],
  ["/auth/reset-password", "This reset link is missing, invalid or expired."],
  ["/coming-soon", "Good things take practice."],
]) {
  test(`public page ${path}`, async () => {
    const r = await fetch(base + path);
    assert.equal(r.status, 200);
    assert.ok((await r.text()).includes(content));
  });
}
test("protected account redirects to sign-in", async () => {
  const r = await fetch(base + "/account", { redirect: "manual" });
  assert.ok([302, 303, 307, 308].includes(r.status));
  assert.ok(r.headers.get("location")?.includes("/auth/sign-in"));
});
test("account API rejects direct anonymous requests", async () => {
  const r = await fetch(base + "/api/account");
  assert.equal(r.status, 401);
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.deepEqual(await r.json(), { error: "Unauthorized" });
});
test("auth proxy connects to managed session endpoint", async () => {
  const r = await fetch(base + "/api/auth/get-session");
  assert.equal(r.status, 200);
  assert.equal(await r.json(), null);
});
test("unknown page is a real 404", async () => {
  const r = await fetch(base + "/not-a-real-route");
  assert.equal(r.status, 404);
});

for (const path of [
  "/free",
  "/practice",
  "/practice/listening",
  "/practice/reading",
  "/practice/writing",
  "/cambridge",
  "/cambridge/1",
  "/cambridge/11",
  "/mocks",
  "/resources",
  "/resources/writing",
  "/resources/ebooks",
  "/vocabulary",
  "/grammar",
  "/blog",
  "/pricing",
]) {
  test(`feature page ${path}`, async () => {
    const r = await fetch(base + path);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes("main-navigation"));
  });
}
for (const path of [
  "/dashboard",
  "/dashboard/practice",
  "/dashboard/results",
  "/dashboard/mocks",
  "/dashboard/saved",
  "/settings",
  "/admin",
  "/admin/questions",
  "/admin/questions/new",
  "/admin/tests",
  "/admin/mocks",
  "/admin/resources",
  "/admin/results",
  "/admin/users",
  "/admin/settings",
]) {
  test(`anonymous access denied: ${path}`, async () => {
    const r = await fetch(base + path, { redirect: "manual" });
    assert.ok([302, 303, 307, 308].includes(r.status));
    assert.ok(r.headers.get("location")?.includes("/auth/sign-in"));
    assert.match(r.headers.get("cache-control"), /no-store/);
  });
}
test("direct admin API denies anonymous access", async () => {
  const r = await fetch(base + "/api/admin/access");
  assert.equal(r.status, 401);
  assert.deepEqual(await r.json(), { error: "Unauthorized" });
  assert.match(r.headers.get("cache-control"), /no-store/);
});
test("CSP uses a fresh nonce and binds rendered scripts", async () => {
  const first = await fetch(base + "/");
  const csp = first.headers.get("content-security-policy");
  assert.ok(csp);
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.match(csp, /frame-ancestors 'none'/);
  const nonce = csp.match(/nonce-([^']+)/)?.[1];
  assert.ok(nonce);
  assert.ok((await first.text()).includes(`nonce="${nonce}"`));
  const second = await fetch(base + "/");
  assert.notEqual(csp, second.headers.get("content-security-policy"));
});
test("out-of-range book and unsupported module return 404", async () => {
  for (const path of ["/cambridge/22", "/cambridge/0", "/practice/speaking"]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 404);
  }
});
