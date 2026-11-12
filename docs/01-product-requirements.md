# 01. متطلبات المنتج (PRD)

**Product requirements** · _updated 2026-11-10_

النطاق، المستخدمون، المتطلبات الوظيفية وغير الوظيفية، ومعايير القبول.

> Scope, users, functional and non-functional requirements, acceptance criteria.

---

> **ℹ️** هذا المستند هو المرجع الملزم لكل قرار تصميمي أو هندسي في المنصة. أي ميزة غير مذكورة هنا تُعد خارج النطاق حتى تُضاف رسمياً.
>
> _This document is the binding reference for every design and engineering decision. Anything not listed here is out of scope until formally added._

## المشكلة

_The problem_

المؤسسات التعليمية تدير الحضور والاختبارات والدرجات في أدوات منفصلة: كشوف Excel، مجموعات محادثة، واختبارات ورقية أو نماذج إلكترونية بلا مراقبة. النتيجة: بيانات متناقضة، نزاعات درجات لا يمكن حسمها، وحضور يُسجَّل بعد انتهاء المحاضرة. الطالب يرى واجهات إنجليزية لا تعبّر عن سياقه، والمعلم يقضي ساعات في أعمال إدارية بلا أثر تدقيقي.

> Educational institutions run attendance, examinations and grades across disconnected tools: spreadsheets, chat groups, and paper or unproctored online exams. The result is contradictory data, unarguable grade disputes, and attendance recorded after class ends. Students get English-only interfaces that ignore their context, and teachers lose hours to administrative work with no audit trail.

## الأهداف

_Goals_

- توحيد دورة العمل الأكاديمية في نظام واحد عربي أولاً (RTL) مع دعم كامل للإنجليزية.
  <br>_Unify the academic workflow in one Arabic-first (RTL) system with full English support._
- تسجيل حضور لا يمكن تزويره: رمز متغيّر كل 20 ثانية، جهاز مسجّل، ونطاق جغرافي.
  <br>_Attendance that cannot be forged: a token rotating every 20 seconds, a registered device, and a geofence._
- اختبارات بمؤقّت مرجعي على الخادم وحفظ فوري لكل إجابة — انقطاع الشبكة لا يفقد العمل.
  <br>_Examinations with a server-authoritative timer and instant answer saves — a network drop never loses work._
- فصل واضح بين ما يضمنه الجهاز المُدار وما يمكن كشفه فقط على الجهاز الشخصي.
  <br>_A clear separation between what a managed device guarantees and what can only be detected on a personal device._
- كل قرار إداري قابل للتفسير والمراجعة: من فعله، متى، وعلى أي أساس.
  <br>_Every administrative decision explainable and reviewable: who, when, on what basis._

## المستخدمون والأدوار

_Users and roles_

| الدور / Role | الاحتياج الأساسي / Primary need | السطح / Surface |
| --- | --- | --- |
| الطالب | Student | معرفة الحضور، تسليم الاختبارات، النتائج، تقديم الطلبات | Attendance, exam submission, results, requests | تطبيق جوال |
| المعلم | Teacher | فتح جلسات حضور، إنشاء اختبارات وأسئلة، تصحيح، درجات | Attendance sessions, exam authoring, grading, grades | لوحة ويب |
| مراقب الاختبارات | Exam supervisor | مراقبة مباشرة، قرار الحوادث، سجل التدقيق | Live monitoring, incident decisions, audit | لوحة ويب |
| مدير المؤسسة | Institution admin | الطلاب، المقررات، الدرجات، الطلبات، الأجهزة، التقارير | Students, courses, grades, requests, devices, reports | لوحة ويب |
| مدير المنصة | Super admin | المؤسسات، الخطط، الأدوار النظامية، الحوكمة | Institutions, plans, system roles, governance | مركز تحكم |

## المتطلبات الوظيفية

_Functional requirements_

