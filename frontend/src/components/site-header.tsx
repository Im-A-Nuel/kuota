import Link from "next/link";
import { CLUSTER_LABEL } from "@/lib/config";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";

// Mainnet proof is the point of the demo, so the active network is always visible.
function NetworkLabel({ className }: { className: string }) {
  return (
    <span
      className={`${className} min-h-9 items-center rounded-control border-[1.5px] border-dashed border-ink px-2.5 text-sm font-semibold`}
      title="Solana network this app reads from and sends transactions to"
    >
      {CLUSTER_LABEL}
    </span>
  );
}

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
        <div className="order-3 flex w-full items-center justify-between sm:order-2 sm:w-auto">
          <NavLinks />
          <NetworkLabel className="inline-flex sm:hidden" />
        </div>
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <NetworkLabel className="hidden sm:inline-flex" />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
