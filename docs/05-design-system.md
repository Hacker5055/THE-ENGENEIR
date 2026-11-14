# 05. نظام التصميم

**Design system** · _updated 2026-11-10_

الرموز، المقاسات، الحالات، والمكونات المشتركة.

> Tokens, scales, states, and shared components.

---

## الطبقات

_Layers_

ثلاث طبقات فقط: الرموز (CSS variables) ← المكونات البدائية (components/ui.tsx) ← الأنماط المركّبة (shells، بطاقات، جداول). لا يوجد نمط مكتوب داخل صفحة إذا كان قابلاً لإعادة الاستخدام.

> Three layers: tokens (CSS variables) → primitives (components/ui.tsx) → composed patterns (shells, cards, tables). No page-level style exists if it is reusable.

## رموز المسافات والمقاسات

_Space and size tokens_

| Key | Value |
| --- | --- |
| شبكة المسافات / Space scale | `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56` |
| أنصاف الأقطار / Radius | `sm 6 · md 8 · lg 12 · xl 16 · full 999` |
| الظلال / Elevation | `0 (مسطّح) · 1 (بطاقة) · 2 (قائمة) · 3 (نافذة)` |
| ارتفاع عنصر اللمس / Touch target | `≥ 44px على الجوال` |
| حشو البطاقة / Card padding | `16px (جوال) · 20px (سطح مكتب)` |
| عرض المحتوى / Content width | `1180px أقصى، 28px حشو جانبي` |

## الحالات

_States_

- التركيز: حلقة 2px بلون Accent مع إزاحة 2px — مرئية دائماً عند التنقّل بالكيبورد.
  <br>_Focus: 2 px accent ring with a 2 px offset — always visible for keyboard navigation._
- التحويم: تغيّر السطح بدرجة واحدة وخلفية الأزرار بدرجة داكنة، بلا حركة مبالغ فيها.
  <br>_Hover: one step of surface change, buttons darken one step, no exaggerated motion._
- الضغط: scale 0.985 خلال 150 مللي ثانية — إحساس لمسي دون ارتداد.
  <br>_Press: scale 0.985 over 150 ms — tactile without bounce._
- التعطيل: شفافية 40% مع cursor not-allowed وعدم إرسال إجراء.
  <br>_Disabled: 40% opacity, not-allowed cursor, action not dispatched._
- التحميل: هيكل عظمي للقوائم، ودوّار صغير داخل الأزرار.
  <br>_Loading: skeletons for lists, small spinner inside buttons._

## المكونات المشتركة

_Shared components_

| المكوّن / Component | الاستخدام / Use |
| --- | --- |
| Button / LinkButton | أساسي، ثانوي، شبح، خطر، بأحجام xs→lg | Primary, secondary, ghost, danger across xs→lg |
| Badge / StatusBadge | حالة نصية بنقطة أو بدونها، ومخطط حالات الكيان | Text status with optional dot, plus entity state mapping |
| Card / CardHeader | حاوية محتوى بترويسة وأيقونة وإجراء | Content shell with header, icon, action |
| TableWrap / Th / Td | جداول متجاوبة بمحاذاة RTL/LTR صحيحة | Responsive tables with correct bidi alignment |
| Field / Input / Select / Textarea | حقول بتسمية وتلميح وخطأ وبصمة وصول | Labelled fields with hint, error, a11y ids |
| Segmented / Tabs | تبديل عرض بدون فقدان الحالة في الرابط | View switcher kept in the URL |
| Modal / Sheet | تفاصيل سريعة مع حبس التركيز وإغلاق Esc | Quick detail with focus trap and Esc |
| Toast | تأكيد إجراء مؤقت، لا يحمل معلومة حرجة | Transient action confirmation, never critical info |
| EmptyState / Skeleton / Alert | حالات فراغ وتحميل وتحذير موحّدة | Unified empty, loading, and alert states |
| LineChart / BarChart / Donut / Ring / Sparkline | رسوم SVG بلا مكتبات خارجية | SVG charts with no external library |

## الإتاحة

_Accessibility_

- تباين النص الأساسي ≥ 7:1 في الفاتح و≥ 4.5:1 في الداكن.
  <br>_Body text contrast ≥ 7:1 light, ≥ 4.5:1 dark._
- كل أيقونة تحمل aria-label إذا كانت الزر الوحيد.
  <br>_Every icon-only button carries an aria-label._
- الرسوم البيانية تحمل role=img ونص بديل يصف البيانات.
  <br>_Charts expose role=img with an alternative data description._
- الأرقام والعدّادات تُقرأ بصيغة صحيحة، والوقت المتبقي لا يعتمد على اللون وحده.
  <br>_Numbers and countdowns read correctly; remaining time never relies on colour alone._
- الجدول الزمني للحوادث يحمل ترتيب DOM مطابقاً للترتيب البصري.
  <br>_Incident timelines keep DOM order matching visual order._

## الوضعان الفاتح والداكن

_Light and dark_

كل الألوان تُستهلك عبر متغيرات CSS (--am-*). التبديل يغيّر مجموعة المتغيرات على الجذر فقط، فتبقى كل المكونات متسقة دون فروع شرطية. الوضع الافتراضي يتبع تفضيل النظام، والاختيار يُحفظ في الكوكيز ويُقرأ على الخادم لمنع وميض الألوان.

> All colours flow through CSS variables (--am-*). Theming swaps the root variable set only, so every component stays consistent without conditionals. Default follows the OS, the choice persists in a cookie and is read server-side to prevent a flash.

---

Source of truth: `lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
