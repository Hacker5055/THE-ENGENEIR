# 08. مواصفة الـ API

**API specification** · _updated 2026-11-10_

نقاط REST، المصادقة، الأخطاء، والحدود.

> REST endpoints, auth, errors, and limits.

---

> **ℹ️** مواصفة OpenAPI 3.1 الكاملة في openapi.yaml بجذر المستودع. كل استجابة خطأ تحمل كوداً ثابتاً ورسالة عربية/إنجليزية.
>
> _The full OpenAPI 3.1 document lives at openapi.yaml in the repository root. Every error carries a stable code and an Arabic/English message._

## المصادقة

_Authentication_

- جلسة HTTP-only cookie باسم am_session، وتُقرأ على الخادم في كل طلب.
  <br>_HTTP-only cookie named am_session, read server-side on every request._
- تسجيل الدخول على خطوتين: كلمة مرور ثم رمز 6 أرقام صالح 5 دقائق.
  <br>_Two-step sign-in: password, then a 6-digit code valid for 5 minutes._
- كل نقطة محمية تتحقق من الدور والصلاحية قبل لمس البيانات.
  <br>_Every protected endpoint checks role and permission before touching data._
- في الإنتاج: TLS إلزامي، SameSite=Lax، وCSRF token لكل نموذج كتابة.
  <br>_In production: TLS enforced, SameSite=Lax, CSRF token on every write form._

## النقاط الحالية

_Implemented endpoints_

| الطريقة والمسار / Method & path | الوصف / Purpose |
| --- | --- |
| POST /api/v1/attendance/check-in | تسجيل حضور برمز QR ونطاق جغرافي | Check in with QR token and geofence |
| GET /api/v1/attendance/sessions/:id/token | الرمز الحالي (يدور كل 20 ثانية) | Current token (rotates every 20 s) |
| GET /api/v1/attendance/sessions/:id/qr | صورة SVG للرمز الحالي | SVG frame of the current token |
| POST /api/v1/exam/examinations/:id/start | بدء أو استئناف محاولة | Start or resume an attempt |
| GET /api/v1/exam/attempts/:id/state | الحالة والمؤقّت من الخادم | State and server timer |
| POST /api/v1/exam/attempts/:id/answer | حفظ إجابة بمراجعة | Save an answer with revision |
| POST /api/v1/exam/attempts/:id/events | تسجيل حدث نزاهة | Record an integrity event |
| POST /api/v1/exam/attempts/:id/submit | تسليم وتصحيح آلي | Submit and auto-grade |
| GET /api/v1/reports/:kind | تصدير CSV (طلاب/درجات/حضور/اختبارات/تدقيق) | CSV export of core reports |

## أمثلة

_Examples_

```http
POST /api/v1/exam/attempts/att_stu_demo_ds/answer
Content-Type: application/json
Cookie: am_session=...

{ "questionId": "q_ds_01", "value": ["q_ds_01_o2"], "revision": 1 }

200 OK
{ "ok": true, "savedAt": 1762780921455, "revision": 2 }
```

```http
POST /api/v1/attendance/check-in
{ "sessionId": "ats_live_cs301", "token": "QR-8F2K1A0Z",
  "lat": 30.0132, "lng": 31.2088, "accuracy": 18, "deviceId": "dev_tab_01" }

200 OK
{ "ok": true, "status": "PRESENT", "distanceM": 12,
  "message": "تم تسجيل الحضور بنجاح" }

409 CONFLICT
{ "error": "TOKEN_EXPIRED",
  "message": "انتهت صلاحية الرمز — امسح الرمز الحالي على شاشة المعلم." }
```

## الأخطاء

_Error model_

| الكود / Code | HTTP / HTTP | المعنى / Meaning |
| --- | --- | --- |
| UNAUTHENTICATED | 401 | لا جلسة صالحة | No valid session |
| FORBIDDEN | 403 | الدور لا يملك الصلاحية | Role lacks permission |
| NOT_OWNER | 403 | تسجيل حضور لطالب آخر | Check-in for another student |
| TOKEN_EXPIRED | 409 | رمز حضور منتهٍ أو مستبدل | Attendance token expired or rotated |
| OUTSIDE_GEOFENCE | 409 | خارج النطاق المسموح | Outside the allowed geofence |
| EXAM_LOCKED | 423 | المحاولة مجمّدة بانتظار مراقب | Attempt frozen pending supervisor |
| TIME_UP | 409 | انتهى وقت الاختبار على الخادم | Server clock reports time up |
| REVISION_CONFLICT | 409 | كتابة أقدم من المحفوظ | Stale write rejected |
| RATE_LIMITED | 429 | تجاوز عدد المحاولات | Too many attempts |

## الحدود

_Rate limits_

- تسجيل الدخول: 5 محاولات لكل 15 دقيقة لكل بريد + IP.
  <br>_Sign-in: 5 attempts per 15 minutes per email + IP._
- إعادة إرسال الرمز: مرة كل 30 ثانية، 5 مرات كحد أقصى.
  <br>_Code resend: once per 30 seconds, max 5._
- حفظ الإجابة: 60 طلباً في الدقيقة لكل محاولة — حماية من الحلقات.
  <br>_Answer save: 60 requests per minute per attempt._
- التحقق من الحضور: 10 محاولات لكل طالب في المحاضرة.
  <br>_Attendance check-in: 10 attempts per student per session._

---

Source of truth: `lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
