# التشغيل الإنتاجي · Production deployment

> هذه هي الحزمة التشغيلية الكاملة: قاعدة بيانات دائمة، حساب مدير حقيقي، تحقق ثنائي بالبريد، استعادة كلمة مرور، تحديث محاولات الدخول، فحوص صحة، ونسخ احتياطي.

## 1) ما تغيّر عن النسخة التجريبية

| الجانب | قبل | الآن |
|---|---|---|
| التخزين | ذاكرة العملية (`globalThis`) تتصفّر مع كل إعادة تشغيل | **SQLite** عبر `node:sqlite` (مدمج في Node 22 — بلا حزم أصلية)، WAL + `synchronous=FULL` |
| الحفظ | عند إعادة التشغيل يضيع كل شيء | كل تعديل يُثبَّت داخل معاملة **قبل** إرسال الاستجابة |
| الجلسات | `Map` + ملف JSON | جدول `sessions` (يبقى المستخدم مسجّلاً بعد النشر/إعادة التشغيل) |
| بيانات أولية | بيانات تجريبية دائماً | `AM_DEMO_MODE=0` افتراضياً في الإنتاج: قاعدة فارغة + مدير من متغيرات البيئة |
| كلمات المرور | كلمة موحّدة لكل دور | كلمة مؤقتة **عشوائية لكل حساب** + إلزام التغيير عند أول دخول |
| التحقق الثنائي | رمز معروض على الشاشة | رمز **بالبريد** (Gmail/SMTP)، مع خفض آمن إلى عامل واحد إذا تعطّل البريد |
| استعادة كلمة المرور | نافذة تجريبية لا ترسل شيئاً | رابط بالبريد صالح ساعة، لمرة واحدة، ويُلغي كل الجلسات |
| محاولات الدخول | تأخير ثابت فقط | حد 8 محاولات / 15 دقيقة لكل (بريد + IP) |
| رؤوس الأمان | لا شيء | `nosniff` · `Referrer-Policy` · `Permissions-Policy` · `frame-ancestors` · HSTS |
| الفحص | لا شيء | `GET /api/health` (قاعدة البيانات، البريد، الوضع) |
| النشر | يدوي | `Dockerfile` + `docker-compose.yml` + نسخ احتياطي بأمر واحد |

## 2) خطوات التشغيل (VPS + Docker — الموصى به)

```bash
git clone https://github.com/Hacker5055/THE-ENGENEIR.git && cd THE-ENGENEIR
cp .env.example .env
#   املأ: AM_ADMIN_EMAIL · AM_ADMIN_PASSWORD (12+ حرفاً مع رمز) ·
#         AM_BASE_URL · AM_SMTP_USER · AM_SMTP_PASS (App Password من جوجل)
docker compose up -d --build
curl -fsS localhost:3000/api/health
```

ثم ضع Nginx/Caddy أمام المنفذ 3000 مع شهادة TLS (Caddy: `almohandes.example.edu { reverse_proxy 127.0.0.1:3000 }`)، واضبط `AM_BASE_URL=https://almohandes.example.edu`.

**أول دخول:** البريد/كلمة المرور من `.env` → يُطلب تغيير كلمة المرور فوراً (إن فعّلت `AM_ADMIN_FORCE_PASSWORD_CHANGE=1`) → بعدها أنشئ الأقسام والمقررات والطلاب من لوحة الإدارة.

### بدون Docker (systemd)

```bash
npm ci && npm run build
systemctl enable --now almohandes   # ExecStart=/usr/bin/npm run start
```

## 3) Gmail / Google Workspace

1. فعّل التحقق بخطوتين على حساب جوجل.
2. أنشئ **App Password** (الحساب ← الأمان ← كلمات مرور التطبيقات).
3. `AM_SMTP_USER=you@gmail.com` · `AM_SMTP_PASS=xxxx xxxx xxxx xxxx` (16 حرفاً، بدون مسافات).
4. تأكد من الظهور في `/api/health` → `"mail": "configured"`.
5. لتفعيل التحقق الثنائي للجميع: الإعدادات ← `requireTwoFactor = true` (يظهر في `/admin/settings`؛ يُطبَّق فقط عندما يكون البريد مهيّأً — وإلا فالدخول بعامل واحد أفضل من قفل الجميع خارج النظام).

> جوجل يحدّ الإرسال (~500 رسالة/يوم للحساب العادي). لمؤسسة كبيرة استخدم Google Workspace أو مزوّد SMTP مع خادم بريد مخصص.

## 4) النسخ الاحتياطي والاستعادة

```bash
node scripts/backup-db.mjs --out /backups            # نسخة متسقة أثناء العمل
# جدولة يومية:
0 2 * * * cd /srv/almohandes && node scripts/backup-db.mjs --out /backups >> /var/log/almohandes-backup.log 2>&1
```

الاستعادة: أوقف الخدمة، استبدل `/data/almohandes.db` بأحدث نسخة، أعد التشغيل. احتفظ بالنسخ **خارج** الخادم (S3/Drive) لأنها تحتوي بيانات الطلاب.

## 5) الصيانة

| المهمة | الأمر |
|---|---|
| فحص الصحة | `curl /api/health` |
| نسخة احتياطية | `node scripts/backup-db.mjs` |
| فحص ما قبل النشر | `npm run doctor && npm run build && npm run smoke` |
| تقليم الجلسات المنتهية | تلقائي عند كل إقلاع (`instrumentation.ts`) |
| سجل التدقيق | `/admin/audit` (يُحفظ في القاعدة) |

## 6) حدود معروفة (بصراحة)

- **نسخة واحدة لكل قاعدة**: SQLite ملف واحد، فلا توزيع أفقي ولا عدة حاويات على نفس الملف. مؤسسة واحدة على خادم واحد = الحجم المناسب. للتوسع: PostgreSQL عبر `db/schema.sql` (نفس الأشكال).
- **لا يوجد اختبار آلي للواجهة**: الفحص الحالي `npm run smoke` (42 فحصاً على المسارات والـ APIs) + `tsc` + بناء. اختبارات الوحدة لمنطق الاختبارات/الحضور خطوة تالية موصى بها.
- **لا تكامل مع أنظمة الجامعة** (SIS/LMS) ولا رسائل SMS — البريد فقط.
- **المحتوى الأكاديمي يبدأ فارغاً**: لا نستورد قوائم طلاب تلقائياً؛ الإنشاء من لوحة الإدارة أو عبر `POST /api/v1/students` و`/api/v1/teachers`.
