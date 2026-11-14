# 10. خطة التطوير

**Roadmap** · _updated 2026-11-10_

المراحل، المخرجات، والمخاطر.

> Phases, deliverables, and risks.

---

## المرحلة 0 — التأسيس (منجزة)

_Phase 0 — Foundation (done)_

- رموز التصميم، اللوحة اللونية، الشعار المستخرج من مسار الخط، والخطوط المحلية.
  <br>_Design tokens, palette, glyph-accurate logo, self-hosted fonts._
- هياكل الواجهات (تطبيق جوال + لوحات ويب) بالوضعين الفاتح والداكن.
  <br>_Shells (mobile app plus web consoles) in light and dark._
- RBAC مركزي، جلسات، تحقق بخطوتين، وبيانات بذر واقعية (96 طالباً، 4 مقررات، اختبار مباشر).
  <br>_Central RBAC, sessions, 2FA, realistic seed (96 students, 4 courses, one live exam)._

## المرحلة 1 — الاختبار والحضور (منجزة في هذه النسخة)

_Phase 1 — Exams and attendance (delivered here)_

- محرّك اختبار بمؤقّت خادم، حفظ فوري، تصحيح آلي، وتجميد عند الحوادث.
  <br>_Exam runner with server timer, instant saves, auto-grading, incident freezing._
- مركز مراقبة بقرارات بشرية موثّقة، خط زمني، وسبب إلزامي.
  <br>_Control center with documented human decisions, timeline, mandatory reason._
- جلسات حضور برمز QR متغير كل 20 ثانية ونطاق جغرافي وتجاوز مسجّل.
  <br>_Attendance with a 20-second rotating QR, geofence, and audited overrides._

## المرحلة 2 — التوسّع الأكاديمي (8 أسابيع)

_Phase 2 — Academic depth (8 weeks)_

1. استبدال المتجر بـ PostgreSQL عبر Prisma مع ترحيلات واختبارات عزل.
   <br>_Replace the store with PostgreSQL via Prisma, with migrations and isolation tests._
2. تطبيقا iOS/Android أصليان مع دفع فعلي وإشعارات وقيود MDM.
   <br>_Native iOS/Android apps with real push and MDM restrictions._
3. التقويم الأكاديمي، التسجيل، والجداول القابلة للتحرير مع كشف التعارض.
   <br>_Academic calendar, registration, and editable timetables with conflict detection._
4. تقارير PDF حقيقية بترويسة المؤسسة وتوقيع رقمي.
   <br>_Real PDF reports with institutional letterhead and digital signature._

## المرحلة 3 — الذكاء التشغيلي (6 أسابيع)

_Phase 3 — Operational intelligence (6 weeks)_

- مؤشرات دعم قابلة للتفسير (حضور + معدل) مع مراجعة بشرية إلزامية.
  <br>_Explainable support indicators (attendance plus GPA) with mandatory human review._
- تحليل جودة الأسئلة: معامل الصعوبة والتمييز لكل سؤال.
  <br>_Item quality analytics: difficulty and discrimination per question._
- تكامل SIS وSSO، وتقارير حوكمة جاهزة للمجلس.
  <br>_SIS and SSO integration, plus board-ready governance reports._

## المخاطر والاستجابات

_Risks and responses_

| الخطر / Risk | الأثر / Impact | الاستجابة / Response |
| --- | --- | --- |
| أجهزة قديمة في القاعات | Old lab devices | فشل التحقق بالموقع | إدخال يدوي للمعلم + تجاوز مسجّل |
| شبكة ضعيفة وقت الاختبار | Weak exam network | فقدان إجابات | حفظ فوري بمراجعة + استئناف بالمؤقّت |
| اعتراض على قرارات النزاهة | Integrity disputes | نزاع قانوني | سبب إلزامي + استئناف بشري + سجل كامل |
| مقاومة المعلمين للأتمتة | Faculty resistance | تبنٍّ منخفض | أتمتة الجداول لا التقييم، وتدريب قصير |
| تضخّم نطاق الطلبات | Scope creep | تأخير | PRD ملزم + مرحلة رابعة مؤجلة |

## مقاييس النجاح

_Success metrics_

| Key | Value |
| --- | --- |
| نسبة الحضور الرقمي / Digital attendance share | `> 90% من المحاضرات بعد 3 أشهر` |
| زمن فتح الجلسة / Session start time | `< 20 ثانية من لحظة وصول المعلم` |
| فقدان إجابات / Answer loss | `صفر` |
| زمن الرد على الطلبات / Request response | `متوسط < 24 ساعة` |
| قرارات مُلغاة آلياً / Auto-voided attempts | `صفر — بحكم التصميم` |

---

Source of truth: `lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
