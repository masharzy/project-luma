"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
type Mode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
const copy = {
  "sign-in": {
    eyebrow: "WELCOME BACK",
    heading: "Pick up where you left off.",
    detail: "নিজের প্রস্তুতির জায়গায় ফিরে এসো।",
    button: "Sign in",
  },
  "sign-up": {
    eyebrow: "A FRESH START",
    heading: "Your next chapter starts here.",
    detail: "তোমার IELTS প্রস্তুতির জন্য নিজের একটি জায়গা।",
    button: "Create account",
  },
  "forgot-password": {
    eyebrow: "LET’S GET YOU BACK",
    heading: "Forgot your password?",
    detail: "তোমার email দাও। Password বদলানোর link পাঠিয়ে দেব।",
    button: "Send reset link",
  },
  "reset-password": {
    eyebrow: "BACK ON TRACK",
    heading: "Set a new password.",
    detail: "একটি নতুন password দিয়ে আবার শুরু করো।",
    button: "Save new password",
  },
};
export function AuthForm({
  mode,
  token,
  invalidToken = false,
  initialError = "",
}: {
  mode: Mode;
  token?: string;
  invalidToken?: boolean;
  initialError?: string;
}) {
  const c = copy[mode];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError),
    [success, setSuccess] = useState(false);
  const isReset = mode === "reset-password",
    isForgot = mode === "forgot-password";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim(),
      password = String(form.get("password") ?? "");
    try {
      if (isReset && password !== String(form.get("confirmPassword"))) {
        setError("The passwords don’t match. Please try again.");
        return;
      }
      const origin = window.location.origin;
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              name: String(form.get("name") ?? "").trim(),
              email,
              password,
            })
          : mode === "sign-in"
            ? await authClient.signIn.email({ email, password })
            : isForgot
              ? await authClient.requestPasswordReset({
                  email,
                  redirectTo: origin + "/auth/reset-password",
                })
              : await authClient.resetPassword({
                  newPassword: password,
                  token: token!,
                });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (mode === "sign-up" || (mode === "sign-in" && result.data?.requiresVerification))
        window.location.assign("/auth/verify-email");
      else if (isForgot || isReset) setSuccess(true);
      else window.location.assign("/dashboard");
    } catch {
      setError("We couldn’t connect just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setError("");
    setBusy(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + "/dashboard",
        errorCallbackURL: window.location.origin + "/auth/sign-in?error=oauth",
      });
      if (result.error) setError(result.error.message);
    } catch {
      setError("We couldn’t connect to Google. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-section">
      <div className="auth-layout">
        <aside className="auth-story">
          <span className="eyebrow">LUMA / IELTS</span>
          <h2 lang="bn">
            পরের গল্পটা তোমার।
            <br />
            <span>শুরুটা এখানেই।</span>
          </h2>
          <p lang="bn">একটু একটু করে, নিজের লক্ষ্যের দিকে।</p>
          <div className="auth-paper" aria-hidden="true">
            <span>YOUR NEXT</span>
            <strong>chapter.</strong>
            <span>LISTENING / READING / WRITING</span>
          </div>
        </aside>
        <div className="auth-panel">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1>{c.heading}</h1>
          <p lang="bn" className="auth-detail">
            {c.detail}
          </p>
          {success ? (
            <div className="auth-success" role="status">
              <h2>{isForgot ? "Check your inbox." : "Password updated."}</h2>
              <p>{isForgot
                ? "If an account exists for that email, you’ll receive a password reset link. Check your spam folder too."
                : "You can now sign in using your new password."}</p>
              <Link className="button" href="/auth/sign-in">
                Back to sign in <span>↗</span>
              </Link>
            </div>
          ) : invalidToken ? (
            <div role="alert" className="auth-success">
              <p>This reset link is missing, invalid or expired.</p>
              <Link className="button" href="/auth/forgot-password">
                Request a new link <span>↗</span>
              </Link>
            </div>
          ) : (
            <>
              {!isForgot && !isReset && (
                <>
                  <button
                    className="google-button"
                    type="button"
                    onClick={google}
                    disabled={busy}
                  >
                    <span aria-hidden="true" className="google-mark">
                      G
                    </span>
                    Continue with Google<span aria-hidden="true">↗</span>
                  </button>
                  <div className="auth-divider">
                    <span>or use your email</span>
                  </div>
                </>
              )}
              <form onSubmit={submit} className="auth-form" aria-busy={busy}>
                {mode === "sign-up" && (
                  <label htmlFor="name">
                    Your name
                    <input
                      id="name"
                      name="name"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={80}
                      disabled={busy}
                    />
                  </label>
                )}
                {!isReset && (
                  <label htmlFor="email">
                    Email address
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      disabled={busy}
                    />
                  </label>
                )}
                {!isForgot && (
                  <label htmlFor="password">
                    {isReset ? "New password" : "Password"}
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={
                        mode === "sign-in" ? "current-password" : "new-password"
                      }
                      required
                      minLength={mode === "sign-in" ? 1 : 12}
                      maxLength={128}
                      aria-describedby={
                        mode === "sign-in" ? undefined : "password-hint"
                      }
                      disabled={busy}
                    />
                  </label>
                )}
                {!isForgot && mode !== "sign-in" && (
                  <p id="password-hint" className="field-hint">
                    Use at least 12 characters.
                  </p>
                )}
                {isReset && (
                  <label htmlFor="confirmPassword">
                    Confirm new password
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      disabled={busy}
                    />
                  </label>
                )}
                {mode === "sign-in" && (
                  <Link className="auth-forgot" href="/auth/forgot-password">
                    Forgot password?
                  </Link>
                )}
                {error && (
                  <div className="form-error" role="alert">
                    {error}
                    {isReset && (
                      <>
                        {" "}
                        <Link href="/auth/forgot-password">
                          Get a new link.
                        </Link>
                      </>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  className="button auth-submit"
                  disabled={busy}
                >
                  {busy ? "Please wait…" : c.button}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
              <p className="auth-switch">
                {mode === "sign-in" ? (
                  <>
                    New here?{" "}
                    <Link href="/auth/sign-up">Create an account</Link>
                  </>
                ) : mode === "sign-up" ? (
                  <>
                    Already have an account?{" "}
                    <Link href="/auth/sign-in">Sign in</Link>
                  </>
                ) : (
                  <Link href="/auth/sign-in">← Back to sign in</Link>
                )}
              </p>
            </>
          )}
          <Link href="/" className="auth-home">
            ← Back to Luma
          </Link>
        </div>
      </div>
    </section>
  );
}
