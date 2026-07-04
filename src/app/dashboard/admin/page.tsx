import { requireAuth } from "@/lib/auth-server";
import { Role } from "@prisma/client";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  // Protect page at server component level - Only Admin allowed
  const session = await requireAuth([Role.SYSTEM_ADMIN]);

  return (
    <AdminDashboard currentUserRole={session.role} />
  );
}
