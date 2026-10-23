import "server-only";
import { db } from "./db";
import { digest } from "./crypto";
import { AuthHttpError, limitMany } from "./http";
export const VERIFICATION_COOLDOWN_SECONDS = 60;
export async function verificationResendAt(userId: string) {
  const rows = await db().query(
    "SELECT expires_at FROM app_auth.rate_limits WHERE key_hash=$1 AND window_start=0 AND expires_at>now()",
    [digest("verification-cooldown:" + userId)],
  );
  return rows[0] ? new Date(String(rows[0].expires_at)).getTime() : 0;
}
export async function claimVerificationDelivery(userId: string, network: string) {
  await limitMany([
    { key: "verification-user:" + userId, max: 3, seconds: 900 },
    { key: "verification-day:" + userId, max: 10, seconds: 86400 },
    { key: "verification-network:" + network, max: 12, seconds: 900 },
  ]);
  // One atomic reservation across tabs, devices and concurrent server instances.
  const rows = await db().query(
    `INSERT INTO app_auth.rate_limits(key_hash,window_start,count,expires_at) VALUES($1,0,1,now()+interval '60 seconds') ON CONFLICT(key_hash,window_start) DO UPDATE SET count=app_auth.rate_limits.count+1,expires_at=now()+interval '60 seconds' WHERE app_auth.rate_limits.expires_at<=now() RETURNING expires_at`,
    [digest("verification-cooldown:" + userId)],
  );
  if (!rows[0]) throw new AuthHttpError(429, "Please wait before requesting another email.", "RESEND_COOLDOWN");
  return new Date(String(rows[0].expires_at)).getTime();
}
