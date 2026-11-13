import { MobileAppBar } from "@/components/shells/mobile-shell";
import { StudentSearch } from "@/components/student/student-search";
import { studentContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "البحث" };

export default async function StudentSearchPage() {
  const { locale, unread } = await studentContext();
  const l = makeL(locale);

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("البحث", "Search")} subtitle={l("مقرراتك واختباراتك", "Your courses and exams")} unread={unread} />
      <StudentSearch />
    </div>
  );
}
