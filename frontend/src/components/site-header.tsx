import Link from "next/link";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";

export function SiteHeader() {
  return (
    <header className="border-b-[1.5px] border-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <Link
          href="/"
          className="font-display text-3xl font-extrabold leading-none tracking-tight"
          aria-label="Kuota, home"
        >
          kuota
        </Link>
        <div className="order-3 w-full sm:order-2 sm:w-auto">
          <NavLinks />
        </div>
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
