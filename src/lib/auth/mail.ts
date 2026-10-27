import "server-only";
import nodemailer from "nodemailer";
import { appOrigin, emailReady } from "./config";
export class MailUnavailable extends Error {}
export function assertMailReady() {
  if (!emailReady())
    throw new MailUnavailable("Email delivery is not configured.");
}
export async function sendAuthMail(
  email: string,
  token: string,
  kind: "verify_email" | "reset_password",
) {
  assertMailReady();
  const url =
    appOrigin() +
    (kind === "verify_email" ? "/auth/verify-email" : "/auth/reset-password") +
    "?token=" +
    encodeURIComponent(token);
  const message = {
    to: email,
    subject:
      kind === "verify_email"
        ? "Verify your JumpToNine email"
        : "Reset your JumpToNine password",
    text:
      kind === "verify_email"
        ? `Finish creating your JumpToNine account:\n\n${url}\n\nThis link verifies your email only and does not sign you in. This link expires in 24 hours. If you did not request this, ignore this email.`
        : `Set a new JumpToNine password:\n\n${url}\n\nThis link expires in 20 minutes. If you did not request it, ignore this email.`,
  };
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...message, from: process.env.RESEND_FROM_EMAIL }),
        signal: AbortSignal.timeout(15000),
        redirect: "error",
        cache: "no-store",
      });
      if (!response.ok) throw new MailUnavailable("Email delivery failed.");
    } catch {
      // Never expose provider responses, API keys or token-bearing email content.
      throw new MailUnavailable("Email delivery failed.");
    }
    return;
  }
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new MailUnavailable("Email delivery is not configured.");
  const local = ["localhost", "127.0.0.1"].includes(
    process.env.SMTP_HOST || "",
  );
  if (
    !local &&
    (process.env.SMTP_REQUIRE_TLS === "false" ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASSWORD)
  )
    throw new MailUnavailable(
      "Production SMTP requires TLS and authentication.",
    );
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  await transport.sendMail({
    ...message,
    from: process.env.SMTP_FROM,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
