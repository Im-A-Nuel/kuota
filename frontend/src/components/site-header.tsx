import Link from "next/link";
import { CLUSTER_LABEL } from "@/lib/config";
import { chip } from "@/lib/ui";
import { LogoMark } from "./icons";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";

// Mainnet proof is the point of the demo, so the active network is always visible.
function NetworkLabel({ className = "" }: { className?: string }) {
  return (
    <span
      className={`${chip} ${className} min-h-8 text-mute`}
      title="Solana network this app reads from and sends transactions to"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-teal" />
      {CLUSTER_LABEL}
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 md:gap-x-6 px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xl font-semibold tracking-tight" aria-label="Kuota, home">
          <LogoMark />
          <span aria-hidden="true">kuota</span>
        </Link>
        <div className="order-3 w-full md:order-2 md:w-auto">
          <NavLinks />
        </div>
        <div className="order-2 flex items-center gap-2 md:order-3">
          <NetworkLabel className="inline-flex" />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
