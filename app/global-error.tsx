"use client";

/** Last-resort boundary: the root layout itself failed. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#F3F6FA", color: "#101B2D", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>تعذّر تحميل المنصة</div>
            <p style={{ fontSize: 12, lineHeight: 1.8, color: "#5A6B80", marginTop: 8 }}>
              حدث خطأ في التحميل الأساسي. أعد المحاولة — البيانات المحفوظة على الخادم لم تتأثر.
            </p>
            {error.digest && <p style={{ fontFamily: "monospace", fontSize: 10, color: "#78879B" }}>ref: {error.digest}</p>}
            <button
              onClick={() => reset()}
              style={{ marginTop: 16, height: 40, paddingInline: 20, borderRadius: 10, border: 0, background: "#2864D9", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
