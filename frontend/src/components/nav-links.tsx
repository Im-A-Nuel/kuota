"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/providers", label: "Providers" },
  { href: "/launch", label: "Launch a kuota" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold underline-offset-8 hover:underline ${
              active ? "underline decoration-[3px] decoration-ink" : ""
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
