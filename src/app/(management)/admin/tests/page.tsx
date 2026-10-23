import { AdminList } from "@/components/admin-list";
export const metadata = { title: "Manage tests" };
export default function Page() {
  return <AdminList kind="tests" />;
}
