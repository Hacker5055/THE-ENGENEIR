import { Button, Icon } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { SettingsPanel } from "@/components/student/settings-panel";
import { logoutAction } from "@/app/actions/auth";
import { db } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const { student, locale, unread } = await studentContext();
  const l = makeL(locale);
  const savedPrefs = db().studentPrefs[student.id];

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("الإعدادات", "Settings")} subtitle={`${student.nameAr} · ${student.studentNumber}`} unread={unread} />
      <div className="px-4 pt-4">
        <SettingsPanel initial={savedPrefs} />
        <form action={logoutAction} className="mt-4">
          <Button type="submit" variant="outline" size="lg" icon="logout" className="w-full text-danger-500">
            {l("تسجيل الخروج", "Sign out")}
          </Button>
        </form>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[9.5px] text-fg-muted">
          <Icon name="shield-check" size={11} /> {l("جلسة HttpOnly · انتهاء تلقائي بعد 8 ساعات", "HttpOnly session · auto-expires after 8 hours")}
        </p>
      </div>
    </div>
  );
}
