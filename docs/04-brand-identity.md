# 04. الهوية البصرية

**Brand identity** · _updated 2026-11-10_

الشعار، الألوان، الخطوط، وقواعد الاستخدام.

> Logo, palette, typography, and usage rules.

---

## الفكرة

_The idea_

«المهندس» يجمع بين اللغة والهندسة: حرف الميم العربي «م» كوحدة أساسية، مع خط مسند أفقي ونهايات دقيقة تستعير منطق المسطرة والمسند الهندسي. الشعار ليس قبعة تخرج ولا كتاباً — بل حرف يُبنى كعنصر إنشائي.

> “Al Mohandes” fuses language and engineering: the Arabic letter mīm «م» as the base unit, crossed by a horizontal datum line with precise end ticks borrowed from a drafting ruler. It is neither a graduation cap nor a book — a letter constructed like a structural element.

## الشعار

_Logo system_

- الرمز (Monogram): ميم مستخرج من مسار الخط الأصلي IBM Plex Sans Arabic 600 — لا حرف مرسوم يدوياً.
  <br>_Monogram: the mīm uses the authentic glyph path from IBM Plex Sans Arabic 600 — not a redrawn letter._
- خط المسند: خط أفقي بلون #38A5FF مع نهايتين قصيرتين، يمثل المستوى المرجعي في الرسم الهندسي.
  <br>_Datum line: a horizontal rule in #38A5FF with two short end ticks, representing the reference plane in technical drawing._
- الكلمة: «المهندس» بوزن Book مع AL MOHANDES بحروف متباعدة — للاستخدام في الترويسات.
  <br>_Wordmark: «المهندس» in Book weight paired with letter-spaced AL MOHANDES for headers._
- النسخ: كامل الألوان، أحادي داكن، أحادي فاتح، وأيقونة 192/512 للتطبيقات.
  <br>_Variants: full colour, mono-dark, mono-light, plus 192/512 app icons._
- المساحة الآمنة: ارتفاع الميم × 0.5 حول الرمز في كل الاتجاهات، بلا ظلال أو تدرجات.
  <br>_Clear space: half the mīm height on all sides, with no shadows or gradients._

## اللوحة اللونية

_Palette_

| اللون / Token | الكود / Hex | الاستخدام / Usage |
| --- | --- | --- |
| Navy 950 | Navy 950 | #101B2D | خلفية داكنة، ترويسة الصفحة التعريفية |
| Navy 900 | Navy 900 | #192B45 | أسطح داكنة ثانوية |
| Navy 800 | Navy 800 | #22334D | حدود وفواصل داكنة |
| Brand 500 | Brand 500 | #2864D9 | اللون الأساسي للأزرار والروابط |
| Accent 400 | Accent 400 | #38A5FF | تمييز، رسوم بيانية، خط المسند |
| Success 500 | Success 500 | #19B88A | حضور، نجاح، حالة سليمة |
| Warning 500 | Warning 500 | #F2A93B | تحذير، معلّق، حاجة لمتابعة |
| Danger 500 | Danger 500 | #F05252 | خطر، تجميد، رفض |
| Surface 50 | Surface 50 | #F3F6FA | خلفية الوضع الفاتح |
| Surface dark | Surface dark | #17243A | سطح داكن للبطاقات |
| Muted | Muted | #78879B | نص ثانوي وحدود خفيفة |

## الخطوط

_Typography_

- العربية: IBM Plex Sans Arabic بأوزان 300/400/500/600 — يُحمَّل محلياً عبر fontsource، لا من CDN.
  <br>_Arabic: IBM Plex Sans Arabic at 300/400/500/600 — self-hosted via fontsource, never a CDN._
- اللاتينية: Inter لنصوص الواجهة الإنجليزية والأرقام المالية.
  <br>_Latin: Inter for English UI text and tabular numbers._
- بديل: Cairo عند تعذّر تحميل Plex — بنفس المقاسات تقريباً.
  <br>_Fallback: Cairo if Plex fails, with matched metrics._
- الأرقام الجدولية تستخدم tnum لضمان محاذاة الأعمدة في الجداول والعدّادات.
  <br>_Tabular numbers use tnum to keep columns and countdowns aligned._

> **⚠️** لا نستخدم الزجاجية (glassmorphism) إلا في طبقة واحدة فوق الصور في الصفحة التعريفية. البطاقات معتمة بحدود رقيقة — لأن الشفافية تقلّل التباين وتضرّ إتاحة القراءة.
>
> _Glassmorphism appears in exactly one layer over imagery on the landing page. Cards are opaque with hairline borders — transparency lowers contrast and hurts readability._

## نبرة الصوت

_Voice_

مباشر، مهني، غير وعيد. نقول «رُصد حدث» لا «أنت غشّاش». ونشرح دائماً ما نراه وما لا نراه. كل رسالة خطأ تذكر السبب والخطوة التالية.

> Direct, professional, never accusatory. We say “an event was detected”, not “you cheated”. We always state what we see and what we do not. Every error names the cause and the next step.

---

Source of truth: `lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
