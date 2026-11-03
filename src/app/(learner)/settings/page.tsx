import {db} from "@/lib/auth/db";
import { requireUser } from "@/lib/auth/guards";
import { StudentHeading } from "@/components/learner-panels";
import { ProfileSettings } from "@/components/profile-settings";
export const metadata = { title: "Account settings" };
export default async function Page() {
  const user = await requireUser();
  const row=(await db().query("SELECT password_hash IS NOT NULL AS has_password FROM app_auth.users WHERE id=$1",[user.id]))[0];
  return (
    <>
      <StudentHeading title="Account" description="Profile ও security settings।" />
      <ProfileSettings name={user.name || ""} email={user.email} hasPassword={row?.has_password===true} />
    </>
  );
}
