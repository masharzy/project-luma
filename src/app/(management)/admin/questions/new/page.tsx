import { AdminDraft } from "@/components/admin-draft";
export const metadata = { title: "Draft questions" };
export default function Page() {
  return <AdminDraft kind="questions" />;
}
