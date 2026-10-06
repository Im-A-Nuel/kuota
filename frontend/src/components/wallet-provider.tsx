"use client";

import { clusterApiUrl } from "@solana/web3.js";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { WalletDialog, type WalletDialogHandle } from "./wallet-dialog";

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta" ? "mainnet-beta" : "devnet";
const ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl(CLUSTER);

const WalletDialogContext = createContext<{ open: () => void }>({ open: () => {} });

export function useWalletDialog() {
  return useContext(WalletDialogContext);
}

export function KuotaWalletProvider({ children }: { children: React.ReactNode }) {
  const dialog = useRef<WalletDialogHandle>(null);
  const open = useCallback(() => dialog.current?.open(), []);
  const value = useMemo(() => ({ open }), [open]);

  // Wallet Standard wallets (Phantom, Backpack) register themselves, so the list stays empty here.
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletDialogContext.Provider value={value}>
          {children}
          <WalletDialog ref={dialog} cluster={CLUSTER} />
        </WalletDialogContext.Provider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
