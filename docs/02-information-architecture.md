# 02. هندسة المعلومات والتنقّل

**Information architecture** · _updated 2026-11-10_

شجرة الأقسام، بنية التنقّل لكل دور، وقواعد الوصول.

> Sitemap, navigation structure per role, and access rules.

---

## المبدأ

_Principle_

لكل دور مساحة عمل واحدة واضحة، بحد أقصى ثلاث مجموعات تنقّل. لا يرى المستخدم أي عنصر لا يملك صلاحيته، ومع ذلك يُعاد الفحص على الخادم — إخفاء العنصر تحسين تجربة لا حماية.

> Each role gets one clear workspace with at most three navigation groups. Users never see an item they lack permission for, and the server still re-checks — hiding is UX, not security.

## خريطة التطبيق

_Sitemap_

```text
عام
├─ /            الصفحة التعريفية
├─ /login       دخول + حسابات تجريبية
├─ /verify      رمز التحقق بخطوتين
├─ /docs        حزمة المستندات
└─ /docs/[slug] مستند

الطالب (تطبيق جوال)
├─ /student                     الرئيسية
│  ├─ /student/attendance       الحضور + التحقق
│  ├─ /student/timetable        الجدول
│  ├─ /student/courses[/id]     المقررات
│  ├─ /student/exams[/id]       الاختبارات
│  ├─ /student/results          النتائج
│  ├─ /student/transcript       السجل الأكاديمي
│  ├─ /student/analytics        تحليلات الأداء
│  ├─ /student/id               الهوية الرقمية
│  ├─ /student/notifications    الإشعارات
│  ├─ /student/complaints[+new] الطلبات
│  ├─ /student/security         الأمان والأجهزة
│  └─ /student/settings         الإعدادات
└─ /exam/[attemptId]            شاشة الاختبار الآمنة (خارج التنقّل)

المعلم
├─ /teacher                 نظرة عامة
├─ /teacher/classes[/id]    الفصول
├─ /teacher/attendance[/id] جلسات الحضور + شاشة QR
├─ /teacher/exams[+/new/id] الاختبارات
├─ /teacher/questions       بنك الأسئلة
├─ /teacher/grading[/id]    التصحيح
├─ /teacher/grades          الدرجات
└─ /teacher/profile         الملف

الإدارة
├─ /admin                 نظرة عامة
├─ /admin/exam-control[+/id]  مركز المراقبة
├─ /admin/analytics       التحليلات
├─ /admin/students[/id]   الطلاب
├─ /admin/teachers        هيئة التدريس
├─ /admin/courses         المقررات
├─ /admin/academics       الأقسام والسنوات
├─ /admin/timetable       الجداول
├─ /admin/exams           الاختبارات
├─ /admin/questions       بنك الأسئلة
├─ /admin/grades          الدرجات
├─ /admin/attendance      الحضور
├─ /admin/complaints[/id] الطلبات
├─ /admin/notifications   الإشعارات
├─ /admin/devices         الأجهزة
├─ /admin/reports         التقارير
├─ /admin/audit           التدقيق
├─ /admin/roles           الأدوار
├─ /admin/institutions    المؤسسات
└─ /admin/settings        الإعدادات
```

## قواعد التنقّل

_Navigation rules_

- المجموعة تُخفى بالكامل إذا لم يتبقَّ فيها عنصر مسموح.
  <br>_A group disappears entirely when no permitted item remains._
- عناصر التنقّل تحمل شارات عدد للعناصر التي تحتاج إجراءً (تصحيح، طلبات، حوادث).
  <br>_Nav items carry count badges for work needing action (grading, requests, incidents)._
- ⌘K / Ctrl+K يفتح لوحة أوامر بالبحث في كل الصفحات المسموحة.
  <br>_⌘K / Ctrl+K opens a command palette searching all permitted pages._
- شاشة الاختبار تُفتح في مسار مستقل بلا تنقّل — منعاً للانتقال العَرَضي.
  <br>_The exam runner lives on an isolated route with no chrome — preventing accidental navigation._
- الطلاب يصلون لعشرة أقسام عبر «المزيد» في الشريط السفلي، لا عبر قائمة طويلة.
  <br>_Students reach ten sections through a bottom-sheet “More”, not a long menu._

## الوصول حسب الصلاحية

_Access by permission_

| المسار / Route | الصلاحية المطلوبة / Required permission |
| --- | --- |
| /admin/exam-control | Exam control | exam.monitor |
| /admin/exam-control/[id] | Attempt review | exam.incident.decide |
| /admin/students | Student registry | student.view_all |
| /admin/reports | Reports | report.export |
| /admin/audit | Audit log | audit.view |
| /admin/institutions | Institutions | institution.manage |
| /teacher/* | Teacher workspace | دور TEACHER |
| /student/* | Student app | دور STUDENT |

> **⚠️** المراقب يفتح لوحة الإدارة لكن القائمة تُصفّى لتبقى فقط: مركز المراقبة، الطلاب، الحضور، التدقيق، التقارير — نفس الرابط، سطح مختلف.
>
> _A supervisor enters the admin shell but the menu collapses to: control center, students, attendance, audit, reports — same route, different surface._

---

Source of truth: `web/lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
