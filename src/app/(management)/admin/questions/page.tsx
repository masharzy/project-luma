import { AdminList } from "@/components/admin-list";
export const metadata = { title: "Manage questions" };
export default function Page() {
  return <AdminList kind="questions" />;
}
