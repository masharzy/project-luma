"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
export function SignOut() {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="button outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error();
            window.location.assign("/auth/sign-in");
          } catch {
            setError("Couldn’t sign you out. Please try again.");
            setPending(false);
          }
        }}
      >
        {pending ? "Signing out…" : "Sign out"} <span>↗</span>
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
