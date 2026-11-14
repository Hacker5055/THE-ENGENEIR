import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";
import { PreferencesProvider, ToastProvider } from "@/components/providers";
import { getPrefs } from "@/lib/prefs";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ziadelshafei.com"),
  title: {
    default: "زياد الشافعي — البرمجة وعلوم الحاسب | البكالوريا المصرية",
    template: "%s · زياد الشافعي",
  },
  description:
    "منصة مستر زياد الشافعي لتدريس البرمجة وعلوم الحاسب للصفوف الثلاثة الثانوية — نظام البكالوريا المصرية: شرح، كتب الوزارة، اختبارات إلكترونية، وحضور موثّق.",
  applicationName: "ZIAD EL-SHAFEI",
  authors: [{ name: "Ziad El-Shafei" }],
  keywords: ["البرمجة", "علوم الحاسب", "البكالوريا المصرية", "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي", "programming", "computer science"],
  icons: {
    icon: [{ url: "/brand/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/icon-192.png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "ZIAD EL-SHAFEI · زياد الشافعي",
    title: "زياد الشافعي — البرمجة وعلوم الحاسب | البكالوريا المصرية",
    description:
      "شرح المنهج، كتب وزارة التربية والتعليم، اختبارات إلكترونية، ومتابعة الحضور والدرجات لطلاب الثانوية العامة والبكالوريا.",
    locale: "ar_SA",
    alternateLocale: ["en_US"],
    images: [{ url: "/brand/logo-sheet.png", width: 1520, height: 600, alt: "ZIAD EL-SHAFEI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "زياد الشافعي | ZIAD EL-SHAFEI",
    description: "البرمجة وعلوم الحاسب مع مستر زياد الشافعي — البكالوريا المصرية.",
    images: ["/brand/logo-sheet.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#101B2D" },
    { media: "(prefers-color-scheme: light)", color: "#F3F6FA" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, theme } = await getPrefs();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={theme} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <PreferencesProvider initialLocale={locale} initialTheme={theme}>
          <ToastProvider>{children}</ToastProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
