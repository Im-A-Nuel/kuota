"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { shortKey } from "@/lib/format";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { WalletIcon } from "./icons";
import { useWalletDialog } from "./wallet-provider";

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
      className={publicKey ? btnSecondary : btnPrimary}
    >
      <WalletIcon />
      {publicKey || connecting ? (
        <span>{label}</span>
      ) : (
        <span>
          Connect<span className="hidden sm:inline"> wallet</span>
        </span>
      )}
    </button>
  );
}
