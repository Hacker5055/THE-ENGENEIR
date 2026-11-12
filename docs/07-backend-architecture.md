# 07. معمارية الخدمات

**Backend architecture** · _updated 2026-11-10_

الطبقات، تدفق الطلب، المؤقّت المرجعي، والمهام الخلفية.

> Layers, request flow, authoritative timer, and background jobs.

---

## التقنيات

_Stack_

- Next.js 15 App Router — مكونات خادم للقراءة، وServer Actions للكتابة.
  <br>_Next.js 15 App Router — server components for reads, server actions for writes._
- PostgreSQL 16 + Prisma/‏SQL مباشر — معاملات صريحة حول كل تغيير مالي أو أكاديمي.
  <br>_PostgreSQL 16 with Prisma or raw SQL — explicit transactions around every academic or graded change._
- Redis (اختياري) لجلسات OTP والمعدّلات — قابل للاستبدال بجدول مؤقت.
  <br>_Redis (optional) for OTP sessions and rate limits — replaceable with a transient table._
- تخزين كائنات للمرفقات (S3 متوافق) مع روابط موقّعة قصيرة العمر.
  <br>_Object storage for attachments (S3-compatible) with short-lived signed URLs._
- طابور مهام للإشعارات والتصدير والتذكيرات — لا يُنفّذ داخل الطلب.
  <br>_A job queue for notifications, exports and reminders — never inline in the request._

## الطبقات

_Layers_

```text
app/               المسارات والواجهات (RSC + Actions)
app/api/v1/        نقاط REST للعميل الجوال والتكاملات
lib/permissions    مصفوفة RBAC واحدة (client-safe)
lib/server/auth    الجلسات، OTP، requireRole/requirePermission
lib/server/exam    منطق الاختبار: التبديل، المؤقّت، التصحيح، الأحداث
lib/server/store   الوصول للبيانات (قابل للاستبدال بـ SQL)
components/        بدائيات + هياكل + مكونات مجال
db/                schema.sql + بيانات البذر
```

## تدفق طلب الاختبار

_Exam request flow_

1. العميل يقرأ الحالة من GET /exam/attempts/:id/state فيتلقى endsAt وremainingMs من الخادم.
   <br>_The client reads GET /exam/attempts/:id/state and receives endsAt plus remainingMs from the server._
2. كل إجابة POST /answer: يتحقق الخادم من الملكية والحالة والمؤقّت، ثم يكتب upsert بشرط revision.
   <br>_Each POST /answer validates ownership, status and time, then upserts conditionally on revision._
3. كل حدث POST /events: يُصنَّف ويُحتسب؛ التجاوز يجمّد المحاولة ويكتب إشعاراً للمراقب.
   <br>_Each POST /events is classified and counted; crossing the cap freezes the attempt and notifies the supervisor._
4. التسليم POST /submit يقيّم الموضوعي، ويحيل المقالي للتصحيح البشري، ويعيد النتيجة.
   <br>_POST /submit scores objective items, routes essays to human grading, and returns the result._
5. كل كتابة تُنتج قيد تدقيق عند الحاجة، وتُبطل مسارات الصفحات المتأثرة.
   <br>_Each write emits an audit entry where required and revalidates affected page paths._

## المؤقّت المرجعي

_Authoritative timer_

المؤقّت لا يُخزَّن كعدّاد. يُخزَّن ends_at فقط، ويُحسب المتبقي في كل طلب كـ ends_at − now. ساعة العميل تُستخدم للعرض فقط، وأي فارق كبير بين ساعة العميل والخادم يُسجَّل كحدث معلومة ويُصحَّح الاتجاه. الانتهاء يُغلق المحاولة على الخادم حتى لو أُغلق التطبيق.

> The timer is never a counter. Only ends_at is stored; remaining time is computed per request as ends_at − now. The client clock is display-only, and a large skew is logged as an informational event with a correction. Expiry closes the attempt server-side even if the app is closed.

## المهام الخلفية

_Background jobs_

| المهمة / Job | التكرار / Cadence | الأثر / Effect |
| --- | --- | --- |
| إغلاق الجلسات المنتهية | Expire sessions | كل دقيقة | Open → Closed، بلا فقدان سجلات |
| تذكير الاختبارات | Exam reminders | كل 15 دقيقة | إشعار قبل 24 ساعة و30 دقيقة |
| تنبيه الغياب | Absence alerts | ليلي | إشعار الطالب والمرشد عند تجاوز الحد |
| تدوير بيانات مؤقتة | Transient cleanup | يومي | حذف OTP منتهٍ وجلسات ميتة |
| أرشفة الفصول | Semester archive | عند إغلاق الفصل | قفل السجلات مع إبقائها للقراءة |

> **✅** في هذه النسخة التجريبية كل المنطق يعمل فعلياً على الخادم داخل الذاكرة (globalThis) — لا واجهة تدّعي وظيفة غير موجودة. استبدال المتجر باستعلامات SQL لا يغيّر أي سلوك.
>
> _In this prototype the entire logic genuinely runs server-side in memory (globalThis) — no screen claims a capability it does not have. Swapping the store for SQL changes no behaviour._

---

Source of truth: `web/lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
