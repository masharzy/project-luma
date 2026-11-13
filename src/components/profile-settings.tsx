"use client";
import { useState, type FormEvent } from "react";
import {PasswordSettings} from "./password-settings";
import { authClient } from "@/lib/auth/client";
export function ProfileSettings({
  name,
  email,
  hasPassword=true,
}: {
  name: string;
  email: string;
  hasPassword?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    const value = String(
      new FormData(e.currentTarget).get("name") || "",
    ).trim();
    if (value.length < 2 || value.length > 80) {
      setError("Use a name between 2 and 80 characters.");
      setPending(false);
      return;
    }
    try {
      const result = await authClient.updateUser({ name: value });
      if (result.error) throw new Error();
      setMessage("Your name has been updated.");
    } catch {
      setError("Couldn’t update your name. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="settings-grid">
      <section className="workspace-panel settings-panel">
        <span className="eyebrow">01 / PROFILE</span>
        <h2>Your profile</h2>
        <p>Change your account name here.</p>
        <form onSubmit={save} className="auth-form">
          <label htmlFor="profile-name">
            Full name
            <input
              id="profile-name"
              name="name"
              defaultValue={name}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              disabled={pending}
            />
          </label>
          <label htmlFor="profile-email">
            Email address
            <input
              id="profile-email"
              type="email"
              value={email}
              readOnly
              disabled
            />
          </label>
          <p className="field-hint">Your sign-in email is managed by JumpToNine.</p>
          {message && (
            <p role="status" className="success-note">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button type="submit" className="button" disabled={pending}>
            {pending ? "Saving…" : "Save changes"} <span>↗</span>
          </button>
        </form>
      </section>
      <section className="workspace-panel settings-panel">
        <span className="eyebrow">02 / SECURITY</span>
        <h2>Password & security</h2>
        {hasPassword?<PasswordSettings/>:<p>This account signs in with Google. To change your password, use your Google account security settings.</p>}
      </section>
    </div>
  );
}
