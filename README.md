<div align="center">

<img src="brand/icon.svg" width="88" alt="المهندس" />

# المهندس · AL MOHANDES

**منصة إدارة تعليم هندسي: تطبيق طالب، لوحة معلم، مركز إدارة، ومحرّك اختبارات آمن.**
*Engineering education management: student app, teacher console, administration center, and a secure examination engine.*

عربي أولاً (RTL) + English · Light & Dark · Server-authoritative

</div>

---

## ما هذا المستودع؟

نسخة عاملة من منصة «المهندس»، مبنية كمنتج حقيقي لا كنموذج ثابت: كل زر ونموذج وفلتر يعمل على بيانات فعلية محفوظة على الخادم، وكل عملية حساسة تُنتج أثراً في سجل التدقيق. لا توجد واجهة تدّعي وظيفة غير موجودة.

| الطبقة | التقنية |
| --- | --- |
| الواجهة | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 |
| البيانات | متجر خادم حتمي (96 طالباً، 11 عضواً، 4 مقررات، اختبار مباشر، 20+ تذكرة) + DDL جاهز في `db/schema.sql` |
| المصادقة | جلسات HTTP-only + تحقق بخطوتين (رمز 6 أرقام، صلاحية 5 دقائق، 5 محاولات) |
| الاختبارات | مؤقّت مرجعي على الخادم، حفظ فوري بمراجعة (revision)، تصحيح آلي للموضوعي، قرار حوادث بشري |
| الحضور | رمز QR متغيّر كل 20 ثانية، جهاز مسجّل، نطاق جغرافي 120 م، تجاوز معلم مسجّل |

## التشغيل

```bash
cd web
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # فحص الأنواع
npm run build        # بناء الإنتاج
```

## الحسابات التجريبية

| الدور | البريد | كلمة المرور | يفتح |
| --- | --- | --- | --- |
| طالب | `student@almohandes.edu` | `Student@123` | تطبيق الطالب (جوال) |
| معلم | `teacher@almohandes.edu` | `Teacher@123` | لوحة المعلم |
| مراقب اختبارات | `supervisor@almohandes.edu` | `Super@123` | مركز المراقبة |
| مدير مؤسسة | `admin@almohandes.edu` | `Admin@123` | لوحة الإدارة |
| مدير منصة | `root@almohandes.edu` | `Root@123` | مركز التحكم |

رمز التحقق يُعرض داخل شاشة التحقق في هذه النسخة التجريبية (لا يوجد بريد فعلي)، ويُطلب فعلياً في الإنتاج.

كل طالب ومعلم في البيانات التجريبية له حساب عامل أيضاً — بريد الطالب هو رقمه الجامعي بحروف صغيرة (`am20231002@almohandes.edu`) وكلمة المرور `Student@123`، وبريد المعلم مأخوذ من اسمه مع `Teacher@123`. بذلك يمكن فتح أي سجل في المنصة بشخصه الحقيقي، لا بحساب واحد فقط.

## خريطة المستودع

```
web/                     التطبيق (Next.js)
├─ app/                  المسارات: landing · login · verify · student · teacher · admin · exam · docs · api
├─ components/           بدائيات الواجهة، الهياكل، مكوّنات المجال
├─ lib/
│  ├─ permissions.ts     مصفوفة RBAC الواحدة (يستخدمها الخادم والواجهة)
│  ├─ server/            auth · exam · store · seed · context
│  ├─ docs.ts            مصدر المستندات (يُولّد docs/ و صفحات /docs)
│  └─ types.ts           نماذج البيانات
├─ db/schema.sql         PostgreSQL 16: تعدد مؤسسات + محرّك اختبارات
├─ openapi.yaml          مواصفة OpenAPI 3.1
├─ docs/                 حزمة التسليم بصيغة Markdown
├─ brand/                الشعار والنسخ والكلمة (SVG/PNG)
└─ scripts/              توليد الشعار، الكلمات، والمستندات
```

## حزمة المستندات

