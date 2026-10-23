import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  validPassword,
  validToken,
  randomToken,
  digest,
  sameSecret,
} from "../src/lib/auth/crypto.ts";
test("password hashes use independent salts and verify without plaintext storage", async () => {
  const password = "A private test password, long enough.";
  const first = await hashPassword(password),
    second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("A different password", first), false);
});
test("unknown, tampered and missing password formats fail closed", async () => {
  for (const value of [null, "broken", "scrypt-v1$2$8$1$bad$bad"])
    assert.equal(await verifyPassword("A long test password", value), false);
});
test("password bounds and token shape are enforced", () => {
  assert.equal(validPassword("short"), false);
  assert.equal(validPassword("x".repeat(129)), false);
  assert.equal(validPassword("x".repeat(12)), true);
  const token = randomToken();
  assert.equal(validToken(token), true);
  assert.equal(validToken("bad"), false);
  assert.equal(validToken(token + "!"), false);
  assert.equal(digest(token).length, 64);
  assert.equal(sameSecret("state", "state"), true);
  assert.equal(sameSecret("state", "wrong"), false);
  assert.equal(sameSecret("state", "longer"), false);
});

import { sessionCookieName, secureCookies } from "../src/lib/auth/config.ts";
test("HTTPS deployments use host-only secure cookie naming", () => {
  const old = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = "https://app.example.com";
    assert.equal(sessionCookieName(), "__Host-luma-session");
    assert.equal(secureCookies(), true);
    process.env.APP_ORIGIN = "http://127.0.0.1:3110";
    assert.equal(sessionCookieName(), "luma-session");
    assert.equal(secureCookies(), false);
  } finally {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  }
});
