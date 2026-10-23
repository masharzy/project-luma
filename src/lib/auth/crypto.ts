import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
const parameters = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const randomToken = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function validPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 12 &&
    value.length <= 128 &&
    Buffer.byteLength(value, "utf8") <= 512
  );
}
export function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
export function sameSecret(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, parameters, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function hashPassword(password: string) {
  if (!validPassword(password))
    throw new Error("Password must contain 12–128 characters.");
  const salt = randomBytes(32).toString("hex");
  const hash = await derive(password, salt);
  return `scrypt-v1$131072$8$1$${salt}$${hash.toString("hex")}`;
}
export async function verifyPassword(
  password: string,
  encoded: string | null | undefined,
) {
  const dummy = `scrypt-v1$131072$8$1$${"0".repeat(64)}$${"0".repeat(128)}`;
  const parts = (encoded || dummy).split("$");
  const format =
    parts.length === 6 &&
    parts[0] === "scrypt-v1" &&
    parts[1] === "131072" &&
    parts[2] === "8" &&
    parts[3] === "1" &&
    /^[a-f0-9]{64}$/.test(parts[4]) &&
    /^[a-f0-9]{128}$/.test(parts[5]);
  const safe = format ? parts : dummy.split("$");
  const actual = await derive(password, safe[4]);
  const equal = timingSafeEqual(actual, Buffer.from(safe[5], "hex"));
  return !!encoded && format && equal;
}