| # | المستند | المسار |
| --- | --- | --- |
| 01 | متطلبات المنتج (PRD) | [`docs/01-product-requirements.md`](docs/01-product-requirements.md) |
| 02 | هندسة المعلومات | [`docs/02-information-architecture.md`](docs/02-information-architecture.md) |
| 03 | خرائط الرحلات | [`docs/03-user-journeys.md`](docs/03-user-journeys.md) |
| 04 | الهوية البصرية | [`docs/04-brand-identity.md`](docs/04-brand-identity.md) |
| 05 | نظام التصميم | [`docs/05-design-system.md`](docs/05-design-system.md) |
| 06 | تصميم قاعدة البيانات | [`docs/06-database-schema.md`](docs/06-database-schema.md) |
| 07 | معمارية الخدمات | [`docs/07-backend-architecture.md`](docs/07-backend-architecture.md) |
| 08 | مواصفة الـ API | [`docs/08-api-specification.md`](docs/08-api-specification.md) |
| 09 | الأمان والخصوصية | [`docs/09-security-architecture.md`](docs/09-security-architecture.md) |
| 10 | خطة التطوير | [`docs/10-roadmap.md`](docs/10-roadmap.md) |
| 11 | استراتيجية الاختبار | [`docs/11-testing-strategy.md`](docs/11-testing-strategy.md) |

نفس المحتوى متاح داخل المنصة على `/docs` (مصدر واحد: `web/lib/docs.ts`).

## الهوية

لوغو «المهندس» مبني على حرف الميم العربي المستخرج من مسار الخط الأصلي **IBM Plex Sans Arabic 600**، يعبره خط مسند أفقي بلون `#38A5FF` بنهايتين قصيرتين — استعارة من المسطرة والمسند الهندسي، لا قبعة تخرج.

| Color | Hex | Usage |
| --- | --- | --- |
| Navy 950 | `#101B2D` | خلفية داكنة، ترويسة |
| Navy 900 | `#192B45` | أسطح داكنة |
| Navy 800 | `#22334D` | حدود داكنة |
| Brand 500 | `#2864D9` | اللون الأساسي |
| Accent 400 | `#38A5FF` | تمييز، رسوم، خط المسند |
| Success 500 | `#19B88A` | حضور، نجاح |
| Warning 500 | `#F2A93B` | تحذير، معلّق |
| Danger 500 | `#F05252` | خطر، تجميد |
| Surface 50 | `#F3F6FA` | خلفية فاتحة |
| Surface dark | `#17243A` | سطح بطاقة داكنة |
| Muted | `#78879B` | نص ثانوي |

الخطوط: **IBM Plex Sans Arabic** (300–600) للعربية، **Inter** للاتينية — مستضافة محلياً لا عبر CDN.

## الاختبار الآمن: ما نضمنه وما لا نضمنه

| القدرة | جهاز مُدار (MDM) | جهاز شخصي |
| --- | --- | --- |
| قفل التطبيقات الأخرى | نعم | لا |
| منع لقطات الشاشة | نعم (Android) / جزئياً (iOS) | لا |
| كشف تبديل التطبيق | نعم | نعم — حدث موثّق |
| كشف الجذر/كسر الحماية | نعم | نعم — يُسجَّل |
| منع تسجيل الشاشة | نعم | لا |

لا ندّعي حجزاً كاملاً للجهاز على الأجهزة الشخصية. المؤقّت من الخادم، الإجابات تُحفظ فوراً، وكل حادثة تُصنَّف وتُعرض على مراقب بشري — ولا تُلغى أي محاولة آلياً.

## الأدوات

```bash
cd web
npm run dev              # تشغيل محلي
npm run build            # بناء الإنتاج
node ../scripts/export-docs.mjs /tmp/am-docs/docs.js   # إعادة توليد docs/*.md
```

<div align="center"><sub>© 2026 AL MOHANDES · صُمّم وبُني كنظام واحد متكامل</sub></div>
