import Link from "next/link";
import { Badge, Card, CardHeader, Icon, Progress, SearchInput, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard, ToolbarBar } from "@/components/shells/app-shell";
import { BarChart, Donut } from "@/components/charts";
import { db, findCourse, findTeacher } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "بنك الأسئلة" };

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<{ course?: string; type?: string; difficulty?: string; q?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const all = db().questions;
  const list = all.filter((x) => {
    if (sp.course && x.courseId !== sp.course) return false;
    if (sp.type && x.type !== sp.type) return false;
    if (sp.difficulty && x.difficulty !== sp.difficulty) return false;
    if (q && !x.promptAr.toLowerCase().includes(q) && !x.promptEn.toLowerCase().includes(q)) return false;
    return true;
  });

  const byType = Object.entries(
    all.reduce<Record<string, number>>((acc, x) => {
      acc[x.type] = (acc[x.type] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value, color: label === "MCQ" ? "#38A5FF" : label === "ESSAY" ? "#19B88A" : label === "TRUE_FALSE" ? "#F2A93B" : "#78879B" }));

  const byDifficulty = [
    { label: l("سهل", "Easy"), value: all.filter((x) => x.difficulty === "EASY").length, color: "#19B88A" },
    { label: l("متوسط", "Medium"), value: all.filter((x) => x.difficulty === "MEDIUM").length, color: "#38A5FF" },
    { label: l("صعب", "Hard"), value: all.filter((x) => x.difficulty === "HARD").length, color: "#F05252" },
  ];

  const mostUsed = [...all].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("بنك الأسئلة المؤسسي", "Institutional question bank")}
        subtitle={l("جودة الأسئلة، التوازن، ومعدل إعادة الاستخدام", "Item quality, balance, and reuse rate")}
        breadcrumb={[{ label: l("التقييم", "Assessment") }, { label: l("بنك الأسئلة", "Question bank") }]}
        badge={<Badge tone="neutral">{all.length} {l("سؤالاً", "items")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("إجمالي الأسئلة", "Total items")} value={all.length} icon="layers" tone="brand" />
        <StatCard label={l("موضوعية", "Objective")} value={all.filter((x) => ["MCQ", "TRUE_FALSE", "FILL_BLANK"].includes(x.type)).length} icon="check-circle" tone="accent" />
        <StatCard label={l("مقالية", "Essay")} value={all.filter((x) => x.type === "ESSAY").length} icon="edit" tone="warning" hint={l("تحتاج تصحيحاً بشرياً", "human graded")} />
        <StatCard label={l("متوسط الاستخدام", "Average reuse")} value={(all.reduce((a, x) => a + x.usageCount, 0) / Math.max(1, all.length)).toFixed(1)} icon="refresh" tone="neutral" hint={l("مرة لكل سؤال", "uses per item")} />
      </section>

      <ToolbarBar>
        <form action="/admin/questions" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput name="q" defaultValue={sp.q} placeholder={l("بحث في نص السؤال…", "Search prompts…")} className="h-9 w-full max-w-[240px]" />
          <select name="course" defaultValue={sp.course ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            <option value="">{l("كل المقررات", "All courses")}</option>
            {db().courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <select name="type" defaultValue={sp.type ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            <option value="">{l("كل الأنواع", "All types")}</option>
            {["MCQ", "TRUE_FALSE", "ESSAY", "FILL_BLANK", "MATCHING", "IMAGE", "FILE"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select name="difficulty" defaultValue={sp.difficulty ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            <option value="">{l("كل الصعوبات", "Any difficulty")}</option>
            <option value="EASY">{l("سهل", "Easy")}</option>
            <option value="MEDIUM">{l("متوسط", "Medium")}</option>
            <option value="HARD">{l("صعب", "Hard")}</option>
          </select>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-semibold text-fg-soft hover:text-fg">
            <Icon name="filter" size={13} /> {l("تصفية", "Filter")}
          </button>
        </form>
        <span className="text-[11.5px] text-fg-muted">{list.length} {l("نتيجة", "results")}</span>
      </ToolbarBar>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title={l("التوزيع حسب النوع", "By item type")} icon="layers" />
          <BarChart data={byType} horizontal ariaLabel={l("التوزيع حسب النوع", "By item type")} />
        </Card>
        <Card>
          <CardHeader title={l("التوزيع حسب الصعوبة", "By difficulty")} icon="chart" />
          <Donut segments={byDifficulty} size={120} thickness={13} centerLabel={l("سؤال", "items")} centerValue={String(all.length)} ariaLabel={l("التوزيع حسب الصعوبة", "By difficulty")} />
        </Card>
        <Card>
          <CardHeader title={l("الأكثر استخداماً", "Most reused")} icon="refresh" />
          <div className="space-y-2">
            {mostUsed.map((x) => (
              <div key={x.id}>
                <p className="truncate text-[10.5px] text-fg-soft">{l(x.promptAr, x.promptEn)}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div className="flex-1"><Progress value={Math.min(100, x.usageCount * 12)} size="sm" tone="brand" /></div>
                  <span className="tnum text-[9px] text-fg-muted">{x.usageCount}×</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false} className="overflow-hidden">
        <CardHeader title={l("الأسئلة", "Items")} subtitle={`${list.length} ${l("سؤالاً بعد التصفية", "items after filtering")}`} icon="list-checks" />
        <TableWrap>
          <thead>
            <tr>
              <Th>{l("السؤال", "Prompt")}</Th>
              <Th>{l("المقرر", "Course")}</Th>
              <Th>{l("المعلم", "Author")}</Th>
              <Th align="center">{l("النوع", "Type")}</Th>
              <Th align="center">{l("الصعوبة", "Difficulty")}</Th>
              <Th align="center">{l("الدرجة", "Marks")}</Th>
              <Th align="center">{l("الاستخدام", "Uses")}</Th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 25).map((x) => {
              const course = findCourse(x.courseId);
              const teacher = findTeacher(x.teacherId);
              return (
                <tr key={x.id} className="transition hover:bg-surface-2/60">
                  <Td><p className="max-w-[420px] truncate text-[11px] text-fg">{l(x.promptAr, x.promptEn)}</p></Td>
                  <Td><Link href={`/admin/questions?course=${x.courseId}`} className="font-mono text-[9.5px] text-brand-500 hover:underline">{course?.code}</Link></Td>
                  <Td><span className="truncate text-[10px] text-fg-muted">{teacher ? l(teacher.nameAr, teacher.nameEn) : "—"}</span></Td>
                  <Td align="center"><Badge tone="neutral">{x.type}</Badge></Td>
                  <Td align="center">
                    <span className={`text-[10px] ${x.difficulty === "HARD" ? "text-danger-500" : x.difficulty === "EASY" ? "text-success-500" : "text-warn-500"}`}>{x.difficulty}</span>
                  </Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{x.marks}</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-muted">{x.usageCount}</span></Td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><Td colSpan={7} className="py-8 text-center text-[11.5px] text-fg-muted">{l("لا أسئلة مطابقة.", "No matching items.")}</Td></tr>}
          </tbody>
        </TableWrap>
        {list.length > 25 && <p className="px-4 py-2.5 text-[10px] text-fg-muted">{l(`تُعرض أول 25 من ${list.length}.`, `Showing first 25 of ${list.length}.`)}</p>}
      </Card>

      <Card>
        <CardHeader title={l("جودة البنك", "Bank quality checks")} icon="check-circle" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: l("توازن الصعوبة", "Difficulty balance"), d: `EASY ${byDifficulty[0].value} · MEDIUM ${byDifficulty[1].value} · HARD ${byDifficulty[2].value}`, ok: byDifficulty[1].value >= byDifficulty[0].value * 0.5 },
            { t: l("نسبة المقالي", "Essay ratio"), d: `${Math.round((all.filter((x) => x.type === "ESSAY").length / Math.max(1, all.length)) * 100)}% ${l("من البنك", "of the bank")}`, ok: all.filter((x) => x.type === "ESSAY").length / Math.max(1, all.length) < 0.4 },
            { t: l("إعادة الاستخدام", "Reuse"), d: `${all.filter((x) => x.usageCount > 0).length} ${l("سؤالاً استُخدم مرة على الأقل", "items used at least once")}`, ok: true },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-2 rounded-lg border border-line bg-surface-2/50 p-3">
              <Icon name={x.ok ? "check-circle" : "alert-circle"} size={14} className={x.ok ? "mt-0.5 shrink-0 text-success-500" : "mt-0.5 shrink-0 text-warn-500"} />
              <div>
                <p className="text-[11px] font-semibold text-fg">{x.t}</p>
                <p className="mt-0.5 text-[9.5px] text-fg-muted">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
