import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "زياد الشافعي — البرمجة وعلوم الحاسب",
    short_name: "زياد الشافعي",
    description:
      "البرمجة وعلوم الحاسب للصفوف الثلاثة الثانوية — البكالوريا المصرية: شرح، كتب الوزارة، اختبارات، وحضور موثّق.",
    start_url: "/student",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
