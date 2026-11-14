import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export function CardLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "group relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition duration-200",
        "hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg",
        className,
      )}
    >
      {children}
    </Link>
  );
}
