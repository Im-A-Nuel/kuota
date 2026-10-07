"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usingSampleData } from "@/lib/api";
import { SAMPLE_MINT } from "@/lib/mock-data";

// The sample token page only exists while the UI runs on sample data.
const LINKS = [
  { href: "/providers", label: "Providers" },
  ...(usingSampleData ? [{ href: `/k/${SAMPLE_MINT}`, label: "Sample token" }] : []),
  { href: "/launch", label: "Launch a kuota" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="-ml-3 flex items-center md:ml-0">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm transition-colors hover:text-accent ${
              active ? "font-semibold text-accent" : "text-mute"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
