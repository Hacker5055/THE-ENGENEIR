"use client";

import { useMemo, useState } from "react";
import { Avatar, Badge, Icon, Progress, SearchInput, TableWrap, Td, Th } from "@/components/ui";
import { usePrefs } from "@/components/providers";
import { cx } from "@/lib/utils";

export interface RosterRow {
  id: string;
  nameAr: string;
  nameEn: string;
  number: string;
  rate: number;
  absences: number;
  total: number | null;
  letter: string | null;
  gpa: number;
  status: "ACTIVE" | "PROBATION" | "SUSPENDED" | "GRADUATED";
}

type SortKey = "name" | "rate" | "total";

export function RosterTable({ rows, courseCode }: { rows: RosterRow[]; courseCode: string }) {
  const { l, locale } = usePrefs();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter(
      (r) => !needle || r.nameAr.toLowerCase().includes(needle) || r.nameEn.toLowerCase().includes(needle) || r.number.includes(needle),
    );
    out.sort((a, b) => {
      const dir = asc ? 1 : -1;
      if (sort === "name") return (locale === "ar" ? a.nameAr.localeCompare(b.nameAr, "ar") : a.nameEn.localeCompare(b.nameEn)) * dir;
      if (sort === "rate") return (a.rate - b.rate) * dir;
      return ((a.total ?? -1) - (b.total ?? -1)) * dir;
    });
    return out;
  }, [rows, q, sort, asc, locale]);

  const toggle = (key: SortKey) => {
    if (sort === key) setAsc(!asc);
    else {
      setSort(key);
      setAsc(true);
    }
  };

  const avgRate = rows.length ? Math.round(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("ابحث باسم الطالب أو الرقم…", "Search student or ID…")} className="h-9 w-full max-w-xs" />
        <span className="text-[11px] text-fg-muted">
          {l(`${filtered.length} من ${rows.length}`, `${filtered.length} of ${rows.length}`)} · {l("متوسط الحضور", "avg attendance")} {avgRate}%
        </span>
        <span className="ms-auto font-mono text-[10px] text-fg-muted">{courseCode}</span>
      </div>

      <TableWrap>
        <thead>
          <tr>
            <Th>
              <button onClick={() => toggle("name")} className="inline-flex items-center gap-1 hover:text-fg">
                {l("الطالب", "Student")} {sort === "name" && <Icon name={asc ? "chevron-up" : "chevron-down"} size={11} />}
              </button>
            </Th>
            <Th>{l("الرقم الأكاديمي", "Student no.")}</Th>
            <Th>
              <button onClick={() => toggle("rate")} className="inline-flex items-center gap-1 hover:text-fg">
                {l("الحضور", "Attendance")} {sort === "rate" && <Icon name={asc ? "chevron-up" : "chevron-down"} size={11} />}
              </button>
            </Th>
            <Th>{l("غياب", "Absences")}</Th>
            <Th align="end">
              <button onClick={() => toggle("total")} className="inline-flex items-center gap-1 hover:text-fg">
                {l("الدرجة", "Score")} {sort === "total" && <Icon name={asc ? "chevron-up" : "chevron-down"} size={11} />}
              </button>
            </Th>
            <Th>{l("التقدير", "Grade")}</Th>
            <Th align="end">{l("الحالة", "Status")}</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="transition hover:bg-surface-2/70">
              <Td>
                <div className="flex items-center gap-2">
                  <Avatar name={locale === "ar" ? r.nameAr : r.nameEn} size={26} />
                  <span className="text-[11.5px] font-medium text-fg">{l(r.nameAr, r.nameEn)}</span>
                </div>
              </Td>
              <Td><span className="font-mono text-[10.5px] text-fg-muted">{r.number}</span></Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="w-16"><Progress value={r.rate} size="sm" tone={r.rate >= 85 ? "success" : r.rate >= 75 ? "warning" : "danger"} /></div>
                  <span className={cx("tnum text-[10.5px]", r.rate >= 85 ? "text-fg-soft" : "text-warn-500")}>{r.rate}%</span>
                </div>
              </Td>
              <Td><span className={cx("tnum text-[11px]", r.absences >= 3 ? "font-semibold text-danger-500" : "text-fg-soft")}>{r.absences}</span></Td>
              <Td align="end"><span className="tnum text-[11.5px] font-semibold text-fg">{r.total === null ? "—" : `${r.total}%`}</span></Td>
              <Td>
                {r.letter ? <Badge tone={["A", "A+", "B+", "B"].includes(r.letter) ? "success" : r.letter.startsWith("C") ? "brand" : "warning"}>{r.letter}</Badge> : <span className="text-[10px] text-fg-muted">—</span>}
              </Td>
              <Td align="end">
                <Badge tone={r.status === "ACTIVE" ? "success" : r.status === "PROBATION" ? "warning" : "danger"} dot>
                  {r.status === "ACTIVE" ? l("منتظم", "Active") : r.status === "PROBATION" ? l("إنذار", "Probation") : l("موقوف", "Suspended")}
                </Badge>
              </Td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <Td colSpan={7} className="py-8 text-center text-[11.5px] text-fg-muted">{l("لا طلاب مطابقون للبحث.", "No students match your search.")}</Td>
            </tr>
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
