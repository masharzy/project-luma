"use client";
import { useEffect, useState } from "react";
import { mockReturnPath } from "./return-path";
import type { AuthResult, AuthSession } from "./types";
async function request<T = Record<string, unknown>>(
  path: string,
  input?: unknown,
): Promise<AuthResult<T>> {
  try {
    const response = await fetch("/api/auth/" + path, {
      method: input === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers:
        input === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: input === undefined ? undefined : JSON.stringify(input),
    });
    const body = await response.json();
    if (!response.ok)
      return {
        data: null,
        error: {
          message:
            typeof body.message === "string"
              ? body.message
              : "Unable to complete this request.",
          code: body.code,
        },
      };
    return { data: body, error: null };
  } catch {
    return {
      data: null,
      error: { message: "Couldn’t connect. Please try again." },
    };
  }
}
function useSession() {
  const [data, setData] = useState<AuthSession | null>(null),
    [isPending, setPending] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await request<AuthSession>("get-session");
      if (active) {
        setData(result.data);
        setPending(false);
      }
    };
    void load();
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      window.removeEventListener("focus", focus);
    };
  }, []);
  return { data, isPending };
}
export const authClient = {
  useSession,
  signUp: {
    email: (data: { name: string; email: string; password: string }) =>
      request<{ requiresVerification: boolean }>("sign-up/email", data),
  },
  signIn: {
    email: (data: { email: string; password: string }) =>
      request("sign-in/email", data),
    social: async (_data: {
      provider: string;
      callbackURL?: string;
      errorCallbackURL?: string;
    }) => {
      const config = await request<{ google: boolean }>("config");
      if (!config.data?.google)
        return {
          data: null,
          error: { message: "Google sign-in is not configured yet." },
        };
      const next=mockReturnPath(new URLSearchParams(window.location.search).get("next"));
      window.location.assign("/api/auth/google?next="+encodeURIComponent(next));
      return { data: null, error: null };
    },
  },
  signOut: () => request("sign-out", {}),
  getSession: () => request<AuthSession>("get-session"),
  updateUser: (data: { name: string }) => request("update-user", data),
  requestPasswordReset: (data: { email: string; redirectTo?: string }) =>
    request("request-password-reset", { email: data.email }),
  resetPassword: (data: { newPassword: string; token: string }) =>
    request("reset-password", data),
  verifyEmail: (data: { token: string }) =>
    request("verify-email", data),
  verificationStatus: () => request<{ email: string; verified: boolean; resendAt: number }>("verification-status"),
  resendVerification: () => request<{ accepted: boolean; resendAt: number }>("resend-verification", {}),
};
