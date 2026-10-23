import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="sign-in"
      initialError={
        error === "oauth"
          ? "Google sign-in could not be completed. Please try again."
          : ""
      }
    />
  );
}
