"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export function VerifyEmailForm({ token }: { token?: string }) {
  const [pending, setPending] = useState(!!token),
    [verified, setVerified] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void (async () => {
      const result = await authClient.verifyEmail({ token });
      if (result.error) setError(result.error.message);
      else {
        setVerified(true);
        window.history.replaceState(null, "", "/auth/verify-email");
      }
      setPending(false);
    })();
  }, [token]);
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await authClient.resendVerification({ email: String(form.get("email") || "") });
    if (result.error) setError(result.error.message);
    else setMessage("If an account is waiting for verification, a new link will arrive shortly.");
    setPending(false);
  }
  return (
    <section className="status-section">
      <div className="status-sheet">
        <span className="eyebrow">YOUR EMAIL / YOUR ACCOUNT</span>
        <h1>{verified ? "Email verified successfully." : pending && token ? "Verifying your email…" : token ? "Check your verification link." : "Check your email."}</h1>
        <p lang="bn">{verified ? "তোমার email verified হয়েছে। Dashboard খুলতে তোমার account-এ sign in থাকতে হবে।" : token ? "এই link শুধু email verify করে। এটি তোমার account-এ কাউকে login করায় না।" : "Verification email আবার পেতে তোমার account-এর email দাও।"}</p>
        {error && <p role="alert" className="form-error">{error}</p>}
        {verified ? (
          <div className="status-actions"><Link className="button" href="/dashboard">Access Dashboard <span>↗</span></Link></div>
        ) : !token ? (
          <form className="auth-form" onSubmit={resend}>
            <label htmlFor="verification-email">Email address
              <input id="verification-email" name="email" type="email" required autoComplete="email" disabled={pending} />
            </label>
            {message && <p role="status" className="success-note">{message}</p>}
            <button className="button" type="submit" disabled={pending}>{pending ? "Please wait…" : "Send verification link"} <span>↗</span></button>
          </form>
        ) : error ? (
          <div className="status-actions"><Link className="button" href="/auth/verify-email">Request a new link <span>↗</span></Link></div>
        ) : <p role="status">Please wait…</p>}
      </div>
    </section>
  );
}
