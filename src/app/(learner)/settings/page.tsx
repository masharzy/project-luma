import { requireUser } from "@/lib/auth/guards";
import { WorkspaceHeading } from "@/components/page-parts";
import { ProfileSettings } from "@/components/profile-settings";
export const metadata = { title: "Account settings" };
export default async function Page() {
  const user = await requireUser();
  return (
    <>
      <WorkspaceHeading
        eyebrow="YOUR SPACE / SETTINGS"
        title="Make yourself at home."
        description="তোমার profile আর account security, এক জায়গায়।"
      />
      <ProfileSettings name={user.name || ""} email={user.email} />
    </>
  );
}
