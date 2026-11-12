import { Badge, Card, CardHeader, Field, Icon, Input, Select, Textarea } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { Donut } from "@/components/charts";
import { db } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { broadcastNotification, markAdminNotificationsRead } from "@/app/actions/admin";
import { makeL, relTime } from "@/lib/utils";

export const metadata = { title: "مركز الإشعارات" };

const CATEGORY: Record<string, { ar: string; en: string; tone: "brand" | "success" | "warning" | "danger" | "accent" | "neutral" }> = {
  ATTENDANCE: { ar: "حضور", en: "Attendance", tone: "brand" },
  ABSENCE: { ar: "غياب", en: "Absence", tone: "danger" },
  EXAM: { ar: "اختبار", en: "Exam", tone: "warning" },
  RESULT: { ar: "نتيجة", en: "Result", tone: "success" },
  SCHEDULE: { ar: "جدول", en: "Schedule", tone: "accent" },
  ANNOUNCEMENT: { ar: "تعميم", en: "Announcement", tone: "neutral" },
  ADMIN: { ar: "إداري", en: "Admin", tone: "brand" },
  COMPLAINT: { ar: "طلب", en: "Request", tone: "warning" },
};

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const all = db().notifications;
  const mine = all.filter((n) => n.userId === user.id);
  const unread = mine.filter((n) => !n.read).length;

  const byCategory = Object.entries(
    all.reduce<Record<string, number>>((acc, n) => {
      acc[n.category] = (acc[n.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([k, value], i) => ({ label: l(CATEGORY[k]?.ar ?? k, CATEGORY[k]?.en ?? k), value, color: ["#38A5FF", "#19B88A", "#F2A93B", "#F05252", "#2864D9", "#78879B"][i % 6] }));

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("مركز الإشعارات", "Notification center")}
        subtitle={l("تعميمات، إشعارات آلية، وسجل لكل رسالة أُرسلت", "Broadcasts, automated notices, and a log of every message sent")}
        breadcrumb={[{ label: l("العمليات", "Operations") }, { label: l("الإشعارات", "Notifications") }]}
        actions={
          <form action={markAdminNotificationsRead}>
            <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
              <Icon name="check" size={14} /> {l("تحديد الكل كمقروء", "Mark all read")}
            </button>
          </form>
        }
        badge={<Badge tone={unread ? "warning" : "success"} dot>{unread} {l("غير مقروء لك", "unread for you")}</Badge>}
      />

      {sp.error && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.08] px-4 py-2.5 text-[12px] text-danger-500">
          <Icon name="alert-circle" size={14} className="me-1 inline" /> {l("العنوان والنص مطلوبان لإرسال التعميم.", "A title and body are required to send a broadcast.")}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("كل الرسائل", "All messages")} value={all.length} icon="bell" tone="brand" />
        <StatCard label={l("غير مقروءة", "Unread")} value={all.filter((n) => !n.read).length} icon="mail" tone="warning" />
        <StatCard label={l("عالية الأولوية", "High priority")} value={all.filter((n) => n.priority === "HIGH").length} icon="alert" tone="danger" />
        <StatCard label={l("المستلمون", "Recipients")} value={new Set(all.map((n) => n.userId)).size} icon="users" tone="accent" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title={l("إرسال تعميم", "Send a broadcast")} subtitle={l("يصل فوراً إلى التطبيقات والبريد", "Delivered instantly to apps and email")} icon="send" />
          <form action={broadcastNotification} className="space-y-2.5">
            <Field label={l("الجمهور", "Audience")}>
              <Select name="audience" defaultValue="ALL">
                <option value="ALL">{l("الجميع في المؤسسة", "Everyone")}</option>
                <option value="STUDENTS">{l("الطلاب فقط", "Students only")}</option>
                <option value="TEACHERS">{l("هيئة التدريس فقط", "Faculty only")}</option>
                <option value="ACADEMIC">{l("الطلاب وهيئة التدريس", "Students & faculty")}</option>
              </Select>
            </Field>
            <Field label={l("العنوان", "Title")} required>
              <Input name="titleAr" required minLength={3} placeholder={l("مثال: تأجيل محاضرة الشبكات", "e.g. Networks lecture postponed")} />
            </Field>
            <Field label={l("النص", "Body")} required>
              <Textarea name="bodyAr" rows={3} required minLength={5} placeholder={l("اكتب الرسالة بوضوح وحدد الإجراء المطلوب…", "Write clearly and state the required action…")} />
            </Field>
            <label className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2">
              <input type="checkbox" name="priority" className="h-3.5 w-3.5 accent-[#2864D9]" />
              <span className="text-[10.5px] text-fg-soft">{l("أولوية عالية (إشعار فوري)", "High priority (instant push)")}</span>
            </label>
            <button type="submit" className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-[12.5px] font-semibold text-white hover:bg-brand-600">
              <Icon name="send" size={14} /> {l("إرسال التعميم", "Send broadcast")}
            </button>
            <p className="text-[9px] leading-relaxed text-fg-muted">
              {l("التعميمات لا تُحذف — تبقى في سجل الرسائل مع المرسل والوقت والجمهور.", "Broadcasts are never deleted — they stay in the message log with sender, time and audience.")}
            </p>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("التوزيع حسب النوع", "Distribution by type")} icon="chart" />
            <div className="flex flex-wrap items-center gap-4">
              <Donut segments={byCategory} size={130} thickness={13} ariaLabel={l("توزيع الإشعارات", "Notification distribution")} />
              <div className="min-w-[180px] flex-1 space-y-1">
                {byCategory.map((c) => (
                  <div key={c.label} className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 text-fg-muted">{c.label}</span>
                    <span className="tnum font-medium text-fg-soft">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <CardHeader title={l("سجل الرسائل", "Message log")} subtitle={`${all.length} ${l("رسالة", "messages")}`} icon="list-checks" />
            <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {all.slice(0, 24).map((n) => {
                const target = db().users.find((u) => u.id === n.userId);
                const cat = CATEGORY[n.category] ?? CATEGORY.ANNOUNCEMENT;
                return (
                  <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <Badge tone={cat.tone}>{l(cat.ar, cat.en)}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-fg">{l(n.titleAr, n.titleEn)}</p>
                      <p className="truncate text-[9.5px] text-fg-muted">{l(n.bodyAr, n.bodyEn)}</p>
                      <p className="mt-0.5 text-[8.5px] text-fg-muted">
                        {target ? l(target.nameAr, target.nameEn) : n.userId} · {n.audienceRole} · {relTime(n.createdAt, locale)}
                      </p>
                    </div>
                    {n.priority === "HIGH" && <Badge tone="danger">{l("عالي", "High")}</Badge>}
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title={l("قنوات التسليم", "Delivery channels")} icon="wifi" subtitle={l("ما هو مُفعّل فعلياً في هذه النسخة", "What is actually enabled in this build")} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: l("داخل التطبيق", "In-app"), s: l("مُفعّل", "Enabled"), ok: true },
            { t: l("بريد إلكتروني", "Email"), s: l("مُفعّل (محاكاة)", "Enabled (simulated)"), ok: true },
            { t: l("إشعار دفع", "Push"), s: l("مُفعّل (محاكاة)", "Enabled (simulated)"), ok: true },
            { t: l("SMS", "SMS"), s: l("غير مهيّأ", "Not configured"), ok: false },
          ].map((c) => (
            <div key={c.t} className="rounded-lg border border-line bg-surface-2/50 px-3 py-2">
              <p className="text-[11px] font-medium text-fg">{c.t}</p>
              <p className={`mt-0.5 flex items-center gap-1 text-[9.5px] ${c.ok ? "text-success-500" : "text-fg-muted"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${c.ok ? "bg-success-500" : "bg-fg-muted"}`} /> {c.s}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
