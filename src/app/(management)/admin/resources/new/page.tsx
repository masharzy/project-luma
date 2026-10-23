import { AdminDraft } from "@/components/admin-draft";
export const metadata = { title: "Draft resources" };
export default function Page() {
  return <AdminDraft kind="resources" />;
}
