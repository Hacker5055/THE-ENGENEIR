import type { Metadata } from "next";
import { AppShell } from "@/components/shells/app-shell";
import { ADMIN_NAV } from "@/lib/nav";
import { adminContext } from "@/lib/server/context";
import { db } from "@/lib/server/store";

export const metadata: Metadata = { title: { default: "لوحة الإدارة", template: "%s · المهندس" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, unread, openComplaints, lockedAttempts } = await adminContext();
  const incidents = db().examEvents.filter((e) => e.severity === "CRITICAL" && Date.now() - e.serverTime < 24 * 3600_000).length;

  return (
    <AppShell
      user={user}
      nav={ADMIN_NAV}
      notificationsHref="/admin/notifications"
      unread={unread}
      badges={{ complaints: openComplaints, incidents, attemptReviews: lockedAttempts }}
    >
      {children}
    </AppShell>
  );
}
