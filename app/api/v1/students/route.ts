import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { can } from "@/lib/permissions";
import { createStudentRecord } from "@/lib/server/registry";
import { revalidatePath } from "next/cache";

/**
 * POST /api/v1/students — create a student (registry write).
 * Same core as the admin dialog: one validation path, one audit entry.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(user.role, "user.manage")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });

  const result = createStudentRecord(user, {
    nameAr: String(body.nameAr ?? ""),
    nameEn: String(body.nameEn ?? ""),
    departmentId: String(body.departmentId ?? ""),
    level: Number(body.level ?? 1),
    phone: body.phone ? String(body.phone) : undefined,
    nationalId: body.nationalId ? String(body.nationalId) : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: "VALIDATION", message: result.error }, { status: 422 });

  revalidatePath("/admin/students");
  return NextResponse.json(
    { ok: true, id: result.id, studentNumber: result.number, email: result.email, temporaryPassword: result.password },
    { status: 201 },
  );
}
