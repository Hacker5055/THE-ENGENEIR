# 09. معمارية الأمان والخصوصية

**Security & privacy architecture** · _updated 2026-11-10_

التهديدات، الضوابط، حقوق الطالب، وحدود ما يمكن ضمانه.

> Threats, controls, student rights, and the limits of guarantees.

---

> **⚠️** لا ندّعي حجزاً كاملاً للجهاز على الأجهزة الشخصية. أي مزوّد يقول ذلك على iOS/Android الشخصي يبالغ. ما نقدّمه: تقييد حقيقي على الأجهزة المُدارة، وكشف موثّق + قرار بشري على الشخصية.
>
> _We do not claim full device lockdown on personal devices. Any vendor claiming that on personal iOS/Android is overstating. What we deliver: real restriction on managed devices, and documented detection plus a human decision on personal ones._

## نموذج التهديد

_Threat model_

| التهديد / Threat | الضابط / Control | ما نضمنه / Guarantee |
| --- | --- | --- |
| تسجيل حضور بالنيابة | Proxy check-in | رمز يدور 20 ثانية + جهاز مسجّل + نطاق | رمز ثابت لا يصلح بعد دقائق |
| مشاركة رمز الحضور خارج القاعة | Shared QR | نطاق جغرافي + مسافة مسجّلة + تدقيق | المسافة تُحفظ كدليل لا كحكم |
| الوصول لحساب الطالب | Account takeover | 2FA + جلسات HTTP-only + إلغاء الأجهزة | جهاز جديد يُعلَّم ويُشطر |
| تعديل درجة سراً | Silent grade change | لا تعديل بلا قيد تدقيق وسبب | كل تغيير يُنسب لمنفّذه |
| الغش عبر تطبيق آخر | Second app | تجميد عند الحوادث المتكررة + مراجعة بشرية | كشف على الشخصي، تقييد على المُدار |
| تلاعب بساعة الجهاز | Clock tampering | وقت الخادم مرجعي + تسجيل الانحراف | لا ينفع تقديم أو تأخير الساعة |
| حقن عبر المدخلات | Injection | معاملات مستعلَمة + تحقق مخطط + ترميز مخرجات | لا استعلام بتركيب نصوص |

## مقارنة صريحة بين الأجهزة

_Managed vs personal, stated plainly_

| القدرة / Capability | جهاز مُدار (MDM) / Managed device | جهاز شخصي / Personal device |
| --- | --- | --- |
| قفل التطبيقات الأخرى | Block other apps | نعم — سياسة MDM | لا |
| منع لقطات الشاشة | Block screenshots | نعم (Android) / جزئياً (iOS) | لا |
| كشف تبديل التطبيق | Detect app switch | نعم | نعم — حدث موثّق |
| كشف الجذر/كسر الحماية | Detect root/jailbreak | نعم | نعم — يُسجَّل ويُبلَّغ |
| منع تسجيل الشاشة | Block screen recording | نعم | لا — كشف فقط |
| الكاميرا الأمامية للتحقق | Front-camera check | مسموح بموافقة مسبقة | غير مستخدم |

## مبدأ التناسب

_Proportionality_

- الحوادث تُصنَّف، ولا تُجمَّد المحاولة إلا عند تجاوز حد مُعلَن مسبقاً للطالب.
  <br>_Incidents are classified; an attempt only freezes past a cap disclosed to the student in advance._
- لا مراقبة مستمرة للشاشة أو الصوت — فقط أحداث حالة التطبيق والجهاز.
  <br>_No continuous screen or audio monitoring — only app and device state events._
- لا قرار آلي بالإلغاء. التجميد يوقف الإرسال ويحوّل الأمر لبشر.
  <br>_No automatic voiding. A freeze halts submission and routes the case to a human._
- الطالب يرى نفس سجل الحوادث الذي يراه المراقب، بنفس التفصيل.
  <br>_Students see the same incident log as the supervisor, in the same detail._

## الخصوصية وحقوق الطالب

_Privacy and student rights_

- الموقع يُقرأ لحظة التحقق فقط، ويُحفظ الحكم والمسافة لا الإحداثيات ولا المسار.
  <br>_Location is read only at check-in; the decision and distance are stored, not coordinates or movement._
- الاحتفاظ: أحداث الاختبار 5 سنوات، سجلات الدخول 18 شهراً، ثم حذف تلقائي.
  <br>_Retention: exam events 5 years, sign-in logs 18 months, then automated deletion._
- الوصول: الطالب يطلب نسخة من بياناته، وتُصدَّر خلال 30 يوماً.
  <br>_Access: a student may request their data, exported within 30 days._
- التصحيح: كل قرار خاطئ له مسار استئناف بشر مستقل.
  <br>_Rectification: every wrong decision has an independent human appeal path._
- الإخطار: سياسة المراقبة تُعرض قبل بدء الاختبار، وليست في صفحة شروط مدفونة.
  <br>_Notice: the monitoring policy is shown before starting, not buried in terms._

## الأمان التشغيلي

_Operations_

- تشفير أثناء النقل (TLS 1.3) وفي السكون (AES-256) مع مفاتيح مُدارة.
  <br>_Encryption in transit (TLS 1.3) and at rest (AES-256) with managed keys._
- أسرار البيئة في مدير أسرار، لا في الكود ولا في المستودع.
  <br>_Secrets in a managed vault — never in code or the repository._
- نسخ احتياطي مشفّر يومي، اختبار استعادة شهري موثّق.
  <br>_Daily encrypted backups with a documented monthly restore drill._
- اختبار اختراق سنوي، ومراجعة صلاحيات ربع سنوية.
  <br>_Annual penetration test and quarterly access review._

---

Source of truth: `web/lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
