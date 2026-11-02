import { requireUser } from "@/lib/auth/guards";
import { StudentHeading } from "@/components/learner-panels";
import { ProfileSettings } from "@/components/profile-settings";
export const metadata = { title: "Account settings" };
export default async function Page() {
  const user = await requireUser();
  return (
    <>
      <StudentHeading title="Account" description="Profile ও security settings।" />
      <ProfileSettings name={user.name || ""} email={user.email} />
    </>
  );
}
