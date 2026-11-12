import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";

export interface CalendarCell {
  date?: string;
  day?: number;
  status?: AttendanceStatus | "MIXED";
  count: number;
}

/** Builds a Sunday-first month grid (RTL friendly) with per-day attendance status. */
export function buildMonthGrid(year: number, month: number, records: AttendanceRecord[]): CalendarCell[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = first.getDay();
  const cells: CalendarCell[] = Array.from({ length: offset }, () => ({ count: 0 }));

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayRecords = records.filter((r) => r.date === iso);
    let status: CalendarCell["status"];
    if (dayRecords.length === 1) status = dayRecords[0].status;
    else if (dayRecords.length > 1) {
      const priority: AttendanceStatus[] = ["ABSENT", "LATE", "EXCUSED", "PRESENT"];
      const set = new Set(dayRecords.map((r) => r.status));
      status = set.size === 1 ? dayRecords[0].status : priority.find((p) => set.has(p)) === "ABSENT" ? "MIXED" : "MIXED";
    }
    cells.push({ date: iso, day: d, status, count: dayRecords.length });
  }
  while (cells.length % 7 !== 0) cells.push({ count: 0 });
  return cells;
}

export const STATUS_META: Record<AttendanceStatus, { ar: string; en: string; dot: string; chip: string }> = {
  PRESENT: { ar: "حاضر", en: "Present", dot: "bg-success-500", chip: "bg-success-500/15 text-success-500 border-success-500/25" },
  LATE: { ar: "متأخر", en: "Late", dot: "bg-warn-500", chip: "bg-warn-500/15 text-warn-500 border-warn-500/25" },
  ABSENT: { ar: "غائب", en: "Absent", dot: "bg-danger-500", chip: "bg-danger-500/15 text-danger-500 border-danger-500/25" },
  EXCUSED: { ar: "بعذر", en: "Excused", dot: "bg-fg-muted", chip: "bg-surface-3 text-fg-muted border-line-strong" },
};

export const METHOD_META: Record<string, { ar: string; en: string }> = {
  QR: { ar: "كود QR", en: "QR code" },
  MANUAL: { ar: "يدوي", en: "Manual" },
  GEOFENCE: { ar: "نطاق جغرافي", en: "Geofence" },
  TEACHER_OVERRIDE: { ar: "تجاوز المعلم", en: "Teacher override" },
};
