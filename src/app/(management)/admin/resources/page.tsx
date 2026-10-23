import { AdminList } from "@/components/admin-list";
export const metadata = { title: "Manage resources" };
export default function Page() {
  return <AdminList kind="resources" />;
}
