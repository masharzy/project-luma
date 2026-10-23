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
