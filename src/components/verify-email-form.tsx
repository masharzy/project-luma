"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export function VerifyEmailForm({ token }: { token?: string }) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = token
        ? await authClient.verifyEmail({
            token,
            password: String(form.get("password") || ""),
          })
        : await authClient.resendVerification({
            email: String(form.get("email") || ""),
          });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (token) window.location.assign("/dashboard");
      else
        setMessage(
          "If an account is waiting for verification, a new link will arrive shortly.",
        );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="status-section">
      <div className="status-sheet">
        <span className="eyebrow">YOUR EMAIL / YOUR ACCOUNT</span>
        <h1>{token ? "Finish your first step." : "Check your email."}</h1>
        <p lang="bn">
          {token
            ? "Signup-এর সময় যে password দিয়েছ, সেটি দিয়ে email verification শেষ করো।"
            : "Verification email আবার পেতে তোমার account-এর email দাও।"}
        </p>
        <form className="auth-form" onSubmit={submit}>
          {token ? (
            <label htmlFor="verification-password">
              Your signup password
              <input
                id="verification-password"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="current-password"
                disabled={pending}
              />
            </label>
          ) : (
            <label htmlFor="verification-email">
              Email address
              <input
                id="verification-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={pending}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success-note">
              {message}
            </p>
          )}
          <button className="button" type="submit" disabled={pending}>
            {pending
              ? "Please wait…"
              : token
                ? "Verify email"
                : "Send verification link"}{" "}
            <span>↗</span>
          </button>
        </form>
        <div className="status-actions">
          <Link className="text-link" href="/auth/sign-in">
            Back to sign in ↗
          </Link>
          <Link className="text-link" href="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>
      </div>
    </section>
  );
}
