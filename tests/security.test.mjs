import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAdminRole } from "../src/lib/auth/policy.ts";
test("admin access fails closed for missing or untrusted roles", () => {
  for (const user of [
    null,
    undefined,
    {},
    { role: null },
    { role: "user" },
    { role: "superadmin" },
    { role: "administrator" },
    { role: "ADMIN" },
    { role: "user,not-admin" },
    { email: "owner@example.com" },
  ])
    assert.equal(hasAdminRole(user), false);
});
test("only an explicit admin role is accepted", () => {
  for (const role of ["admin", "user,admin", "user, admin"])
    assert.equal(hasAdminRole({ role }), true);
});
