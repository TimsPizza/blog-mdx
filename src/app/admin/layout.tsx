import { type ReactNode } from "react";
import { requireAdminOrRedirect } from "@/lib/server/admin-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminOrRedirect();
  return <>{children}</>;
}
