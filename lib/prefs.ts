"use server";

import { cookies } from "next/headers";
import type { Locale, Theme } from "@/lib/types";

export async function getPrefs(): Promise<{ locale: Locale; theme: Theme }> {
  const jar = await cookies();
  const locale = (jar.get("am_lang")?.value as Locale) === "en" ? "en" : "ar";
  const theme = (jar.get("am_theme")?.value as Theme) === "light" ? "light" : "dark";
  return { locale, theme };
}

export async function setPrefs(locale: Locale, theme: Theme) {
  const jar = await cookies();
  jar.set("am_lang", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  jar.set("am_theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
