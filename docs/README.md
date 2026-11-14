# AL MOHANDES — Delivery documentation

This folder mirrors the in-app documentation (`/docs` on the running platform).
Both are generated from `lib/docs.ts` so they cannot drift apart.

| # | المستند | Document | File |
| --- | --- | --- | --- |
| 01 | [متطلبات المنتج (PRD)](./01-product-requirements.md) | Product requirements | `docs/01-product-requirements.md` |
| 02 | [هندسة المعلومات والتنقّل](./02-information-architecture.md) | Information architecture | `docs/02-information-architecture.md` |
| 03 | [خرائط رحلات المستخدمين](./03-user-journeys.md) | User journeys | `docs/03-user-journeys.md` |
| 04 | [الهوية البصرية](./04-brand-identity.md) | Brand identity | `docs/04-brand-identity.md` |
| 05 | [نظام التصميم](./05-design-system.md) | Design system | `docs/05-design-system.md` |
| 06 | [تصميم قاعدة البيانات](./06-database-schema.md) | Database schema | `docs/06-database-schema.md` |
| 07 | [معمارية الخدمات](./07-backend-architecture.md) | Backend architecture | `docs/07-backend-architecture.md` |
| 08 | [مواصفة الـ API](./08-api-specification.md) | API specification | `docs/08-api-specification.md` |
| 09 | [معمارية الأمان والخصوصية](./09-security-architecture.md) | Security & privacy architecture | `docs/09-security-architecture.md` |
| 10 | [خطة التطوير](./10-roadmap.md) | Roadmap | `docs/10-roadmap.md` |
| 11 | [استراتيجية الاختبار](./11-testing-strategy.md) | Testing strategy | `docs/11-testing-strategy.md` |

## Related artefacts

| Artefact | Path |
| --- | --- |
| PostgreSQL DDL (multi-tenant + exam engine) | [`db/schema.sql`](../db/schema.sql) |
| OpenAPI 3.1 specification | [`openapi.yaml`](../openapi.yaml) |
| Permission matrix (single source) | [`lib/permissions.ts`](../web/lib/permissions.ts) |
| Exam engine (timer, grading, events) | [`lib/server/exam.ts`](../web/lib/server/exam.ts) |

## Regenerating

```bash
npx tsc lib/docs.ts --outDir /tmp/am-docs --module commonjs --target es2020 --skipLibCheck
node scripts/export-docs.mjs /tmp/am-docs/docs.js
```
