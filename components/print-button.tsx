"use client";

import { Button } from "@/components/ui";
import { usePrefs } from "@/components/providers";

export function PrintButton({ label = "طباعة / PDF", size = "md" }: { label?: string; size?: "sm" | "md" }) {
  const { l } = usePrefs();
  return (
    <Button size={size} variant="secondary" icon="printer" onClick={() => window.print()}>
      {l(label, "Print / PDF")}
    </Button>
  );
}
