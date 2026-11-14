import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { can } from "@/lib/permissions";
import { createTeacherRecord } from "@/lib/server/registry";
import { revalidatePath } from "next/cache";

/** POST /api/v1/teachers — create a faculty account. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(user.role, "user.manage")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });

  const result = createTeacherRecord(user, {
    nameAr: String(body.nameAr ?? ""),
    nameEn: String(body.nameEn ?? ""),
    title: body.title ? String(body.title) : undefined,
    departmentId: String(body.departmentId ?? ""),
    email: String(body.email ?? ""),
    courseIds: Array.isArray(body.courseIds) ? body.courseIds.map(String) : [],
  });

  if (!result.ok) return NextResponse.json({ error: "VALIDATION", message: result.error }, { status: 422 });

  revalidatePath("/admin/teachers");
  revalidatePath("/admin/courses");
  return NextResponse.json(
    { ok: true, id: result.id, email: result.email, temporaryPassword: result.password },
    { status: 201 },
  );
}
