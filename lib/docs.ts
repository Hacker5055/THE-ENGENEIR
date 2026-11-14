export type DocBlock =
  | { t: "h2"; ar: string; en: string }
  | { t: "h3"; ar: string; en: string }
  | { t: "p"; ar: string; en: string }
  | { t: "ul"; items: { ar: string; en: string }[] }
  | { t: "ol"; items: { ar: string; en: string }[] }
  | { t: "table"; headers: { ar: string; en: string }[]; rows: string[][] }
  | { t: "note"; tone: "info" | "warn" | "success"; ar: string; en: string }
  | { t: "code"; lang?: string; body: string }
  | { t: "kv"; rows: { kAr: string; kEn: string; v: string }[] };

export interface Doc {
  slug: string;
  num: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  updated: string;
  blocks: DocBlock[];
}

export const DOCS: Doc[] = [
  {
    slug: "product-requirements",
    num: "01",
    titleAr: "متطلبات المنتج (PRD)",
    titleEn: "Product requirements",
    descAr: "النطاق، المستخدمون، المتطلبات الوظيفية وغير الوظيفية، ومعايير القبول.",
    descEn: "Scope, users, functional and non-functional requirements, acceptance criteria.",
    updated: "2026-11-10",
    blocks: [
      { t: "note", tone: "info", ar: "هذا المستند هو المرجع الملزم لكل قرار تصميمي أو هندسي في المنصة. أي ميزة غير مذكورة هنا تُعد خارج النطاق حتى تُضاف رسمياً.", en: "This document is the binding reference for every design and engineering decision. Anything not listed here is out of scope until formally added." },
      { t: "h2", ar: "المشكلة", en: "The problem" },
      { t: "p", ar: "المؤسسات التعليمية تدير الحضور والاختبارات والدرجات في أدوات منفصلة: كشوف Excel، مجموعات محادثة، واختبارات ورقية أو نماذج إلكترونية بلا مراقبة. النتيجة: بيانات متناقضة، نزاعات درجات لا يمكن حسمها، وحضور يُسجَّل بعد انتهاء المحاضرة. الطالب يرى واجهات إنجليزية لا تعبّر عن سياقه، والمعلم يقضي ساعات في أعمال إدارية بلا أثر تدقيقي.", en: "Educational institutions run attendance, examinations and grades across disconnected tools: spreadsheets, chat groups, and paper or unproctored online exams. The result is contradictory data, unarguable grade disputes, and attendance recorded after class ends. Students get English-only interfaces that ignore their context, and teachers lose hours to administrative work with no audit trail." },
      { t: "h2", ar: "الأهداف", en: "Goals" },
      { t: "ul", items: [
        { ar: "توحيد دورة العمل الأكاديمية في نظام واحد عربي أولاً (RTL) مع دعم كامل للإنجليزية.", en: "Unify the academic workflow in one Arabic-first (RTL) system with full English support." },
        { ar: "تسجيل حضور لا يمكن تزويره: رمز متغيّر كل 20 ثانية، جهاز مسجّل، ونطاق جغرافي.", en: "Attendance that cannot be forged: a token rotating every 20 seconds, a registered device, and a geofence." },
        { ar: "اختبارات بمؤقّت مرجعي على الخادم وحفظ فوري لكل إجابة — انقطاع الشبكة لا يفقد العمل.", en: "Examinations with a server-authoritative timer and instant answer saves — a network drop never loses work." },
        { ar: "فصل واضح بين ما يضمنه الجهاز المُدار وما يمكن كشفه فقط على الجهاز الشخصي.", en: "A clear separation between what a managed device guarantees and what can only be detected on a personal device." },
        { ar: "كل قرار إداري قابل للتفسير والمراجعة: من فعله، متى، وعلى أي أساس.", en: "Every administrative decision explainable and reviewable: who, when, on what basis." },
      ] },
      { t: "h2", ar: "المستخدمون والأدوار", en: "Users and roles" },
      { t: "table", headers: [{ ar: "الدور", en: "Role" }, { ar: "الاحتياج الأساسي", en: "Primary need" }, { ar: "السطح", en: "Surface" }], rows: [
        ["الطالب", "Student", "معرفة الحضور، تسليم الاختبارات، النتائج، تقديم الطلبات", "Attendance, exam submission, results, requests", "تطبيق جوال"],
        ["المعلم", "Teacher", "فتح جلسات حضور، إنشاء اختبارات وأسئلة، تصحيح، درجات", "Attendance sessions, exam authoring, grading, grades", "لوحة ويب"],
        ["مراقب الاختبارات", "Exam supervisor", "مراقبة مباشرة، قرار الحوادث، سجل التدقيق", "Live monitoring, incident decisions, audit", "لوحة ويب"],
        ["مدير المؤسسة", "Institution admin", "الطلاب، المقررات، الدرجات، الطلبات، الأجهزة، التقارير", "Students, courses, grades, requests, devices, reports", "لوحة ويب"],
        ["مدير المنصة", "Super admin", "المؤسسات، الخطط، الأدوار النظامية، الحوكمة", "Institutions, plans, system roles, governance", "مركز تحكم"],
      ] },
      { t: "h2", ar: "المتطلبات الوظيفية", en: "Functional requirements" },
      { t: "code", lang: "text", body: `AUTH-01  تسجيل دخول ببريد المؤسسة + كلمة مرور + رمز تحقق 6 أرقام (صلاحية 5 دقائق، 5 محاولات).
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
SEC-01   RBAC مركزي يُفحص على الخادم في كل عملية، لا يعتمد على إخفاء الواجهة.` },
      { t: "h2", ar: "غير الوظيفية", en: "Non-functional requirements" },
      { t: "table", headers: [{ ar: "البند", en: "Area" }, { ar: "المستهدف", en: "Target" }], rows: [
        ["زمن أول تحميل", "First paint", "أقل من 1.8 ثانية على 4G متوسط"],
        ["P95 لاستجابة API", "API P95", "أقل من 300 مللي ثانية للقراءة، 500 للكتابة"],
        ["توفّر", "Availability", "99.9% شهرياً، مع نافذة صيانة معلنة"],
        ["فقدان إجابات", "Answer loss", "صفر — كل حفظ مؤكد من الخادم قبل تأكيد الواجهة"],
        ["إتاحة", "Accessibility", "WCAG 2.2 AA، تباين 4.5:1 على الأقل، تنقّل كامل بالكيبورد"],
        ["لغة", "Language", "عربي RTL افتراضي + إنجليزي LTR، بدون كسر التخطيط"],
      ] },
      { t: "h2", ar: "خارج النطاق (هذه المرحلة)", en: "Explicitly out of scope" },
      { t: "ul", items: [
        { ar: "حجز كامل للجهاز على الأجهزة الشخصية — لا يمكن ضمانه تقنياً ولن ندّعيه.", en: "Full device lockdown on personal devices — technically impossible to guarantee." },
        { ar: "تصحيح آلي للمقالات بنموذج لغوي دون مراجعة بشرية.", en: "Automated essay grading without human review." },
        { ar: "مراقبة الشاشة أو الكاميرا أو الميكروفون أو تسجيل الصوت.", en: "Screen, camera, microphone monitoring or audio recording." },
        { ar: "مدفوعات أو فوترة داخل المنصة.", en: "In-platform payments or billing." },
      ] },
      { t: "h2", ar: "معايير القبول", en: "Acceptance criteria" },
      { t: "ul", items: [
        { ar: "كل زر وفلتر ونموذج يعمل ببيانات حقيقية من حالة الجلسة، ولا زر بلا وظيفة.", en: "Every button, filter and form works against real session state — no decorative controls." },
        { ar: "جلسة اختبار كاملة تُنجز من واجهتين (طالب + مراقب) مع تدقيق كامل.", en: "A full exam session completes across the student and supervisor surfaces with a complete audit trail." },
        { ar: "الوضعان الفاتح والداكن متطابقان وظيفياً، وكل النصوص العربية مقروءة في RTL.", en: "Light and dark themes are functionally identical, and all Arabic renders correctly in RTL." },
      ] },
    ],
  },
  {
    slug: "information-architecture",
    num: "02",
    titleAr: "هندسة المعلومات والتنقّل",
    titleEn: "Information architecture",
    descAr: "شجرة الأقسام، بنية التنقّل لكل دور، وقواعد الوصول.",
    descEn: "Sitemap, navigation structure per role, and access rules.",
    updated: "2026-11-10",
    blocks: [
      { t: "h2", ar: "المبدأ", en: "Principle" },
      { t: "p", ar: "لكل دور مساحة عمل واحدة واضحة، بحد أقصى ثلاث مجموعات تنقّل. لا يرى المستخدم أي عنصر لا يملك صلاحيته، ومع ذلك يُعاد الفحص على الخادم — إخفاء العنصر تحسين تجربة لا حماية.", en: "Each role gets one clear workspace with at most three navigation groups. Users never see an item they lack permission for, and the server still re-checks — hiding is UX, not security." },
      { t: "h2", ar: "خريطة التطبيق", en: "Sitemap" },
      { t: "code", lang: "text", body: `عام
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
└─ /admin/settings        الإعدادات` },
      { t: "h2", ar: "قواعد التنقّل", en: "Navigation rules" },
      { t: "ul", items: [
        { ar: "المجموعة تُخفى بالكامل إذا لم يتبقَّ فيها عنصر مسموح.", en: "A group disappears entirely when no permitted item remains." },
        { ar: "عناصر التنقّل تحمل شارات عدد للعناصر التي تحتاج إجراءً (تصحيح، طلبات، حوادث).", en: "Nav items carry count badges for work needing action (grading, requests, incidents)." },
        { ar: "⌘K / Ctrl+K يفتح لوحة أوامر بالبحث في كل الصفحات المسموحة.", en: "⌘K / Ctrl+K opens a command palette searching all permitted pages." },
        { ar: "شاشة الاختبار تُفتح في مسار مستقل بلا تنقّل — منعاً للانتقال العَرَضي.", en: "The exam runner lives on an isolated route with no chrome — preventing accidental navigation." },
        { ar: "الطلاب يصلون لعشرة أقسام عبر «المزيد» في الشريط السفلي، لا عبر قائمة طويلة.", en: "Students reach ten sections through a bottom-sheet “More”, not a long menu." },
      ] },
      { t: "h2", ar: "الوصول حسب الصلاحية", en: "Access by permission" },
      { t: "table", headers: [{ ar: "المسار", en: "Route" }, { ar: "الصلاحية المطلوبة", en: "Required permission" }], rows: [
        ["/admin/exam-control", "Exam control", "exam.monitor"],
        ["/admin/exam-control/[id]", "Attempt review", "exam.incident.decide"],
        ["/admin/students", "Student registry", "student.view_all"],
        ["/admin/reports", "Reports", "report.export"],
        ["/admin/audit", "Audit log", "audit.view"],
        ["/admin/institutions", "Institutions", "institution.manage"],
        ["/teacher/*", "Teacher workspace", "دور TEACHER"],
        ["/student/*", "Student app", "دور STUDENT"],
      ] },
      { t: "note", tone: "warn", ar: "المراقب يفتح لوحة الإدارة لكن القائمة تُصفّى لتبقى فقط: مركز المراقبة، الطلاب، الحضور، التدقيق، التقارير — نفس الرابط، سطح مختلف.", en: "A supervisor enters the admin shell but the menu collapses to: control center, students, attendance, audit, reports — same route, different surface." },
    ],
  },
  {
    slug: "user-journeys",
    num: "03",
    titleAr: "خرائط رحلات المستخدمين",
    titleEn: "User journeys",
    descAr: "ست رحلات أساسية مع نقاط الفشل والمعالجة.",
    descEn: "Six core journeys with failure points and recovery.",
    updated: "2026-11-10",
    blocks: [
      { t: "h2", ar: "1. الطالب يدخل ويؤكد الحضور", en: "1. Student signs in and checks in" },
      { t: "code", lang: "text", body: `فتح التطبيق → بريد + كلمة مرور → رمز 6 أرقام من التطبيق/البريد
  → الرئيسية تُظهر المحاضرة القادمة وبطاقة «حضور مفتوح»
  → يضغط «سجّل حضوري» → يقرأ الرمز من شاشة المعلم (أو يدخله يدوياً)
  → التحقق: جلسة مفتوحة ✓ رمز غير منتهٍ ✓ جهاز مسجّل ✓ داخل النطاق ✓
  → نجاح: «حاضر» + وقت + المسافة (5 م) + تحديث السجل فوراً
  فشل محتمل:
   ✗ رمز منتهٍ → «انتهت صلاحية الرمز، امسح الرمز الحالي» + إعادة تلقائية للقراءة
   ✗ خارج النطاق → يوضح المسافة المسجلة ويطلب الاقتراب، ويسمح للمعلم بالتجاوز
   ✗ جهاز غير مسجّل → شاشة تسجيل جهاز مع توضيح ما يُرسل وما لا يُرسل` },
      { t: "p", ar: "قرار تصميمي: لا نُظهر رسالة «فشل» مجردة. كل فشل يقول السبب، وما يجب فعله، وهل يمكن للمعلم حلّه.", en: "Design decision: never show a bare “failed”. Each failure states the cause, the next action, and whether a teacher can resolve it." },
      { t: "h2", ar: "2. المعلم يفتح جلسة حضور", en: "2. Teacher opens an attendance session" },
      { t: "ol", items: [
        { ar: "من الرئيسية يضغط «فتح جلسة حضور» → يختار المقرر → يرى نطاق 120م.", en: "From the dashboard: “Open attendance” → pick a course → sees the 120 m geofence." },
        { ar: "تُفتح الجلسة ويظهر رمز QR كبير مع عدّاد 20 ثانية وقائمة مباشرة بالحاضرين.", en: "The session opens with a large QR, a 20-second countdown, and a live roster." },
        { ar: "كل مسح جديد يظهر خلال ثوانٍ بجانب اسم الطالب والطريقة والمسافة.", en: "Each scan appears within seconds beside the student name, method and distance." },
        { ar: "طالب متأخر بدون هاتف → يعدّله المعلم يدوياً من القائمة، فيُسجَّل التعديل بالسبب.", en: "A late student without a phone → manual override from the roster, recorded with a reason." },
        { ar: "يغلق الجلسة، فتُحفظ النتيجة ويُقفل المسح نهائياً.", en: "Closing the session freezes the result and permanently stops scanning." },
      ] },
      { t: "h2", ar: "3. الطالب يجتاز اختباراً آمناً", en: "3. Student sits a secure examination" },
      { t: "code", lang: "text", body: `بطاقة «اختبار جارٍ» → تفاصيل + تعليمات + سياسة الأمان معلنة صراحةً
  → «ابدأ الاختبار» → تحقق الجهاز/الموقع → شاشة تعليمات → بدء
  → المؤقّت من الخادم؛ كل اختيار يُحفظ ويظهر «محفوظ ✓»
  → تنبيه عند أول حادثة (خروج من الشاشة) مع تحذير واضح
  → تسليم → شاشة تأكيد: «تم التسليم، لا يمكن التعديل»
  حالات حافة:
   • انقطاع شبكة: الإجابات المحفوظة تبقى، والمحاولة تُستأنف بنفس الوقت المتبقي
   • تجاوز حد الحوادث: تجميد فوري + رسالة «بانتظار مراجعة المراقب» + زر تواصل
   • انتهاء الوقت أثناء الكتابة: حفظ آخر نسخة وتسليم تلقائي موثّق` },
      { t: "h2", ar: "4. المراقب يقرر في حادثة", en: "4. Supervisor decides an incident" },
      { t: "p", ar: "المراقب يرى في مركز المراقبة محاولة مُعلَّمة. يفتحها فيجد الخط الزمني الكامل (بدون لقطات شاشة)، الإجابات المحفوظة، وسجل الجهاز. يختار قراراً من ستة، ويكتب سبباً إلزامياً، فيُنفَّذ فوراً، يُخطر الطالب، ويُسجَّل في التدقيق. لا يستطيع أحد حذف القرار — فقط إصدار قرار لاحق يشرح التغيير.", en: "The supervisor sees a flagged attempt, opens it, and reviews the full timeline (no screenshots), saved answers, and device history. They pick one of six decisions and write a mandatory reason. It applies immediately, notifies the student, and lands in the audit log. Decisions cannot be deleted — only superseded." },
      { t: "h2", ar: "5. المعلم يصحح وينشر", en: "5. Teacher grades and publishes" },
      { t: "ol", items: [
        { ar: "طابور التصحيح يعرض المحاولات المسلَّمة مع عدد المقالي غير المصححة.", en: "The queue lists submitted attempts with counts of ungraded essays." },
        { ar: "المقالي تُصحح بدرجة وتعليق اختياري؛ الموضوعي معروض بالمفتاح وإجابة الطالب.", en: "Essays get a mark plus optional feedback; objective items show key vs student answer." },
        { ar: "كل حفظ يُعيد حساب المجموع وحالة النجاح فوراً.", en: "Each save recomputes total and pass state instantly." },
        { ar: "النشر يرسل إشعاراً لكل طالب ويُقفل التعديل دون طلب رسمي.", en: "Publishing notifies each student and locks edits absent a formal request." },
      ] },
      { t: "h2", ar: "6. طالب يعترض على درجة", en: "6. Student appeals a grade" },
      { t: "p", ar: "من التطبيق: «الطلبات» → جديد → نوع «التماس درجة» → يختار المقرر ويكتب السبب ويُرفق ما لديه → تُنشأ تذكرة برقم. الإدارة ترد (ظاهر) أو تدوّن (داخلي)، ثم تصدر قراراً مسبباً بمرجع تنظيمي. الطالب يُخطَر ويستطيع الاستئناف مرة ثانية أمام مسؤول أعلى.", en: "In the app: Requests → New → “Grade appeal” → choose the course, state the reason, attach evidence → a ticket number is created. Administration replies (visible) or notes (internal), then issues a reasoned decision citing a regulation. The student is notified and can escalate once to a senior officer." },
      { t: "table", headers: [{ ar: "نقطة الفشل", en: "Failure point" }, { ar: "المعالجة", en: "Recovery" }], rows: [
        ["رمز حضور منتهٍ", "Expired QR", "إعادة قراءة تلقائية + إدخال يدوي + تجاوز المعلم"],
        ["شبكة غير مستقرة أثناء الاختبار", "Flaky exam network", "حفظ محلي مؤقت + مزامنة عند العودة + مرجعية وقت الخادم"],
        ["جهاز جديد", "New device", "تسجيل بجهاز واحد رئيسي + إشعار أمني + إمكانية الإلغاء من الإدارة"],
        ["نزاع درجة", "Grade dispute", "تذكرة + محادثة + قرار مسبب + استئناف ثانٍ"],
      ] },
    ],
  },
  {
    slug: "brand-identity",
    num: "04",
    titleAr: "الهوية البصرية",
    titleEn: "Brand identity",
    descAr: "الشعار، الألوان، الخطوط، وقواعد الاستخدام.",
    descEn: "Logo, palette, typography, and usage rules.",
    updated: "2026-11-10",
    blocks: [
      { t: "h2", ar: "الفكرة", en: "The idea" },
      { t: "p", ar: "«المهندس» يجمع بين اللغة والهندسة: حرف الميم العربي «م» كوحدة أساسية، مع خط مسند أفقي ونهايات دقيقة تستعير منطق المسطرة والمسند الهندسي. الشعار ليس قبعة تخرج ولا كتاباً — بل حرف يُبنى كعنصر إنشائي.", en: "“Al Mohandes” fuses language and engineering: the Arabic letter mīm «م» as the base unit, crossed by a horizontal datum line with precise end ticks borrowed from a drafting ruler. It is neither a graduation cap nor a book — a letter constructed like a structural element." },
      { t: "h2", ar: "الشعار", en: "Logo system" },
      { t: "ul", items: [
        { ar: "الرمز (Monogram): ميم مستخرج من مسار الخط الأصلي IBM Plex Sans Arabic 600 — لا حرف مرسوم يدوياً.", en: "Monogram: the mīm uses the authentic glyph path from IBM Plex Sans Arabic 600 — not a redrawn letter." },
        { ar: "خط المسند: خط أفقي بلون #38A5FF مع نهايتين قصيرتين، يمثل المستوى المرجعي في الرسم الهندسي.", en: "Datum line: a horizontal rule in #38A5FF with two short end ticks, representing the reference plane in technical drawing." },
        { ar: "الكلمة: «المهندس» بوزن Book مع AL MOHANDES بحروف متباعدة — للاستخدام في الترويسات.", en: "Wordmark: «المهندس» in Book weight paired with letter-spaced AL MOHANDES for headers." },
        { ar: "النسخ: كامل الألوان، أحادي داكن، أحادي فاتح، وأيقونة 192/512 للتطبيقات.", en: "Variants: full colour, mono-dark, mono-light, plus 192/512 app icons." },
        { ar: "المساحة الآمنة: ارتفاع الميم × 0.5 حول الرمز في كل الاتجاهات، بلا ظلال أو تدرجات.", en: "Clear space: half the mīm height on all sides, with no shadows or gradients." },
      ] },
      { t: "h2", ar: "اللوحة اللونية", en: "Palette" },
      { t: "table", headers: [{ ar: "اللون", en: "Token" }, { ar: "الكود", en: "Hex" }, { ar: "الاستخدام", en: "Usage" }], rows: [
        ["Navy 950", "Navy 950", "#101B2D", "خلفية داكنة، ترويسة الصفحة التعريفية"],
        ["Navy 900", "Navy 900", "#192B45", "أسطح داكنة ثانوية"],
        ["Navy 800", "Navy 800", "#22334D", "حدود وفواصل داكنة"],
        ["Brand 500", "Brand 500", "#2864D9", "اللون الأساسي للأزرار والروابط"],
        ["Accent 400", "Accent 400", "#38A5FF", "تمييز، رسوم بيانية، خط المسند"],
        ["Success 500", "Success 500", "#19B88A", "حضور، نجاح، حالة سليمة"],
        ["Warning 500", "Warning 500", "#F2A93B", "تحذير، معلّق، حاجة لمتابعة"],
        ["Danger 500", "Danger 500", "#F05252", "خطر، تجميد، رفض"],
        ["Surface 50", "Surface 50", "#F3F6FA", "خلفية الوضع الفاتح"],
        ["Surface dark", "Surface dark", "#17243A", "سطح داكن للبطاقات"],
        ["Muted", "Muted", "#78879B", "نص ثانوي وحدود خفيفة"],
      ] },
      { t: "h2", ar: "الخطوط", en: "Typography" },
      { t: "ul", items: [
        { ar: "العربية: IBM Plex Sans Arabic بأوزان 300/400/500/600 — يُحمَّل محلياً عبر fontsource، لا من CDN.", en: "Arabic: IBM Plex Sans Arabic at 300/400/500/600 — self-hosted via fontsource, never a CDN." },
        { ar: "اللاتينية: Inter لنصوص الواجهة الإنجليزية والأرقام المالية.", en: "Latin: Inter for English UI text and tabular numbers." },
        { ar: "بديل: Cairo عند تعذّر تحميل Plex — بنفس المقاسات تقريباً.", en: "Fallback: Cairo if Plex fails, with matched metrics." },
        { ar: "الأرقام الجدولية تستخدم tnum لضمان محاذاة الأعمدة في الجداول والعدّادات.", en: "Tabular numbers use tnum to keep columns and countdowns aligned." },
      ] },
      { t: "note", tone: "warn", ar: "لا نستخدم الزجاجية (glassmorphism) إلا في طبقة واحدة فوق الصور في الصفحة التعريفية. البطاقات معتمة بحدود رقيقة — لأن الشفافية تقلّل التباين وتضرّ إتاحة القراءة.", en: "Glassmorphism appears in exactly one layer over imagery on the landing page. Cards are opaque with hairline borders — transparency lowers contrast and hurts readability." },
      { t: "h2", ar: "نبرة الصوت", en: "Voice" },
      { t: "p", ar: "مباشر، مهني، غير وعيد. نقول «رُصد حدث» لا «أنت غشّاش». ونشرح دائماً ما نراه وما لا نراه. كل رسالة خطأ تذكر السبب والخطوة التالية.", en: "Direct, professional, never accusatory. We say “an event was detected”, not “you cheated”. We always state what we see and what we do not. Every error names the cause and the next step." },
    ],
  },
  {
    slug: "design-system",
    num: "05",
    titleAr: "نظام التصميم",
    titleEn: "Design system",
    descAr: "الرموز، المقاسات، الحالات، والمكونات المشتركة.",
    descEn: "Tokens, scales, states, and shared components.",
    updated: "2026-11-10",
    blocks: [
      { t: "h2", ar: "الطبقات", en: "Layers" },
      { t: "p", ar: "ثلاث طبقات فقط: الرموز (CSS variables) ← المكونات البدائية (components/ui.tsx) ← الأنماط المركّبة (shells، بطاقات، جداول). لا يوجد نمط مكتوب داخل صفحة إذا كان قابلاً لإعادة الاستخدام.", en: "Three layers: tokens (CSS variables) → primitives (components/ui.tsx) → composed patterns (shells, cards, tables). No page-level style exists if it is reusable." },
      { t: "h2", ar: "رموز المسافات والمقاسات", en: "Space and size tokens" },
      { t: "kv", rows: [
        { kAr: "شبكة المسافات", kEn: "Space scale", v: "4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56" },
        { kAr: "أنصاف الأقطار", kEn: "Radius", v: "sm 6 · md 8 · lg 12 · xl 16 · full 999" },
        { kAr: "الظلال", kEn: "Elevation", v: "0 (مسطّح) · 1 (بطاقة) · 2 (قائمة) · 3 (نافذة)" },
        { kAr: "ارتفاع عنصر اللمس", kEn: "Touch target", v: "≥ 44px على الجوال" },
        { kAr: "حشو البطاقة", kEn: "Card padding", v: "16px (جوال) · 20px (سطح مكتب)" },
        { kAr: "عرض المحتوى", kEn: "Content width", v: "1180px أقصى، 28px حشو جانبي" },
      ] },
      { t: "h2", ar: "الحالات", en: "States" },
      { t: "ul", items: [
        { ar: "التركيز: حلقة 2px بلون Accent مع إزاحة 2px — مرئية دائماً عند التنقّل بالكيبورد.", en: "Focus: 2 px accent ring with a 2 px offset — always visible for keyboard navigation." },
        { ar: "التحويم: تغيّر السطح بدرجة واحدة وخلفية الأزرار بدرجة داكنة، بلا حركة مبالغ فيها.", en: "Hover: one step of surface change, buttons darken one step, no exaggerated motion." },
        { ar: "الضغط: scale 0.985 خلال 150 مللي ثانية — إحساس لمسي دون ارتداد.", en: "Press: scale 0.985 over 150 ms — tactile without bounce." },
        { ar: "التعطيل: شفافية 40% مع cursor not-allowed وعدم إرسال إجراء.", en: "Disabled: 40% opacity, not-allowed cursor, action not dispatched." },
        { ar: "التحميل: هيكل عظمي للقوائم، ودوّار صغير داخل الأزرار.", en: "Loading: skeletons for lists, small spinner inside buttons." },
      ] },
      { t: "h2", ar: "المكونات المشتركة", en: "Shared components" },
      { t: "table", headers: [{ ar: "المكوّن", en: "Component" }, { ar: "الاستخدام", en: "Use" }], rows: [
        ["Button / LinkButton", "أساسي، ثانوي، شبح، خطر، بأحجام xs→lg", "Primary, secondary, ghost, danger across xs→lg"],
        ["Badge / StatusBadge", "حالة نصية بنقطة أو بدونها، ومخطط حالات الكيان", "Text status with optional dot, plus entity state mapping"],
        ["Card / CardHeader", "حاوية محتوى بترويسة وأيقونة وإجراء", "Content shell with header, icon, action"],
        ["TableWrap / Th / Td", "جداول متجاوبة بمحاذاة RTL/LTR صحيحة", "Responsive tables with correct bidi alignment"],
        ["Field / Input / Select / Textarea", "حقول بتسمية وتلميح وخطأ وبصمة وصول", "Labelled fields with hint, error, a11y ids"],
        ["Segmented / Tabs", "تبديل عرض بدون فقدان الحالة في الرابط", "View switcher kept in the URL"],
        ["Modal / Sheet", "تفاصيل سريعة مع حبس التركيز وإغلاق Esc", "Quick detail with focus trap and Esc"],
        ["Toast", "تأكيد إجراء مؤقت، لا يحمل معلومة حرجة", "Transient action confirmation, never critical info"],
        ["EmptyState / Skeleton / Alert", "حالات فراغ وتحميل وتحذير موحّدة", "Unified empty, loading, and alert states"],
        ["LineChart / BarChart / Donut / Ring / Sparkline", "رسوم SVG بلا مكتبات خارجية", "SVG charts with no external library"],
      ] },
      { t: "h2", ar: "الإتاحة", en: "Accessibility" },
      { t: "ul", items: [
        { ar: "تباين النص الأساسي ≥ 7:1 في الفاتح و≥ 4.5:1 في الداكن.", en: "Body text contrast ≥ 7:1 light, ≥ 4.5:1 dark." },
        { ar: "كل أيقونة تحمل aria-label إذا كانت الزر الوحيد.", en: "Every icon-only button carries an aria-label." },
        { ar: "الرسوم البيانية تحمل role=img ونص بديل يصف البيانات.", en: "Charts expose role=img with an alternative data description." },
        { ar: "الأرقام والعدّادات تُقرأ بصيغة صحيحة، والوقت المتبقي لا يعتمد على اللون وحده.", en: "Numbers and countdowns read correctly; remaining time never relies on colour alone." },
        { ar: "الجدول الزمني للحوادث يحمل ترتيب DOM مطابقاً للترتيب البصري.", en: "Incident timelines keep DOM order matching visual order." },
      ] },
      { t: "h2", ar: "الوضعان الفاتح والداكن", en: "Light and dark" },
      { t: "p", ar: "كل الألوان تُستهلك عبر متغيرات CSS (--am-*). التبديل يغيّر مجموعة المتغيرات على الجذر فقط، فتبقى كل المكونات متسقة دون فروع شرطية. الوضع الافتراضي يتبع تفضيل النظام، والاختيار يُحفظ في الكوكيز ويُقرأ على الخادم لمنع وميض الألوان.", en: "All colours flow through CSS variables (--am-*). Theming swaps the root variable set only, so every component stays consistent without conditionals. Default follows the OS, the choice persists in a cookie and is read server-side to prevent a flash." },
    ],
  },
  {
    slug: "database-schema",
    num: "06",
    titleAr: "تصميم قاعدة البيانات",
    titleEn: "Database schema",
    descAr: "جداول PostgreSQL، العلاقات، القيود، والفهارس.",
    descEn: "PostgreSQL tables, relations, constraints, and indexes.",
    updated: "2026-11-10",
    blocks: [
      { t: "note", tone: "info", ar: "الملف الكامل القابل للتنفيذ: db/schema.sql في جذر المستودع. البيانات التجريبية هنا مبنية بنفس الأشكال، لذا استبدال المتجر باستعلامات SQL لا يغيّر الواجهات.", en: "Executable source: db/schema.sql at the repository root. The seeded store mirrors these shapes, so replacing it with SQL queries requires no UI change." },
      { t: "h2", ar: "المجموعات الأساسية", en: "Core tables" },
      { t: "table", headers: [{ ar: "الجدول", en: "Table" }, { ar: "الوصف", en: "Description" }, { ar: "مفاتيح", en: "Keys" }], rows: [
        ["institutions", "المؤسسات على المنصة", "id · code uniq · status"],
        ["users", "حسابات الدخول والأدوار", "id · email uniq · institution_id"],
        ["departments", "الأقسام الأكاديمية", "id · institution_id · code"],
        ["academic_years / semesters", "السنوات والفصول", "year_id → semesters"],
        ["sections", "الشعب الدراسية", "id · department_id · level"],
        ["teachers / students", "الملفات الأكاديمية", "id · user_id · section_id"],
        ["courses", "المقررات", "id · code · teacher_id · section_id"],
        ["schedule_slots", "جدول المحاضرات", "id · course_id · day · start"],
        ["attendance_sessions", "جلسات الحضور والرموز", "id · course_id · qr_token · geo"],
        ["attendance_records", "سجلات الحضور", "id · session_id · student_id uniq"],
        ["questions / examinations", "بنك الأسئلة والاختبارات", "exam_questions join table"],
        ["exam_attempts", "محاولات الطلاب", "id · examination_id · student_id"],
        ["exam_answers", "إجابات مع مراجعة", "attempt_id · question_id · revision"],
        ["exam_events", "أحداث النزاهة", "id · attempt_id · severity"],
        ["devices", "الأجهزة المسجّلة", "id · student_id · fingerprint"],
        ["grades", "سجلات الدرجات", "student_id + course_id + semester_id"],
        ["complaints / complaint_messages", "الطلبات والمحادثات", "ticket uniq"],
        ["notifications", "الإشعارات", "id · user_id · read_at"],
        ["audit_logs", "سجل التدقيق", "id · actor_id · action · at"],
        ["roles / role_permissions", "تعريف الأدوار", "role · permission"],
      ] },
      { t: "h2", ar: "قرارات التصميم", en: "Design decisions" },
      { t: "ul", items: [
        { ar: "institution_id في كل جدول أعمالي — عزل متعدد المستأجرين بفلترة إلزامية وليس بفصل قواعد بيانات.", en: "institution_id on every business table — tenancy by mandatory filtering, not separate databases." },
        { ar: "exam_answers تحمل revision وتُكتب upsert بشرط revision أعلى — يمنع الكتابة القديمة عند الشبكات المتقطعة.", en: "exam_answers carry revision and are upserted only with a higher revision — preventing stale writes on flaky networks." },
        { ar: "exam_events غير قابلة للتعديل: لا UPDATE ولا DELETE، فقط INSERT عبر سياسة صريحة.", en: "exam_events are append-only: no UPDATE or DELETE, INSERT-only by explicit policy." },
        { ar: "الرموز (qr_token) لها فهرس فريد وتاريخ انتهاء، وتُستبدل دورياً بدل تخزين سجل تاريخي للرموز.", en: "qr_token has a unique index and expiry, and is rotated in place rather than archived." },
        { ar: "الدرجات مرتبطة بالفصل الدراسي لتمكين إعادة الحساب التاريخي دون فقدان سجل سابق.", en: "Grades are keyed by semester so historical recomputation never destroys prior records." },
        { ar: "الحذف ناعم (archived_at) لكل الكيانات الأكاديمية، وصلب فقط للبيانات المؤقتة منتهية الصلاحية.", en: "Soft delete (archived_at) for every academic entity; hard deletes only for expired transient data." },
      ] },
      { t: "h2", ar: "علاقات مختصرة", en: "Relation sketch" },
      { t: "code", lang: "text", body: `institutions 1─n departments 1─n sections 1─n students
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
users 1─n audit_logs` },
      { t: "h2", ar: "الفهارس الحرجة", en: "Critical indexes" },
      { t: "code", lang: "sql", body: `CREATE UNIQUE INDEX uq_attendance_session_student
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
  ON notifications (user_id) WHERE read_at IS NULL;` },
      { t: "h2", ar: "القيود", en: "Constraints" },
      { t: "ul", items: [
        { ar: "CHECK على الدرجات: 0 ≤ coursework ≤ 20، 0 ≤ midterm ≤ 20، 0 ≤ final ≤ 60.", en: "CHECK on marks: 0 ≤ coursework ≤ 20, 0 ≤ midterm ≤ 20, 0 ≤ final ≤ 60." },
        { ar: "CHECK على النطاق الجغرافي: radius_m بين 25 و500.", en: "CHECK on geofence: radius_m between 25 and 500." },
        { ar: "FK مؤجلة للجداول المرتبطة دورياً (مثل exam_questions) لتسهيل الاستيراد.", en: "Deferrable FKs on cyclic joins (e.g. exam_questions) to ease imports." },
        { ar: "حذف مؤسسة يمنع نهائياً عند وجود بيانات أكاديمية — يجب الأرشفة أولاً.", en: "Deleting an institution is blocked while academic data exists — archive first." },
      ] },
    ],
  },
  {
    slug: "backend-architecture",
    num: "07",
    titleAr: "معمارية الخدمات",
    titleEn: "Backend architecture",
    descAr: "الطبقات، تدفق الطلب، المؤقّت المرجعي، والمهام الخلفية.",
    descEn: "Layers, request flow, authoritative timer, and background jobs.",
    updated: "2026-11-10",
    blocks: [
      { t: "h2", ar: "التقنيات", en: "Stack" },
      { t: "ul", items: [
        { ar: "Next.js 16 App Router — مكونات خادم للقراءة، وServer Actions للكتابة.", en: "Next.js 16 App Router — server components for reads, server actions for writes." },
        { ar: "PostgreSQL 16 + Prisma/‏SQL مباشر — معاملات صريحة حول كل تغيير مالي أو أكاديمي.", en: "PostgreSQL 16 with Prisma or raw SQL — explicit transactions around every academic or graded change." },
        { ar: "جلسات الخادم: في هذه النسخة تُحفظ في ملف حالة (`.data/auth-state.json` بصلاحية 0600) لتبقى بعد إعادة التشغيل، وفي الإنتاج Redis أو جدول `sessions`.", en: "Server sessions: mirrored to a 0600 state file (`.data/auth-state.json`) so a restart does not sign everyone out; Redis or a `sessions` table in production." },
        { ar: "Redis (اختياري) لتحديات OTP والمعدّلات — قابل للاستبدال بجدول مؤقت.", en: "Redis (optional) for OTP challenges and rate limits — replaceable with a transient table." },
        { ar: "تخزين كائنات للمرفقات (S3 متوافق) مع روابط موقّعة قصيرة العمر.", en: "Object storage for attachments (S3-compatible) with short-lived signed URLs." },
        { ar: "طابور مهام للإشعارات والتصدير والتذكيرات — لا يُنفّذ داخل الطلب.", en: "A job queue for notifications, exports and reminders — never inline in the request." },
      ] },
      { t: "h2", ar: "الطبقات", en: "Layers" },
      { t: "code", lang: "text", body: `app/               المسارات والواجهات (RSC + Actions)
app/api/v1/        نقاط REST للعميل الجوال والتكاملات
lib/permissions    مصفوفة RBAC واحدة (client-safe)
lib/server/auth    الجلسات، OTP، requireRole/requirePermission
lib/server/exam    منطق الاختبار: التبديل، المؤقّت، التصحيح، الأحداث
lib/server/store   الوصول للبيانات (قابل للاستبدال بـ SQL)
components/        بدائيات + هياكل + مكونات مجال
db/                schema.sql + بيانات البذر` },
      { t: "h2", ar: "تدفق طلب الاختبار", en: "Exam request flow" },
      { t: "ol", items: [
        { ar: "العميل يقرأ الحالة من GET /exam/attempts/:id/state فيتلقى endsAt وremainingMs من الخادم.", en: "The client reads GET /exam/attempts/:id/state and receives endsAt plus remainingMs from the server." },
        { ar: "كل إجابة POST /answer: يتحقق الخادم من الملكية والحالة والمؤقّت، ثم يكتب upsert بشرط revision.", en: "Each POST /answer validates ownership, status and time, then upserts conditionally on revision." },
        { ar: "كل حدث POST /events: يُصنَّف ويُحتسب؛ التجاوز يجمّد المحاولة ويكتب إشعاراً للمراقب.", en: "Each POST /events is classified and counted; crossing the cap freezes the attempt and notifies the supervisor." },
        { ar: "التسليم POST /submit يقيّم الموضوعي، ويحيل المقالي للتصحيح البشري، ويعيد النتيجة.", en: "POST /submit scores objective items, routes essays to human grading, and returns the result." },
        { ar: "كل كتابة تُنتج قيد تدقيق عند الحاجة، وتُبطل مسارات الصفحات المتأثرة.", en: "Each write emits an audit entry where required and revalidates affected page paths." },
      ] },
      { t: "h2", ar: "المؤقّت المرجعي", en: "Authoritative timer" },
      { t: "p", ar: "المؤقّت لا يُخزَّن كعدّاد. يُخزَّن ends_at فقط، ويُحسب المتبقي في كل طلب كـ ends_at − now. ساعة العميل تُستخدم للعرض فقط، وأي فارق كبير بين ساعة العميل والخادم يُسجَّل كحدث معلومة ويُصحَّح الاتجاه. الانتهاء يُغلق المحاولة على الخادم حتى لو أُغلق التطبيق.", en: "The timer is never a counter. Only ends_at is stored; remaining time is computed per request as ends_at − now. The client clock is display-only, and a large skew is logged as an informational event with a correction. Expiry closes the attempt server-side even if the app is closed." },
      { t: "h2", ar: "المهام الخلفية", en: "Background jobs" },
      { t: "table", headers: [{ ar: "المهمة", en: "Job" }, { ar: "التكرار", en: "Cadence" }, { ar: "الأثر", en: "Effect" }], rows: [
        ["إغلاق الجلسات المنتهية", "Expire sessions", "كل دقيقة", "Open → Closed، بلا فقدان سجلات"],
        ["تذكير الاختبارات", "Exam reminders", "كل 15 دقيقة", "إشعار قبل 24 ساعة و30 دقيقة"],
        ["تنبيه الغياب", "Absence alerts", "ليلي", "إشعار الطالب والمرشد عند تجاوز الحد"],
        ["تدوير بيانات مؤقتة", "Transient cleanup", "يومي", "حذف OTP منتهٍ وجلسات ميتة"],
        ["أرشفة الفصول", "Semester archive", "عند إغلاق الفصل", "قفل السجلات مع إبقائها للقراءة"],
      ] },
      { t: "note", tone: "success", ar: "في هذه النسخة التجريبية كل المنطق يعمل فعلياً على الخادم داخل الذاكرة (globalThis) — لا واجهة تدّعي وظيفة غير موجودة. استبدال المتجر باستعلامات SQL لا يغيّر أي سلوك.", en: "In this prototype the entire logic genuinely runs server-side in memory (globalThis) — no screen claims a capability it does not have. Swapping the store for SQL changes no behaviour." },
    ],
  },
  {
    slug: "api-specification",
    num: "08",
    titleAr: "مواصفة الـ API",
    titleEn: "API specification",
    descAr: "نقاط REST، المصادقة، الأخطاء، والحدود.",
    descEn: "REST endpoints, auth, errors, and limits.",
    updated: "2026-11-10",
    blocks: [
      { t: "note", tone: "info", ar: "مواصفة OpenAPI 3.1 الكاملة في openapi.yaml بجذر المستودع. كل استجابة خطأ تحمل كوداً ثابتاً ورسالة عربية/إنجليزية.", en: "The full OpenAPI 3.1 document lives at openapi.yaml in the repository root. Every error carries a stable code and an Arabic/English message." },
      { t: "h2", ar: "المصادقة", en: "Authentication" },
      { t: "ul", items: [
        { ar: "جلسة HTTP-only cookie باسم am_session، وتُقرأ على الخادم في كل طلب.", en: "HTTP-only cookie named am_session, read server-side on every request." },
        { ar: "تسجيل الدخول على خطوتين: كلمة مرور ثم رمز 6 أرقام صالح 5 دقائق.", en: "Two-step sign-in: password, then a 6-digit code valid for 5 minutes." },
        { ar: "كل نقطة محمية تتحقق من الدور والصلاحية قبل لمس البيانات.", en: "Every protected endpoint checks role and permission before touching data." },
        { ar: "في الإنتاج: TLS إلزامي، SameSite=Lax، وCSRF token لكل نموذج كتابة.", en: "In production: TLS enforced, SameSite=Lax, CSRF token on every write form." },
      ] },
      { t: "h2", ar: "النقاط الحالية", en: "Implemented endpoints" },
      { t: "table", headers: [{ ar: "الطريقة والمسار", en: "Method & path" }, { ar: "الوصف", en: "Purpose" }], rows: [
        ["POST /api/v1/attendance/check-in", "تسجيل حضور برمز QR ونطاق جغرافي", "Check in with QR token and geofence"],
        ["GET /api/v1/attendance/sessions/:id/token", "الرمز الحالي (يدور كل 20 ثانية)", "Current token (rotates every 20 s)"],
        ["GET /api/v1/attendance/sessions/:id/qr", "صورة SVG للرمز الحالي", "SVG frame of the current token"],
        ["POST /api/v1/exam/examinations/:id/start", "بدء أو استئناف محاولة", "Start or resume an attempt"],
        ["GET /api/v1/exam/attempts/:id/state", "الحالة والمؤقّت من الخادم", "State and server timer"],
        ["POST /api/v1/exam/attempts/:id/answer", "حفظ إجابة بمراجعة", "Save an answer with revision"],
        ["POST /api/v1/exam/attempts/:id/events", "تسجيل حدث نزاهة", "Record an integrity event"],
        ["POST /api/v1/exam/attempts/:id/submit", "تسليم وتصحيح آلي", "Submit and auto-grade"],
        ["GET /api/v1/reports/:kind", "تصدير CSV (طلاب/درجات/حضور/اختبارات/تدقيق)", "CSV export of core reports"],
      ] },
      { t: "h2", ar: "أمثلة", en: "Examples" },
      { t: "code", lang: "http", body: `POST /api/v1/exam/attempts/att_stu_demo_ds/answer
Content-Type: application/json
Cookie: am_session=...

{ "questionId": "q_ds_01", "value": ["q_ds_01_o2"], "revision": 1 }

200 OK
{ "ok": true, "savedAt": 1762780921455, "revision": 2 }` },
      { t: "code", lang: "http", body: `POST /api/v1/attendance/check-in
{ "sessionId": "ats_live_cs301", "token": "QR-8F2K1A0Z",
  "lat": 30.0132, "lng": 31.2088, "accuracy": 18, "deviceId": "dev_tab_01" }

200 OK
{ "ok": true, "status": "PRESENT", "distanceM": 12,
  "message": "تم تسجيل الحضور بنجاح" }

409 CONFLICT
{ "error": "TOKEN_EXPIRED",
  "message": "انتهت صلاحية الرمز — امسح الرمز الحالي على شاشة المعلم." }` },
      { t: "h2", ar: "الأخطاء", en: "Error model" },
      { t: "table", headers: [{ ar: "الكود", en: "Code" }, { ar: "HTTP", en: "HTTP" }, { ar: "المعنى", en: "Meaning" }], rows: [
        ["UNAUTHENTICATED", "401", "لا جلسة صالحة", "No valid session"],
        ["FORBIDDEN", "403", "الدور لا يملك الصلاحية", "Role lacks permission"],
        ["NOT_OWNER", "403", "تسجيل حضور لطالب آخر", "Check-in for another student"],
        ["TOKEN_EXPIRED", "409", "رمز حضور منتهٍ أو مستبدل", "Attendance token expired or rotated"],
        ["OUTSIDE_GEOFENCE", "409", "خارج النطاق المسموح", "Outside the allowed geofence"],
        ["EXAM_LOCKED", "423", "المحاولة مجمّدة بانتظار مراقب", "Attempt frozen pending supervisor"],
        ["TIME_UP", "409", "انتهى وقت الاختبار على الخادم", "Server clock reports time up"],
        ["REVISION_CONFLICT", "409", "كتابة أقدم من المحفوظ", "Stale write rejected"],
        ["RATE_LIMITED", "429", "تجاوز عدد المحاولات", "Too many attempts"],
      ] },
      { t: "h2", ar: "الحدود", en: "Rate limits" },
      { t: "ul", items: [
        { ar: "تسجيل الدخول: 5 محاولات لكل 15 دقيقة لكل بريد + IP.", en: "Sign-in: 5 attempts per 15 minutes per email + IP." },
        { ar: "إعادة إرسال الرمز: مرة كل 30 ثانية، 5 مرات كحد أقصى.", en: "Code resend: once per 30 seconds, max 5." },
        { ar: "حفظ الإجابة: 60 طلباً في الدقيقة لكل محاولة — حماية من الحلقات.", en: "Answer save: 60 requests per minute per attempt." },
        { ar: "التحقق من الحضور: 10 محاولات لكل طالب في المحاضرة.", en: "Attendance check-in: 10 attempts per student per session." },
      ] },
    ],
  },
  {
    slug: "security-architecture",
    num: "09",
    titleAr: "معمارية الأمان والخصوصية",
    titleEn: "Security & privacy architecture",
    descAr: "التهديدات، الضوابط، حقوق الطالب، وحدود ما يمكن ضمانه.",
    descEn: "Threats, controls, student rights, and the limits of guarantees.",
    updated: "2026-11-10",
    blocks: [
      { t: "note", tone: "warn", ar: "لا ندّعي حجزاً كاملاً للجهاز على الأجهزة الشخصية. أي مزوّد يقول ذلك على iOS/Android الشخصي يبالغ. ما نقدّمه: تقييد حقيقي على الأجهزة المُدارة، وكشف موثّق + قرار بشري على الشخصية.", en: "We do not claim full device lockdown on personal devices. Any vendor claiming that on personal iOS/Android is overstating. What we deliver: real restriction on managed devices, and documented detection plus a human decision on personal ones." },
      { t: "h2", ar: "نموذج التهديد", en: "Threat model" },
      { t: "table", headers: [{ ar: "التهديد", en: "Threat" }, { ar: "الضابط", en: "Control" }, { ar: "ما نضمنه", en: "Guarantee" }], rows: [
        ["تسجيل حضور بالنيابة", "Proxy check-in", "رمز يدور 20 ثانية + جهاز مسجّل + نطاق", "رمز ثابت لا يصلح بعد دقائق"],
        ["مشاركة رمز الحضور خارج القاعة", "Shared QR", "نطاق جغرافي + مسافة مسجّلة + تدقيق", "المسافة تُحفظ كدليل لا كحكم"],
        ["الوصول لحساب الطالب", "Account takeover", "2FA + جلسات HTTP-only + إلغاء الأجهزة", "جهاز جديد يُعلَّم ويُشطر"],
        ["تعديل درجة سراً", "Silent grade change", "لا تعديل بلا قيد تدقيق وسبب", "كل تغيير يُنسب لمنفّذه"],
        ["الغش عبر تطبيق آخر", "Second app", "تجميد عند الحوادث المتكررة + مراجعة بشرية", "كشف على الشخصي، تقييد على المُدار"],
        ["تلاعب بساعة الجهاز", "Clock tampering", "وقت الخادم مرجعي + تسجيل الانحراف", "لا ينفع تقديم أو تأخير الساعة"],
        ["حقن عبر المدخلات", "Injection", "معاملات مستعلَمة + تحقق مخطط + ترميز مخرجات", "لا استعلام بتركيب نصوص"],
      ] },
      { t: "h2", ar: "مقارنة صريحة بين الأجهزة", en: "Managed vs personal, stated plainly" },
      { t: "table", headers: [{ ar: "القدرة", en: "Capability" }, { ar: "جهاز مُدار (MDM)", en: "Managed device" }, { ar: "جهاز شخصي", en: "Personal device" }], rows: [
        ["قفل التطبيقات الأخرى", "Block other apps", "نعم — سياسة MDM", "لا"],
        ["منع لقطات الشاشة", "Block screenshots", "نعم (Android) / جزئياً (iOS)", "لا"],
        ["كشف تبديل التطبيق", "Detect app switch", "نعم", "نعم — حدث موثّق"],
        ["كشف الجذر/كسر الحماية", "Detect root/jailbreak", "نعم", "نعم — يُسجَّل ويُبلَّغ"],
        ["منع تسجيل الشاشة", "Block screen recording", "نعم", "لا — كشف فقط"],
        ["الكاميرا الأمامية للتحقق", "Front-camera check", "مسموح بموافقة مسبقة", "غير مستخدم"],
      ] },
      { t: "h2", ar: "مبدأ التناسب", en: "Proportionality" },
      { t: "ul", items: [
        { ar: "الحوادث تُصنَّف، ولا تُجمَّد المحاولة إلا عند تجاوز حد مُعلَن مسبقاً للطالب.", en: "Incidents are classified; an attempt only freezes past a cap disclosed to the student in advance." },
        { ar: "لا مراقبة مستمرة للشاشة أو الصوت — فقط أحداث حالة التطبيق والجهاز.", en: "No continuous screen or audio monitoring — only app and device state events." },
        { ar: "لا قرار آلي بالإلغاء. التجميد يوقف الإرسال ويحوّل الأمر لبشر.", en: "No automatic voiding. A freeze halts submission and routes the case to a human." },
        { ar: "الطالب يرى نفس سجل الحوادث الذي يراه المراقب، بنفس التفصيل.", en: "Students see the same incident log as the supervisor, in the same detail." },
      ] },
      { t: "h2", ar: "الخصوصية وحقوق الطالب", en: "Privacy and student rights" },
      { t: "ul", items: [
        { ar: "الموقع يُقرأ لحظة التحقق فقط، ويُحفظ الحكم والمسافة لا الإحداثيات ولا المسار.", en: "Location is read only at check-in; the decision and distance are stored, not coordinates or movement." },
        { ar: "الاحتفاظ: أحداث الاختبار 5 سنوات، سجلات الدخول 18 شهراً، ثم حذف تلقائي.", en: "Retention: exam events 5 years, sign-in logs 18 months, then automated deletion." },
        { ar: "الوصول: الطالب يطلب نسخة من بياناته، وتُصدَّر خلال 30 يوماً.", en: "Access: a student may request their data, exported within 30 days." },
        { ar: "التصحيح: كل قرار خاطئ له مسار استئناف بشر مستقل.", en: "Rectification: every wrong decision has an independent human appeal path." },
        { ar: "الإخطار: سياسة المراقبة تُعرض قبل بدء الاختبار، وليست في صفحة شروط مدفونة.", en: "Notice: the monitoring policy is shown before starting, not buried in terms." },
      ] },
      { t: "h2", ar: "دورة حياة الجلسة", en: "Session lifecycle" },
      { t: "table", headers: [{ ar: "المرحلة", en: "Stage" }, { ar: "السلوك", en: "Behaviour" }], rows: [
        ["الدخول", "Sign-in", "بريد + كلمة مرور ← تحدي 6 أرقام (5 دقائق، 5 محاولات) ← كوكي am_session", "Email + password → 6-digit challenge (5 min, 5 attempts) → am_session cookie"],
        ["المدة", "Lifetime", "8 ساعات صلاحية مطلقة، وليست متجددة تلقائياً بلا حد", "8-hour absolute lifetime, not renewed indefinitely"],
        ["إعادة التشغيل", "Restart", "الجلسات والتحديات تُستعاد من ملف الحالة — لا خروج جماعي", "Sessions and challenges rehydrate from the state file — no mass sign-out"],
        ["الخروج", "Sign-out", "حذف الجلسة من الخادم والملف والكوكي في نفس الطلب", "Session removed from server, file and cookie in the same request"],
        ["الانتهاء", "Expiry", "انتهاء صلاحية الرمز يعرض لوحة صريحة مع إعادة إرسال فوري بدل رسالة خطأ ميتة", "An expired code shows an explicit panel with immediate resend instead of a dead-end error"],
        ["الإلغاء", "Revocation", "إلغاء جهاز من الإدارة يُبطل جلساته المرتبطة به", "Revoking a device from admin invalidates its bound sessions"],
      ] },
      { t: "h2", ar: "الأمان التشغيلي", en: "Operations" },
      { t: "ul", items: [
        { ar: "تشفير أثناء النقل (TLS 1.3) وفي السكون (AES-256) مع مفاتيح مُدارة.", en: "Encryption in transit (TLS 1.3) and at rest (AES-256) with managed keys." },
        { ar: "أسرار البيئة في مدير أسرار، لا في الكود ولا في المستودع.", en: "Secrets in a managed vault — never in code or the repository." },
        { ar: "نسخ احتياطي مشفّر يومي، اختبار استعادة شهري موثّق.", en: "Daily encrypted backups with a documented monthly restore drill." },
        { ar: "اختبار اختراق سنوي، ومراجعة صلاحيات ربع سنوية.", en: "Annual penetration test and quarterly access review." },
      ] },
    ],
  },
  {
    slug: "roadmap",
    num: "10",
    titleAr: "خطة التطوير",
    titleEn: "Roadmap",
    descAr: "المراحل، المخرجات، والمخاطر.",
    descEn: "Phases, deliverables, and risks.",
    updated: "2026-11-10",
    blocks: [
      { t: "h2", ar: "المرحلة 0 — التأسيس (منجزة)", en: "Phase 0 — Foundation (done)" },
      { t: "ul", items: [
        { ar: "رموز التصميم، اللوحة اللونية، الشعار المستخرج من مسار الخط، والخطوط المحلية.", en: "Design tokens, palette, glyph-accurate logo, self-hosted fonts." },
        { ar: "هياكل الواجهات (تطبيق جوال + لوحات ويب) بالوضعين الفاتح والداكن.", en: "Shells (mobile app plus web consoles) in light and dark." },
        { ar: "RBAC مركزي، جلسات، تحقق بخطوتين، وبيانات بذر واقعية (96 طالباً، 4 مقررات، اختبار مباشر).", en: "Central RBAC, sessions, 2FA, realistic seed (96 students, 4 courses, one live exam)." },
      ] },
      { t: "h2", ar: "المرحلة 1 — الاختبار والحضور (منجزة في هذه النسخة)", en: "Phase 1 — Exams and attendance (delivered here)" },
      { t: "ul", items: [
        { ar: "محرّك اختبار بمؤقّت خادم، حفظ فوري، تصحيح آلي، وتجميد عند الحوادث.", en: "Exam runner with server timer, instant saves, auto-grading, incident freezing." },
        { ar: "مركز مراقبة بقرارات بشرية موثّقة، خط زمني، وسبب إلزامي.", en: "Control center with documented human decisions, timeline, mandatory reason." },
        { ar: "جلسات حضور برمز QR متغير كل 20 ثانية ونطاق جغرافي وتجاوز مسجّل.", en: "Attendance with a 20-second rotating QR, geofence, and audited overrides." },
      ] },
      { t: "h2", ar: "المرحلة 2 — التوسّع الأكاديمي (8 أسابيع)", en: "Phase 2 — Academic depth (8 weeks)" },
      { t: "ol", items: [
        { ar: "استبدال المتجر بـ PostgreSQL عبر Prisma مع ترحيلات واختبارات عزل.", en: "Replace the store with PostgreSQL via Prisma, with migrations and isolation tests." },
        { ar: "تطبيقا iOS/Android أصليان مع دفع فعلي وإشعارات وقيود MDM.", en: "Native iOS/Android apps with real push and MDM restrictions." },
        { ar: "التقويم الأكاديمي، التسجيل، والجداول القابلة للتحرير مع كشف التعارض.", en: "Academic calendar, registration, and editable timetables with conflict detection." },
        { ar: "تقارير PDF حقيقية بترويسة المؤسسة وتوقيع رقمي.", en: "Real PDF reports with institutional letterhead and digital signature." },
      ] },
      { t: "h2", ar: "المرحلة 3 — الذكاء التشغيلي (6 أسابيع)", en: "Phase 3 — Operational intelligence (6 weeks)" },
      { t: "ul", items: [
        { ar: "مؤشرات دعم قابلة للتفسير (حضور + معدل) مع مراجعة بشرية إلزامية.", en: "Explainable support indicators (attendance plus GPA) with mandatory human review." },
        { ar: "تحليل جودة الأسئلة: معامل الصعوبة والتمييز لكل سؤال.", en: "Item quality analytics: difficulty and discrimination per question." },
        { ar: "تكامل SIS وSSO، وتقارير حوكمة جاهزة للمجلس.", en: "SIS and SSO integration, plus board-ready governance reports." },
      ] },
      { t: "h2", ar: "المخاطر والاستجابات", en: "Risks and responses" },
      { t: "table", headers: [{ ar: "الخطر", en: "Risk" }, { ar: "الأثر", en: "Impact" }, { ar: "الاستجابة", en: "Response" }], rows: [
        ["أجهزة قديمة في القاعات", "Old lab devices", "فشل التحقق بالموقع", "إدخال يدوي للمعلم + تجاوز مسجّل"],
        ["شبكة ضعيفة وقت الاختبار", "Weak exam network", "فقدان إجابات", "حفظ فوري بمراجعة + استئناف بالمؤقّت"],
        ["اعتراض على قرارات النزاهة", "Integrity disputes", "نزاع قانوني", "سبب إلزامي + استئناف بشري + سجل كامل"],
        ["مقاومة المعلمين للأتمتة", "Faculty resistance", "تبنٍّ منخفض", "أتمتة الجداول لا التقييم، وتدريب قصير"],
        ["تضخّم نطاق الطلبات", "Scope creep", "تأخير", "PRD ملزم + مرحلة رابعة مؤجلة"],
      ] },
      { t: "h2", ar: "مقاييس النجاح", en: "Success metrics" },
      { t: "kv", rows: [
        { kAr: "نسبة الحضور الرقمي", kEn: "Digital attendance share", v: "> 90% من المحاضرات بعد 3 أشهر" },
        { kAr: "زمن فتح الجلسة", kEn: "Session start time", v: "< 20 ثانية من لحظة وصول المعلم" },
        { kAr: "فقدان إجابات", kEn: "Answer loss", v: "صفر" },
        { kAr: "زمن الرد على الطلبات", kEn: "Request response", v: "متوسط < 24 ساعة" },
        { kAr: "قرارات مُلغاة آلياً", kEn: "Auto-voided attempts", v: "صفر — بحكم التصميم" },
      ] },
    ],
  },
  {
    slug: "testing-strategy",
    num: "11",
    titleAr: "استراتيجية الاختبار",
    titleEn: "Testing strategy",
    descAr: "طبقات الاختبار، السيناريوهات الحرجة، ومعايير الجودة.",
    descEn: "Test layers, critical scenarios, and quality gates.",
    updated: "2026-11-10",
    blocks: [
      { t: "h2", ar: "الهرم", en: "The pyramid" },
      { t: "table", headers: [{ ar: "الطبقة", en: "Layer" }, { ar: "الأدوات", en: "Tools" }, { ar: "التغطية المستهدفة", en: "Target" }], rows: [
        ["وحدات", "Unit", "Vitest — منطق المؤقّت، التصحيح، العدّادات", "90% لمسارات exam.ts وpermissions"],
        ["تكامل", "Integration", "Vitest + قاعدة اختبار حقيقية", "كل نقطة API ونقل حالة"],
        ["واجهة", "Component", "Testing Library", "النماذج، الفلاتر، حالات الفراغ والخطأ"],
        ["رحلات", "E2E", "Playwright (جوال + سطح مكتب، RTL + LTR)", "6 رحلات حرجة على الأقل"],
        ["إتاحة", "A11y", "axe-core في CI", "صفر انتهاكات حرجة"],
        ["أداء", "Perf", "Lighthouse CI", "LCP < 1.8s · CLS < 0.05"],
      ] },
      { t: "h2", ar: "السيناريوهات الحرجة", en: "Critical scenarios" },
      { t: "ol", items: [
        { ar: "بدء اختبار ثم قطع الشبكة 30 ثانية: الإجابات المحفوظة تبقى، والمؤقّت لا يتوقف.", en: "Start an exam, drop the network for 30 s: saved answers survive and the timer does not pause." },
        { ar: "محاولة حفظ إجابة أقدم (revision أقل) → 409 دون فقدان النسخة الأحدث.", en: "Save with a lower revision → 409 without clobbering the newer copy." },
        { ar: "تجاوز حد الحوادث → تجميد فوري + إشعار مراقب + منع التسليم.", en: "Cross the violation cap → immediate freeze, supervisor notification, submission blocked." },
        { ar: "قرار استئناف يمنح 5 دقائق → المؤقّت يتقدم ويظهر للطالب فوراً.", en: "Resume decision grants 5 minutes → timer advances and the student sees it." },
        { ar: "مسح رمز حضور بعد انتهاء صلاحيته → رفض صريح مع سبب وإرشاد.", en: "Scan an expired attendance token → explicit rejection with cause and guidance." },
        { ar: "طالب في قسم آخر يحاول الوصول لمقرر ليس له → 403 مع تدقيق.", en: "A student from another department tries an unrelated course → 403 and an audit entry." },
        { ar: "معلم يعدّل حضور طالب في مقرر غيره → رفض على الخادم.", en: "A teacher overrides attendance in someone else's course → server rejects." },
        { ar: "تسليم تلقائي عند انتهاء الوقت مع حفظ آخر نسخة.", en: "Auto-submit on expiry preserving the last saved answer." },
      ] },
      { t: "h2", ar: "مصفوفة الأجهزة", en: "Device matrix" },
      { t: "ul", items: [
        { ar: "جوال: iPhone SE (375×667)، iPhone 15 (393×852)، Galaxy A54 (412×915).", en: "Mobile: iPhone SE 375×667, iPhone 15 393×852, Galaxy A54 412×915." },
        { ar: "أجهزة لوحية: iPad 10.2 (810×1080) في الوضعين الأفقي والعمودي.", en: "Tablet: iPad 10.2 810×1080, portrait and landscape." },
        { ar: "سطح مكتب: 1280، 1440، 1920، 2560 — مع تكبير 200%.", en: "Desktop: 1280, 1440, 1920, 2560 — including 200% zoom." },
        { ar: "كلا الوضعين (فاتح/داكن) وكلا الاتجاهين (RTL/LTR) في كل مقاس.", en: "Both themes and both directions at every breakpoint." },
      ] },
      { t: "h2", ar: "بوابات الجودة", en: "Quality gates" },
      { t: "ul", items: [
        { ar: "لا دمج دون نجاح الأنواع (tsc --noEmit) والبناء (next build).", en: "No merge without a clean typecheck (tsc --noEmit) and build (next build)." },
        { ar: "لا دمج دون اختبار E2E للرحلة المتأثرة على الأقل.", en: "No merge without an E2E run of at least the affected journey." },
        { ar: "أي تغيير في exam.ts أو permissions.ts يتطلب مراجعة ثانية إلزامية.", en: "Any change to exam.ts or permissions.ts requires a mandatory second review." },
        { ar: "تدقيق إتاحة في CI؛ انتهاك حرج يمنع الدمج.", en: "Accessibility audit in CI; a critical violation blocks the merge." },
      ] },
      { t: "h2", ar: "اختبار القبول النهائي", en: "Final acceptance" },
      { t: "p", ar: "تُقبل النسخة عندما يستطيع طالب حقيقي الدخول، تأكيد الحضور، اجتياز اختبار، رؤية نتيجته؛ ومعلم حقيقي فتح جلسة، إنشاء اختبار من البنك، تصحيح مقالي، نشر درجات؛ ومراقب اتخاذ قرار موثّق في حادثة — كل ذلك دون أي بيانات ثابتة في الواجهة، ومع تدقيق كامل لكل خطوة.", en: "A release is accepted when a real student can sign in, check in, sit an exam and see the result; a real teacher can open a session, build an exam from the bank, grade an essay and publish; and a supervisor can issue one documented incident decision — all with no hard-coded UI data and a full audit of every step." },
    ],
  },
];

export const getDoc = (slug: string) => DOCS.find((d) => d.slug === slug);
