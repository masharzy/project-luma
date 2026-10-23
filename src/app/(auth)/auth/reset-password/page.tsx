import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthForm
      mode="reset-password"
      token={token}
      invalidToken={!token || !!error}
    />
  );
}
