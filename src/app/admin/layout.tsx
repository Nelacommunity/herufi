import type { Metadata } from "next";
import { AdminSidebar, AdminTopbar } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Herufi" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { profile, user } = await requireAdmin();
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar name={profile.full_name ?? user.email ?? "Admin"} />
      <div className="min-w-0 flex-1">
        <AdminTopbar />
        <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
