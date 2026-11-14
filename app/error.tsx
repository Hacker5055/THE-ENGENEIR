"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";

/** Route-level error boundary: a failed page must never strand the user. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the server log; no personal data is attached.
    console.error("route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-danger-500/10 text-danger-500">
          <Icon name="alert" size={20} />
        </span>
        <h1 className="mt-3 text-[17px] font-semibold text-fg">حدث خطأ غير متوقع</h1>
        <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">
          لم تُفقد أي بيانات محفوظة. أعد المحاولة، وإن تكرّر الخطأ فارجع للصفحة السابقة.
        </p>
        {error.digest && <p className="mt-2 font-mono text-[9.5px] text-fg-muted">ref: {error.digest}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={() => reset()} size="sm">إعادة المحاولة</Button>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-lg border border-line-strong px-3.5 text-[12px] font-medium text-fg transition hover:bg-surface-2"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
