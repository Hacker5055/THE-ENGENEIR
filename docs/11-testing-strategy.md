# 11. استراتيجية الاختبار

**Testing strategy** · _updated 2026-11-10_

طبقات الاختبار، السيناريوهات الحرجة، ومعايير الجودة.

> Test layers, critical scenarios, and quality gates.

---

## الهرم

_The pyramid_

| الطبقة / Layer | الأدوات / Tools | التغطية المستهدفة / Target |
| --- | --- | --- |
| وحدات | Unit | Vitest — منطق المؤقّت، التصحيح، العدّادات | 90% لمسارات exam.ts وpermissions |
| تكامل | Integration | Vitest + قاعدة اختبار حقيقية | كل نقطة API ونقل حالة |
| واجهة | Component | Testing Library | النماذج، الفلاتر، حالات الفراغ والخطأ |
| رحلات | E2E | Playwright (جوال + سطح مكتب، RTL + LTR) | 6 رحلات حرجة على الأقل |
| إتاحة | A11y | axe-core في CI | صفر انتهاكات حرجة |
| أداء | Perf | Lighthouse CI | LCP < 1.8s · CLS < 0.05 |

## السيناريوهات الحرجة

_Critical scenarios_

1. بدء اختبار ثم قطع الشبكة 30 ثانية: الإجابات المحفوظة تبقى، والمؤقّت لا يتوقف.
   <br>_Start an exam, drop the network for 30 s: saved answers survive and the timer does not pause._
2. محاولة حفظ إجابة أقدم (revision أقل) → 409 دون فقدان النسخة الأحدث.
   <br>_Save with a lower revision → 409 without clobbering the newer copy._
3. تجاوز حد الحوادث → تجميد فوري + إشعار مراقب + منع التسليم.
   <br>_Cross the violation cap → immediate freeze, supervisor notification, submission blocked._
4. قرار استئناف يمنح 5 دقائق → المؤقّت يتقدم ويظهر للطالب فوراً.
   <br>_Resume decision grants 5 minutes → timer advances and the student sees it._
5. مسح رمز حضور بعد انتهاء صلاحيته → رفض صريح مع سبب وإرشاد.
   <br>_Scan an expired attendance token → explicit rejection with cause and guidance._
6. طالب في قسم آخر يحاول الوصول لمقرر ليس له → 403 مع تدقيق.
   <br>_A student from another department tries an unrelated course → 403 and an audit entry._
7. معلم يعدّل حضور طالب في مقرر غيره → رفض على الخادم.
   <br>_A teacher overrides attendance in someone else's course → server rejects._
8. تسليم تلقائي عند انتهاء الوقت مع حفظ آخر نسخة.
   <br>_Auto-submit on expiry preserving the last saved answer._

## مصفوفة الأجهزة

_Device matrix_

- جوال: iPhone SE (375×667)، iPhone 15 (393×852)، Galaxy A54 (412×915).
  <br>_Mobile: iPhone SE 375×667, iPhone 15 393×852, Galaxy A54 412×915._
- أجهزة لوحية: iPad 10.2 (810×1080) في الوضعين الأفقي والعمودي.
  <br>_Tablet: iPad 10.2 810×1080, portrait and landscape._
- سطح مكتب: 1280، 1440، 1920، 2560 — مع تكبير 200%.
  <br>_Desktop: 1280, 1440, 1920, 2560 — including 200% zoom._
- كلا الوضعين (فاتح/داكن) وكلا الاتجاهين (RTL/LTR) في كل مقاس.
  <br>_Both themes and both directions at every breakpoint._

## بوابات الجودة

_Quality gates_

- لا دمج دون نجاح الأنواع (tsc --noEmit) والبناء (next build).
  <br>_No merge without a clean typecheck (tsc --noEmit) and build (next build)._
- لا دمج دون اختبار E2E للرحلة المتأثرة على الأقل.
  <br>_No merge without an E2E run of at least the affected journey._
- أي تغيير في exam.ts أو permissions.ts يتطلب مراجعة ثانية إلزامية.
  <br>_Any change to exam.ts or permissions.ts requires a mandatory second review._
- تدقيق إتاحة في CI؛ انتهاك حرج يمنع الدمج.
  <br>_Accessibility audit in CI; a critical violation blocks the merge._

## اختبار القبول النهائي

_Final acceptance_

تُقبل النسخة عندما يستطيع طالب حقيقي الدخول، تأكيد الحضور، اجتياز اختبار، رؤية نتيجته؛ ومعلم حقيقي فتح جلسة، إنشاء اختبار من البنك، تصحيح مقالي، نشر درجات؛ ومراقب اتخاذ قرار موثّق في حادثة — كل ذلك دون أي بيانات ثابتة في الواجهة، ومع تدقيق كامل لكل خطوة.

> A release is accepted when a real student can sign in, check in, sit an exam and see the result; a real teacher can open a session, build an exam from the bank, grade an essay and publish; and a supervisor can issue one documented incident decision — all with no hard-coded UI data and a full audit of every step.

---

Source of truth: `lib/docs.ts`. Edit there, then re-run `node scripts/export-docs.mjs`.
