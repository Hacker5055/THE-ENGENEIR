# 03. خرائط رحلات المستخدمين

**User journeys** · _updated 2026-11-10_

ست رحلات أساسية مع نقاط الفشل والمعالجة.

> Six core journeys with failure points and recovery.

---

## 1. الطالب يدخل ويؤكد الحضور

_1. Student signs in and checks in_

```text
فتح التطبيق → بريد + كلمة مرور → رمز 6 أرقام من التطبيق/البريد
  → الرئيسية تُظهر المحاضرة القادمة وبطاقة «حضور مفتوح»
  → يضغط «سجّل حضوري» → يقرأ الرمز من شاشة المعلم (أو يدخله يدوياً)
  → التحقق: جلسة مفتوحة ✓ رمز غير منتهٍ ✓ جهاز مسجّل ✓ داخل النطاق ✓
  → نجاح: «حاضر» + وقت + المسافة (5 م) + تحديث السجل فوراً
  فشل محتمل:
   ✗ رمز منتهٍ → «انتهت صلاحية الرمز، امسح الرمز الحالي» + إعادة تلقائية للقراءة
   ✗ خارج النطاق → يوضح المسافة المسجلة ويطلب الاقتراب، ويسمح للمعلم بالتجاوز
   ✗ جهاز غير مسجّل → شاشة تسجيل جهاز مع توضيح ما يُرسل وما لا يُرسل
```

قرار تصميمي: لا نُظهر رسالة «فشل» مجردة. كل فشل يقول السبب، وما يجب فعله، وهل يمكن للمعلم حلّه.

> Design decision: never show a bare “failed”. Each failure states the cause, the next action, and whether a teacher can resolve it.

## 2. المعلم يفتح جلسة حضور

_2. Teacher opens an attendance session_

1. من الرئيسية يضغط «فتح جلسة حضور» → يختار المقرر → يرى نطاق 120م.
   <br>_From the dashboard: “Open attendance” → pick a course → sees the 120 m geofence._
2. تُفتح الجلسة ويظهر رمز QR كبير مع عدّاد 20 ثانية وقائمة مباشرة بالحاضرين.
   <br>_The session opens with a large QR, a 20-second countdown, and a live roster._
3. كل مسح جديد يظهر خلال ثوانٍ بجانب اسم الطالب والطريقة والمسافة.
   <br>_Each scan appears within seconds beside the student name, method and distance._
4. طالب متأخر بدون هاتف → يعدّله المعلم يدوياً من القائمة، فيُسجَّل التعديل بالسبب.
   <br>_A late student without a phone → manual override from the roster, recorded with a reason._
5. يغلق الجلسة، فتُحفظ النتيجة ويُقفل المسح نهائياً.
   <br>_Closing the session freezes the result and permanently stops scanning._

## 3. الطالب يجتاز اختباراً آمناً

_3. Student sits a secure examination_

```text
بطاقة «اختبار جارٍ» → تفاصيل + تعليمات + سياسة الأمان معلنة صراحةً
  → «ابدأ الاختبار» → تحقق الجهاز/الموقع → شاشة تعليمات → بدء
  → المؤقّت من الخادم؛ كل اختيار يُحفظ ويظهر «محفوظ ✓»
  → تنبيه عند أول حادثة (خروج من الشاشة) مع تحذير واضح
  → تسليم → شاشة تأكيد: «تم التسليم، لا يمكن التعديل»
  حالات حافة:
   • انقطاع شبكة: الإجابات المحفوظة تبقى، والمحاولة تُستأنف بنفس الوقت المتبقي
   • تجاوز حد الحوادث: تجميد فوري + رسالة «بانتظار مراجعة المراقب» + زر تواصل
   • انتهاء الوقت أثناء الكتابة: حفظ آخر نسخة وتسليم تلقائي موثّق
```

## 4. المراقب يقرر في حادثة

_4. Supervisor decides an incident_

المراقب يرى في مركز المراقبة محاولة مُعلَّمة. يفتحها فيجد الخط الزمني الكامل (بدون لقطات شاشة)، الإجابات المحفوظة، وسجل الجهاز. يختار قراراً من ستة، ويكتب سبباً إلزامياً، فيُنفَّذ فوراً، يُخطر الطالب، ويُسجَّل في التدقيق. لا يستطيع أحد حذف القرار — فقط إصدار قرار لاحق يشرح التغيير.

> The supervisor sees a flagged attempt, opens it, and reviews the full timeline (no screenshots), saved answers, and device history. They pick one of six decisions and write a mandatory reason. It applies immediately, notifies the student, and lands in the audit log. Decisions cannot be deleted — only superseded.

## 5. المعلم يصحح وينشر

_5. Teacher grades and publishes_

1. طابور التصحيح يعرض المحاولات المسلَّمة مع عدد المقالي غير المصححة.
   <br>_The queue lists submitted attempts with counts of ungraded essays._
2. المقالي تُصحح بدرجة وتعليق اختياري؛ الموضوعي معروض بالمفتاح وإجابة الطالب.
   <br>_Essays get a mark plus optional feedback; objective items show key vs student answer._
3. كل حفظ يُعيد حساب المجموع وحالة النجاح فوراً.
   <br>_Each save recomputes total and pass state instantly._
4. النشر يرسل إشعاراً لكل طالب ويُقفل التعديل دون طلب رسمي.
   <br>_Publishing notifies each student and locks edits absent a formal request._

## 6. طالب يعترض على درجة

_6. Student appeals a grade_

من التطبيق: «الطلبات» → جديد → نوع «التماس درجة» → يختار المقرر ويكتب السبب ويُرفق ما لديه → تُنشأ تذكرة برقم. الإدارة ترد (ظاهر) أو تدوّن (داخلي)، ثم تصدر قراراً مسبباً بمرجع تنظيمي. الطالب يُخطَر ويستطيع الاستئناف مرة ثانية أمام مسؤول أعلى.

> In the app: Requests → New → “Grade appeal” → choose the course, state the reason, attach evidence → a ticket number is created. Administration replies (visible) or notes (internal), then issues a reasoned decision citing a regulation. The student is notified and can escalate once to a senior officer.

| نقطة الفشل / Failure point | المعالجة / Recovery |
| --- | --- |
| رمز حضور منتهٍ | Expired QR | إعادة قراءة تلقائية + إدخال يدوي + تجاوز المعلم |
| شبكة غير مستقرة أثناء الاختبار | Flaky exam network | حفظ محلي مؤقت + مزامنة عند العودة + مرجعية وقت الخادم |
| جهاز جديد | New device | تسجيل بجهاز واحد رئيسي + إشعار أمني + إمكانية الإلغاء من الإدارة |
| نزاع درجة | Grade dispute | تذكرة + محادثة + قرار مسبب + استئناف ثانٍ |

---

Source of truth: `lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
