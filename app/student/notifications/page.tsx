import Link from "next/link";
import { Badge, Button, Icon, type IconName } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { db } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { markNotificationRead, markNotificationsRead } from "@/app/actions/student";
import { makeL, relTime } from "@/lib/utils";

export const metadata = { title: "الإشعارات" };

const ICONS: Record<string, IconName> = {
  EXAM: "file-text",
  ATTENDANCE: "calendar",
  ABSENCE: "alert",
  RESULT: "percent",
  SCHEDULE: "calendar",
  ANNOUNCEMENT: "bell",
  ADMIN: "shield",
  COMPLAINT: "message",
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { user, locale, unread: unreadCount } = await studentContext();
  const l = makeL(locale);
  const { filter = "ALL" } = await searchParams;
  const all = db().notifications.filter((n) => n.userId === user.id);
  const list = filter === "UNREAD" ? all.filter((n) => !n.read) : filter === "HIGH" ? all.filter((n) => n.priority === "HIGH") : all;

  return (
    <div className="pb-6">
      <MobileAppBar
        back={{ href: "/student" }}
        title={l("مركز الإشعارات", "Notification center")}
        subtitle={`${unreadCount} ${l("غير مقروء", "unread")}`}
        right={
          <form action={markNotificationsRead}>
            <Button type="submit" size="xs" variant="ghost" icon="check">{l("قراءة الكل", "Mark all")}</Button>
          </form>
        }
      />
      <div className="space-y-3 px-4 pt-4">
        <div className="flex gap-1.5">
          {[
            { key: "ALL", ar: "الكل", en: "All" },
            { key: "UNREAD", ar: "غير مقروء", en: "Unread" },
            { key: "HIGH", ar: "مهم", en: "Important" },
          ].map((f) => (
            <Link
              key={f.key}
              href={`/student/notifications?filter=${f.key}`}
              className={"rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition " + (filter === f.key ? "border-brand/50 bg-brand/15 text-accent-300" : "border-line text-fg-muted")}
            >
              {l(f.ar, f.en)}
            </Link>
          ))}
        </div>

        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface/50 px-4 py-10 text-center">
            <span className="mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted"><Icon name="bell" size={18} /></span>
            <p className="text-[12px] font-medium text-fg-soft">{l("لا إشعارات", "No notifications")}</p>
            <p className="mt-1 text-[10.5px] text-fg-muted">{l("ستظهر هنا تنبيهات الحضور والاختبارات والنتائج.", "Attendance, exam and result alerts appear here.")}</p>
          </div>
        )}

        <div className="space-y-1.5">
          {list.map((n) => (
            <div
              key={n.id}
              className={"flex items-start gap-2.5 rounded-xl border p-3 transition " + (n.read ? "border-line bg-surface" : "border-brand/25 bg-brand/[0.06]")}
            >
              <span className={"mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg " + (n.read ? "bg-surface-2 text-fg-muted" : "bg-brand/15 text-accent-400")}>
                <Icon name={ICONS[n.category] ?? "bell"} size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5">
                  <p className="flex-1 text-[11.5px] font-medium leading-snug text-fg">{l(n.titleAr, n.titleEn)}</p>
                  {!n.read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent-500" />}
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-fg-muted">{l(n.bodyAr, n.bodyEn)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[9px] text-fg-muted/80">{relTime(n.createdAt, locale)}</span>
                  {n.priority === "HIGH" && <Badge tone="danger">{l("مهم", "Important")}</Badge>}
                  {n.href && (
                    <Link href={n.href} className="text-[9.5px] font-medium text-accent-400 hover:underline">
                      {l("فتح", "Open")} ←
                    </Link>
                  )}
                </div>
              </div>
              {!n.read && (
                <form action={markNotificationRead} className="shrink-0">
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="grid size-7 place-items-center rounded-lg border border-line-strong bg-surface text-fg-muted transition hover:text-fg"
                    aria-label={l("تحديد كمقروء", "Mark as read")}
                    title={l("تحديد كمقروء", "Mark as read")}
                  >
                    <Icon name="check" size={12} />
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>

        <p className="pt-1 text-center text-[9.5px] leading-relaxed text-fg-muted">
          {l("يمكنك ضبط أنواع الإشعارات من الإعدادات.", "You can tune notification categories in settings.")}
        </p>
        <Link href="/student/settings" className="block text-center text-[10.5px] font-medium text-accent-400">
          {l("إعدادات الإشعارات", "Notification settings")}
        </Link>
      </div>
    </div>
  );
}