```text
AUTH-01  تسجيل دخول ببريد المؤسسة + كلمة مرور + رمز تحقق 6 أرقام (صلاحية 5 دقائق، 5 محاولات).
AUTH-02  قفل مؤقت بعد 5 محاولات فاشلة، وإعادة إرسال لا تقبل قبل 30 ثانية.
ATT-01   يفتح المعلم جلسة حضور فتُولَّد رموز QR متغيرة كل 20 ثانية على الخادم.
ATT-02   التحقق يتطلب: جلسة مفتوحة + جهاز مسجّل + نطاق جغرافي + رمز غير منتهٍ.
ATT-03   كل تعديل يدوي يُحفظ بالمعلم والسبب والوقت ويظهر للمدقق.
ATT-04   يمكن للطالب تقديم طلب تصحيح حضور من التطبيق.
EXM-01   إنشاء اختبار من بنك الأسئلة مع سياسة أمان وخلط ووقت ومحاولات.
EXM-02   المؤقّت من الخادم فقط؛ العميل يعرض ما يخبره الخادم ولا يخصم.
EXM-03   كل إجابة تُحفظ فوراً مع رقم مراجعة (revision) لمنع الكتابة القديمة.
EXM-04   أي حدث مخالف يُصنَّف ويُحتسب؛ تجاوز الحد = تجميد + إشعار مراقب.
EXM-05   لا إلغاء آلي: القرار النهائي للمراقب البشري مع سبب إلزامي.
GRD-01   تصحيح آلي للموضوعي، والبشري للمقالي فقط.
GRD-02   الحفظ يُعيد حساب المجموع والتقدير والنقاط؛ النشر يُخطر الطلاب ويُدوَّن.
REQ-01   طلبات/استئنافات بمسار حالات ومحادثة وملاحظات داخلية وقرار مسبب.
RPT-01   تصدير CSV لكل تقرير + طباعة/PDF، وكل تصدير مسجّل.
NTS-01   تعميمات لكل جمهور مع أولوية، وسجل رسائل غير قابل للحذف.
SEC-01   RBAC مركزي يُفحص على الخادم في كل عملية، لا يعتمد على إخفاء الواجهة.
```

## غير الوظيفية

_Non-functional requirements_

| البند / Area | المستهدف / Target |
| --- | --- |
| زمن أول تحميل | First paint | أقل من 1.8 ثانية على 4G متوسط |
| P95 لاستجابة API | API P95 | أقل من 300 مللي ثانية للقراءة، 500 للكتابة |
| توفّر | Availability | 99.9% شهرياً، مع نافذة صيانة معلنة |
| فقدان إجابات | Answer loss | صفر — كل حفظ مؤكد من الخادم قبل تأكيد الواجهة |
| إتاحة | Accessibility | WCAG 2.2 AA، تباين 4.5:1 على الأقل، تنقّل كامل بالكيبورد |
| لغة | Language | عربي RTL افتراضي + إنجليزي LTR، بدون كسر التخطيط |

## خارج النطاق (هذه المرحلة)

_Explicitly out of scope_

- حجز كامل للجهاز على الأجهزة الشخصية — لا يمكن ضمانه تقنياً ولن ندّعيه.
  <br>_Full device lockdown on personal devices — technically impossible to guarantee._
- تصحيح آلي للمقالات بنموذج لغوي دون مراجعة بشرية.
  <br>_Automated essay grading without human review._
- مراقبة الشاشة أو الكاميرا أو الميكروفون أو تسجيل الصوت.
  <br>_Screen, camera, microphone monitoring or audio recording._
- مدفوعات أو فوترة داخل المنصة.
  <br>_In-platform payments or billing._

## معايير القبول

_Acceptance criteria_

- كل زر وفلتر ونموذج يعمل ببيانات حقيقية من حالة الجلسة، ولا زر بلا وظيفة.
  <br>_Every button, filter and form works against real session state — no decorative controls._
- جلسة اختبار كاملة تُنجز من واجهتين (طالب + مراقب) مع تدقيق كامل.
  <br>_A full exam session completes across the student and supervisor surfaces with a complete audit trail._
- الوضعان الفاتح والداكن متطابقان وظيفياً، وكل النصوص العربية مقروءة في RTL.
  <br>_Light and dark themes are functionally identical, and all Arabic renders correctly in RTL._

---

Source of truth: `web/lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
