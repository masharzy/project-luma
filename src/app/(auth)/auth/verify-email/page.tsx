import { VerifyEmailForm } from "@/components/verify-email-form";
export const metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailForm token={token} />;
}
