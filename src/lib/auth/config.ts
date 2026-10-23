export function appOrigin() {
  const raw = process.env.APP_ORIGIN;
  if (!raw) throw new Error("APP_ORIGIN is required.");
  const url = new URL(raw);
  if (url.origin !== raw || url.username || url.password)
    throw new Error("APP_ORIGIN must be an origin without a trailing slash.");
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("APP_ORIGIN must use HTTPS.");
  return url.origin;
}
export function secureCookies() {
  return new URL(appOrigin()).protocol === "https:";
}
export function sessionCookieName() {
  return secureCookies() ? "__Host-luma-session" : "luma-session";
}
export function oauthCookieName() {
  return secureCookies() ? "__Host-luma-oauth" : "luma-oauth";
}
export function googleReady() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
export function smtpReady() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_FROM
  );
}
