# 06. تصميم قاعدة البيانات

**Database schema** · _updated 2026-11-10_

جداول PostgreSQL، العلاقات، القيود، والفهارس.

> PostgreSQL tables, relations, constraints, and indexes.

---

> **ℹ️** الملف الكامل القابل للتنفيذ: db/schema.sql في جذر المستودع. البيانات التجريبية هنا مبنية بنفس الأشكال، لذا استبدال المتجر باستعلامات SQL لا يغيّر الواجهات.
>
> _Executable source: db/schema.sql at the repository root. The seeded store mirrors these shapes, so replacing it with SQL queries requires no UI change._

## المجموعات الأساسية

_Core tables_

| الجدول / Table | الوصف / Description | مفاتيح / Keys |
| --- | --- | --- |
| institutions | المؤسسات على المنصة | id · code uniq · status |
| users | حسابات الدخول والأدوار | id · email uniq · institution_id |
| departments | الأقسام الأكاديمية | id · institution_id · code |
| academic_years / semesters | السنوات والفصول | year_id → semesters |
| sections | الشعب الدراسية | id · department_id · level |
| teachers / students | الملفات الأكاديمية | id · user_id · section_id |
| courses | المقررات | id · code · teacher_id · section_id |
| schedule_slots | جدول المحاضرات | id · course_id · day · start |
| attendance_sessions | جلسات الحضور والرموز | id · course_id · qr_token · geo |
| attendance_records | سجلات الحضور | id · session_id · student_id uniq |
| questions / examinations | بنك الأسئلة والاختبارات | exam_questions join table |
| exam_attempts | محاولات الطلاب | id · examination_id · student_id |
| exam_answers | إجابات مع مراجعة | attempt_id · question_id · revision |
| exam_events | أحداث النزاهة | id · attempt_id · severity |
| devices | الأجهزة المسجّلة | id · student_id · fingerprint |
| grades | سجلات الدرجات | student_id + course_id + semester_id |
| complaints / complaint_messages | الطلبات والمحادثات | ticket uniq |
| notifications | الإشعارات | id · user_id · read_at |
| audit_logs | سجل التدقيق | id · actor_id · action · at |
| roles / role_permissions | تعريف الأدوار | role · permission |

## قرارات التصميم

_Design decisions_

- institution_id في كل جدول أعمالي — عزل متعدد المستأجرين بفلترة إلزامية وليس بفصل قواعد بيانات.
  <br>_institution_id on every business table — tenancy by mandatory filtering, not separate databases._
- exam_answers تحمل revision وتُكتب upsert بشرط revision أعلى — يمنع الكتابة القديمة عند الشبكات المتقطعة.
  <br>_exam_answers carry revision and are upserted only with a higher revision — preventing stale writes on flaky networks._
- exam_events غير قابلة للتعديل: لا UPDATE ولا DELETE، فقط INSERT عبر سياسة صريحة.
  <br>_exam_events are append-only: no UPDATE or DELETE, INSERT-only by explicit policy._
- الرموز (qr_token) لها فهرس فريد وتاريخ انتهاء، وتُستبدل دورياً بدل تخزين سجل تاريخي للرموز.
  <br>_qr_token has a unique index and expiry, and is rotated in place rather than archived._
- الدرجات مرتبطة بالفصل الدراسي لتمكين إعادة الحساب التاريخي دون فقدان سجل سابق.
  <br>_Grades are keyed by semester so historical recomputation never destroys prior records._
- الحذف ناعم (archived_at) لكل الكيانات الأكاديمية، وصلب فقط للبيانات المؤقتة منتهية الصلاحية.
  <br>_Soft delete (archived_at) for every academic entity; hard deletes only for expired transient data._

## علاقات مختصرة

_Relation sketch_

```text
institutions 1─n departments 1─n sections 1─n students
institutions 1─n users ─1 students/teachers
teachers 1─n courses n─1 sections
courses 1─n schedule_slots
courses 1─n attendance_sessions 1─n attendance_records
courses 1─n examinations n─n questions (exam_questions)
examinations 1─n exam_attempts 1─n exam_answers
exam_attempts 1─n exam_events
students 1─n devices
students 1─n grades n─1 courses (per semester)
students 1─n complaints 1─n complaint_messages
users 1─n notifications
users 1─n audit_logs
```

## الفهارس الحرجة

_Critical indexes_

```sql
CREATE UNIQUE INDEX uq_attendance_session_student
  ON attendance_records (session_id, student_id);

CREATE UNIQUE INDEX uq_answer_revision
  ON exam_answers (attempt_id, question_id);

CREATE INDEX idx_events_attempt_time
  ON exam_events (attempt_id, server_time DESC);

CREATE INDEX idx_attempts_exam_status
  ON exam_attempts (examination_id, status);

CREATE INDEX idx_audit_actor_time
  ON audit_logs (actor_id, at DESC);

CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id) WHERE read_at IS NULL;
```

## القيود

_Constraints_

- CHECK على الدرجات: 0 ≤ coursework ≤ 20، 0 ≤ midterm ≤ 20، 0 ≤ final ≤ 60.
  <br>_CHECK on marks: 0 ≤ coursework ≤ 20, 0 ≤ midterm ≤ 20, 0 ≤ final ≤ 60._
- CHECK على النطاق الجغرافي: radius_m بين 25 و500.
  <br>_CHECK on geofence: radius_m between 25 and 500._
- FK مؤجلة للجداول المرتبطة دورياً (مثل exam_questions) لتسهيل الاستيراد.
  <br>_Deferrable FKs on cyclic joins (e.g. exam_questions) to ease imports._
- حذف مؤسسة يمنع نهائياً عند وجود بيانات أكاديمية — يجب الأرشفة أولاً.
  <br>_Deleting an institution is blocked while academic data exists — archive first._

---

Source of truth: `web/lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
