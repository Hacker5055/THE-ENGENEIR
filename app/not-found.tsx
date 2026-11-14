import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export const metadata = { title: "الصفحة غير موجودة" };

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
          <LogoMark size={30} />
        </div>
        <p className="mt-5 font-mono text-[11px] tracking-[0.2em] text-fg-muted">404</p>
        <h1 className="mt-1 text-[22px] font-semibold text-fg">الصفحة غير موجودة</h1>
        <p className="mt-1 text-[12px] text-fg-muted">This page does not exist — or it moved.</p>
        <p className="mx-auto mt-3 max-w-sm text-[11.5px] leading-relaxed text-fg-muted">
          تحقّق من الرابط، أو ارجع إلى لوحتك. إن كنت تبحث عن مستند، فحزمة التسليم كاملة متاحة في صفحة المستندات.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-600">
            الصفحة الرئيسية
          </Link>
          <Link href="/docs" className="inline-flex h-9 items-center rounded-lg border border-line-strong px-4 text-[12px] font-medium text-fg transition hover:bg-surface-2">
            المستندات
          </Link>
          <Link href="/login" className="inline-flex h-9 items-center rounded-lg border border-line-strong px-4 text-[12px] font-medium text-fg transition hover:bg-surface-2">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
