"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { shortKey } from "@/lib/format";
import { useWalletDialog } from "./wallet-provider";

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19v3M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="13.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function WalletButton() {
  const { open } = useWalletDialog();
  const { publicKey, connecting } = useWallet();

  const label = publicKey
    ? shortKey(publicKey.toBase58())
    : connecting
      ? "Connecting"
      : "Connect wallet";

  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-ink px-3 text-sm font-semibold hover:bg-ink hover:text-paper"
    >
      <WalletIcon />
      <span>{label}</span>
    </button>
  );
}
