import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "المهندس · AL MOHANDES",
    short_name: "المهندس",
    description:
      "منصة إدارة تعليمية ثنائية اللغة: حضور، مقررات، درجات، واختبارات إلكترونية بمحرّك آمن.",
    start_url: "/student",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1424",
    theme_color: "#101B2D",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
