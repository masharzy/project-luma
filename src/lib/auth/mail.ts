import "server-only";
import nodemailer from "nodemailer";
import { appOrigin, smtpReady } from "./config";
export class MailUnavailable extends Error {}
export function assertMailReady() {
  if (!smtpReady())
    throw new MailUnavailable("Email delivery is not configured.");
}
export async function sendAuthMail(
  email: string,
  token: string,
  kind: "verify_email" | "reset_password",
) {
  assertMailReady();
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
  const url =
    appOrigin() +
    (kind === "verify_email" ? "/auth/verify-email" : "/auth/reset-password") +
    "?token=" +
    encodeURIComponent(token);
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject:
      kind === "verify_email"
        ? "Verify your Luma email"
        : "Reset your Luma password",
    text:
      kind === "verify_email"
        ? `Finish creating your Luma account:\n\n${url}\n\nEnter the password you chose at signup to complete verification. This link expires in 24 hours. If you did not request this, ignore this email.`
        : `Set a new Luma password:\n\n${url}\n\nThis link expires in 20 minutes. If you did not request it, ignore this email.`,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
