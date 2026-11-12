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
  title: {
    default: "المهندس | AL MOHANDES — إدارة تعليمية ذكية واختبارات آمنة",
    template: "%s · المهندس",
  },
  description:
    "منظومة متكاملة لإدارة المؤسسات التعليمية: الحضور والانصراف، الجداول، الأداء الأكاديمي، واختبارات إلكترونية آمنة متعددة المؤسسات.",
  applicationName: "AL MOHANDES",
  authors: [{ name: "AL MOHANDES Product Team" }],
  keywords: ["إدارة تعليمية", "اختبارات آمنة", "نظام حضور", "EMS", "education management"],
  icons: {
    icon: [{ url: "/brand/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/icon-192.png" }],
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
