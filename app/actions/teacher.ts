"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/server/auth";
import { db, findCourse, findTeacher, notify, pushAudit } from "@/lib/server/store";
import type { AttendanceStatus, Question, QuestionType } from "@/lib/types";

const CAMPUS_GEO = { lat: 30.0131, lng: 31.2089, radiusM: 120, label: "الحرم الجامعي — مبنى الهندسة" };

/** Opens a live attendance session for one of the teacher's courses. */
export async function openAttendanceSession(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const course = findCourse(courseId);
  if (!teacher || !course || course.teacherId !== teacher.id) redirect("/teacher/attendance?error=forbidden");

  const existing = db().attendanceSessions.find(
    (s) => s.courseId === courseId && s.status === "OPEN" && s.teacherId === teacher.id,
  );
  if (existing) redirect(`/teacher/attendance/${existing.id}`);

  const slot = db().schedule.find((s) => s.courseId === courseId) ?? null;
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const id = `ats_${course.code.toLowerCase()}_${Date.now().toString(36)}`;
  const expected = db().students.filter((s) => s.sectionId === course.sectionId).length;

  db().attendanceSessions.unshift({
    id,
    courseId,
    sectionId: course.sectionId,
    teacherId: teacher.id,
    date: iso,
    start: slot?.start ?? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    end: slot?.end ?? "23:59",
    room: slot?.room ?? "—",
    status: "OPEN",
    openedAt: Date.now(),
    qrToken: `QR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    qrExpiresAt: Date.now() + 20_000,
    presentCount: 0,
    lateCount: 0,
    expectedCount: expected,
    geo: CAMPUS_GEO,
  });

  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "ATTENDANCE_SESSION_OPENED",
    actionAr: "فتح جلسة حضور",
    target: `${course.code} · ${id}`,
    ip: "197.44.12.9",
    severity: "INFO",
  });

  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher");
  redirect(`/teacher/attendance/${id}`);
}

export async function closeAttendanceSession(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const id = String(formData.get("sessionId") ?? "");
  const session = db().attendanceSessions.find((s) => s.id === id);
  if (!session || !teacher || session.teacherId !== teacher.id) redirect("/teacher/attendance?error=forbidden");
  session.status = "CLOSED";
  session.closedAt = Date.now();
  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "ATTENDANCE_SESSION_CLOSED",
    actionAr: "إغلاق جلسة حضور",
    target: id,
    ip: "197.44.12.9",
    severity: "INFO",
  });
  revalidatePath("/teacher/attendance");
  revalidatePath(`/teacher/attendance/${id}`);
  revalidatePath("/teacher");
}

/** Manual teacher override with a recorded reason — always audited. */
export async function overrideAttendance(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "PRESENT") as AttendanceStatus;
  const session = db().attendanceSessions.find((s) => s.id === sessionId);
  if (!session || !teacher || session.teacherId !== teacher.id) redirect("/teacher/attendance?error=forbidden");

  const record = db().attendanceRecords.find((r) => r.sessionId === sessionId && r.studentId === studentId);
  if (record) {
    record.status = status;
    record.method = "TEACHER_OVERRIDE";
    record.markedAt = Date.now();
    record.markedBy = teacher.id;
    record.note = "Teacher override from live session screen";
  } else {
    db().attendanceRecords.push({
      id: `arec_${Date.now().toString(36)}`,
      sessionId,
      studentId,
      courseId: session.courseId,
      date: session.date,
      status,
      method: "TEACHER_OVERRIDE",
      markedAt: Date.now(),
      markedBy: teacher.id,
      note: "Teacher override from live session screen",
    });
  }

  const present = db().attendanceRecords.filter((r) => r.sessionId === sessionId && r.status === "PRESENT").length;
  const late = db().attendanceRecords.filter((r) => r.sessionId === sessionId && r.status === "LATE").length;
  session.presentCount = present;
  session.lateCount = late;

  const student = db().students.find((s) => s.id === studentId);
  if (student && status === "EXCUSED") {
    notify({
      userId: student.id,
      role: "STUDENT",
      category: "ATTENDANCE",
      titleAr: "تم تسجيل عذر الغياب",
      titleEn: "Absence excuse recorded",
      bodyAr: "اعتمد المعلم عذرك في هذه المحاضرة.",
      bodyEn: "Your teacher approved your excuse for this session.",
      href: "/student/attendance",
    });
  }

  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "ATTENDANCE_OVERRIDE",
    actionAr: "تعديل حضور يدوي",
    target: `${student?.studentNumber ?? studentId} → ${status}`,
    reason: "Teacher override from live session screen",
    ip: "197.44.12.9",
    severity: "WARNING",
  });

  revalidatePath(`/teacher/attendance/${sessionId}`);
  revalidatePath("/teacher/attendance");
}

export async function saveGrade(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const gradeId = String(formData.get("gradeId") ?? "");
  const coursework = Number(formData.get("coursework") ?? 0);
  const midterm = Number(formData.get("midterm") ?? 0);
  const grade = db().grades.find((g) => g.id === gradeId);
  if (!grade || !teacher) redirect("/teacher/grades?error=forbidden");
  const course = findCourse(grade.courseId);
  if (!course || course.teacherId !== teacher.id) redirect("/teacher/grades?error=forbidden");

  grade.coursework = Math.max(0, Math.min(20, coursework));
  grade.midterm = Math.max(0, Math.min(20, midterm));
  grade.total = Math.round((grade.coursework + grade.midterm + grade.final) * 10) / 10;
  const points = grade.total >= 90 ? 4 : grade.total >= 85 ? 3.7 : grade.total >= 80 ? 3.3 : grade.total >= 75 ? 3 : grade.total >= 70 ? 2.7 : grade.total >= 65 ? 2.3 : grade.total >= 60 ? 2 : grade.total >= 55 ? 1.5 : grade.total >= 50 ? 1 : 0;
  grade.points = points;
  grade.letter = grade.total >= 95 ? "A+" : grade.total >= 90 ? "A" : grade.total >= 85 ? "B+" : grade.total >= 80 ? "B" : grade.total >= 75 ? "C+" : grade.total >= 70 ? "C" : grade.total >= 65 ? "D+" : grade.total >= 60 ? "D" : "F";

  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "GRADE_UPDATED",
    actionAr: "تعديل درجة",
    target: `${course.code} · ${grade.studentId}`,
    ip: "197.44.12.9",
    severity: "INFO",
  });

  revalidatePath("/teacher/grades");
  revalidatePath("/teacher/classes/" + grade.courseId);
}

export async function publishCourseGrades(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const course = findCourse(courseId);
  if (!course || !teacher || course.teacherId !== teacher.id) redirect("/teacher/grades?error=forbidden");
  let count = 0;
  db().grades.forEach((g) => {
    if (g.courseId === courseId && !g.published) {
      g.published = true;
      count++;
      notify({
        userId: g.studentId,
        role: "STUDENT",
        category: "RESULT",
        titleAr: `نُشرت درجة ${course.nameAr}`,
        titleEn: `Grade published for ${course.nameEn}`,
        bodyAr: `الدرجة النهائة: ${g.total}% — التقدير ${g.letter}.`,
        bodyEn: `Final score: ${g.total}% — grade ${g.letter}.`,
        href: "/student/results",
      });
    }
  });
  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "GRADES_PUBLISHED",
    actionAr: "نشر درجات",
    target: `${course.code} · ${count} records`,
    ip: "197.44.12.9",
    severity: "WARNING",
  });
  revalidatePath("/teacher/grades");
}

export async function createQuestion(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const course = findCourse(courseId);
  if (!teacher || !course || course.teacherId !== teacher.id) redirect("/teacher/questions?error=forbidden");

  const promptAr = String(formData.get("promptAr") ?? "").trim();
  const type = String(formData.get("type") ?? "MCQ") as QuestionType;
  const marks = Number(formData.get("marks") ?? 1);
  const difficulty = String(formData.get("difficulty") ?? "MEDIUM") as Question["difficulty"];
  const optionTexts = [0, 1, 2, 3].map((i) => String(formData.get(`option${i}`) ?? "").trim()).filter(Boolean);
  const correctIndex = Number(formData.get("correct") ?? 0);

  if (promptAr.length < 5) redirect("/teacher/questions?error=invalid");
  if (type === "MCQ" && optionTexts.length < 2) redirect("/teacher/questions?error=options");

  const qid = `q_new_${Date.now().toString(36)}`;
  const options = optionTexts.map((text, i) => ({ id: `${qid}_o${i}`, textAr: text, textEn: text }));
  db().questions.unshift({
    id: qid,
    courseId,
    teacherId: teacher.id,
    type,
    difficulty,
    tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    promptAr,
    promptEn: String(formData.get("promptEn") ?? "").trim() || promptAr,
    options,
    correct: type === "MCQ" ? [options[correctIndex]?.id ?? options[0].id] : [String(formData.get("correctText") ?? "").trim()],
    marks,
    explanationAr: undefined,
    usageCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  });

  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "QUESTION_CREATED",
    actionAr: "إضافة سؤال",
    target: `${course.code} · ${qid}`,
    ip: "197.44.12.9",
    severity: "INFO",
  });
  revalidatePath("/teacher/questions");
  redirect("/teacher/questions?created=1");
}

export async function createExamination(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const course = findCourse(courseId);
  if (!teacher || !course || course.teacherId !== teacher.id) redirect("/teacher/exams/new?error=forbidden");

  const titleAr = String(formData.get("titleAr") ?? "").trim();
  const durationMin = Math.max(5, Math.min(240, Number(formData.get("durationMin") ?? 60)));
  const selected = formData.getAll("questionId").map(String);
  if (titleAr.length < 4) redirect("/teacher/exams/new?error=title");
  if (selected.length === 0) redirect("/teacher/exams/new?error=questions");

  const id = `exm_${Date.now().toString(36)}`;
  const totalMarks = selected.reduce((a, qid) => a + (db().questions.find((q) => q.id === qid)?.marks ?? 1), 0);
  const startAt = Date.now() + 24 * 3600_000;
  db().examinations.unshift({
    id,
    code: `EXM-${course.code.replace("CRS-", "")}-${String(db().examinations.length + 1).padStart(2, "0")}`,
    courseId,
    sectionId: course.sectionId,
    teacherId: teacher.id,
    titleAr,
    titleEn: String(formData.get("titleEn") ?? "").trim() || titleAr,
    instructionsAr: [
      "يبدأ الاختبار في الموعد المحدد ولا يمكن تقديم الوقت.",
      "تُحفظ الإجابات على الخادم فور اختيارها.",
      "الخروج من شاشة الاختبار يُسجَّل كحادثة.",
    ],
    startsAt: startAt,
    endsAt: startAt + durationMin * 60_000,
    durationMin,
    totalMarks,
    passingMarks: Math.round(totalMarks * 0.5),
    questionIds: selected,
    status: "SCHEDULED",
    policy: (String(formData.get("policy") ?? "STANDARD") as "STANDARD" | "STRICT" | "LOCKDOWN"),
    randomizeQuestions: formData.get("randomizeQuestions") === "on",
    randomizeOptions: formData.get("randomizeOptions") === "on",
    allowedAttempts: Math.max(1, Math.min(3, Number(formData.get("allowedAttempts") ?? 1))),
    autoGrade: formData.get("autoGrade") === "on",
    resultPublished: false,
    poolCount: 0,
    maxViolations: Math.max(1, Math.min(10, Number(formData.get("maxViolations") ?? 3))),
    lockOnViolation: formData.get("lockOnViolation") === "on",
    geoRequired: formData.get("geoRequired") === "on",
  });

  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "EXAM_CREATED",
    actionAr: "إنشاء اختبار",
    target: `${course.code} · ${id}`,
    ip: "197.44.12.9",
    severity: "INFO",
  });
  revalidatePath("/teacher/exams");
  redirect(`/teacher/exams/${id}`);
}

/** Grades one written answer and recalculates the attempt total. */
export async function gradeWrittenAnswer(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const attemptId = String(formData.get("attemptId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const marks = Number(formData.get("marks") ?? 0);
  const feedback = String(formData.get("feedback") ?? "").trim().slice(0, 500);
  const attempt = db().attempts.find((a) => a.id === attemptId);
  if (!attempt || !teacher) redirect("/teacher/grading?error=forbidden");
  const exam = db().examinations.find((e) => e.id === attempt.examinationId);
  const question = db().questions.find((q) => q.id === questionId);
  if (!exam || !question) redirect("/teacher/grading?error=notfound");

  const answer = attempt.answers.find((a) => a.questionId === questionId);
  const awarded = Math.max(0, Math.min(question.marks, marks));
  if (answer) {
    answer.awardedMarks = awarded;
    answer.feedback = feedback;
    answer.gradedBy = teacher.id;
    answer.gradedAt = Date.now();
  } else {
    attempt.answers.push({
      questionId,
      value: [],
      savedAt: Date.now(),
      revision: 1,
      flagged: false,
      awardedMarks: awarded,
      feedback,
      gradedBy: teacher.id,
      gradedAt: Date.now(),
    });
  }

  const objective = attempt.answers.filter((a) => db().questions.find((q) => q.id === a.questionId)?.type !== "ESSAY");
  const essays = attempt.answers.filter((a) => db().questions.find((q) => q.id === a.questionId)?.type === "ESSAY");
  const objectiveScore = objective.reduce((a, x) => a + (x.awardedMarks ?? (x.value.length ? (db().questions.find((q) => q.id === x.questionId)?.marks ?? 0) : 0)), 0);
  const essayScore = essays.reduce((a, x) => a + (x.awardedMarks ?? 0), 0);
  const allEssaysGraded = exam.questionIds
    .map((qid) => db().questions.find((q) => q.id === qid))
    .filter((q) => q?.type === "ESSAY")
    .every((q) => attempt.answers.find((a) => a.questionId === q!.id)?.awardedMarks !== undefined);

  attempt.score = Math.round((objectiveScore + essayScore) * 10) / 10;
  attempt.passed = attempt.score >= exam.passingMarks;
  attempt.status = allEssaysGraded ? "GRADED" : "GRADING";
  if (allEssaysGraded) attempt.gradedAt = Date.now();

  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "ANSWER_GRADED",
    actionAr: "تصحيح إجابة",
    target: `${exam.code} · ${question.id} → ${awarded}/${question.marks}`,
    ip: "197.44.12.9",
    severity: "INFO",
  });

  revalidatePath(`/teacher/grading/${attemptId}`);
  revalidatePath("/teacher/grading");
}

export async function publishExamResults(formData: FormData) {
  const user = await requireRole(["TEACHER"]);
  const teacher = findTeacher(user.teacherId ?? "");
  const examId = String(formData.get("examId") ?? "");
  const exam = db().examinations.find((e) => e.id === examId);
  if (!exam || !teacher || exam.teacherId !== teacher.id) redirect("/teacher/exams?error=forbidden");
  exam.resultPublished = true;
  db().attempts.forEach((a) => {
    if (a.examinationId === exam.id) {
      a.publishedAt = Date.now();
      if (a.score !== undefined) {
        notify({
          userId: a.studentId,
          role: "STUDENT",
          category: "RESULT",
          titleAr: `نُشرت نتيجة ${exam.titleAr}`,
          titleEn: `Results published for ${exam.titleEn}`,
          bodyAr: `الدرجة: ${a.score} من ${exam.totalMarks}.`,
          bodyEn: `Score: ${a.score} of ${exam.totalMarks}.`,
          href: `/student/results?exam=${exam.id}`,
        });
      }
    }
  });
  pushAudit({
    actorId: user.id,
    actorName: teacher.nameAr,
    actorRole: "TEACHER",
    action: "EXAM_RESULTS_PUBLISHED",
    actionAr: "نشر نتائج اختبار",
    target: exam.code,
    ip: "197.44.12.9",
    severity: "WARNING",
  });
  revalidatePath(`/teacher/exams/${examId}`);
  revalidatePath("/teacher/exams");
}
