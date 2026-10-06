"use client";

import type { WalletError } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CLUSTER, RPC_ENDPOINT } from "@/lib/config";
import { WalletDialog, type WalletDialogHandle } from "./wallet-dialog";

const WalletDialogContext = createContext<{ open: () => void }>({ open: () => {} });

export function useWalletDialog() {
  return useContext(WalletDialogContext);
}

function describe(error: WalletError): string {
  // Adapters reject with a WalletConnectionError when the user declines in the wallet.
  if (error.name === "WalletConnectionError" || error.name === "WalletWindowClosedError") {
    return "The wallet did not connect. If you declined the request, pick the wallet again to retry.";
  }
  if (error.name === "WalletNotReadyError") {
    return "That wallet is not ready in this browser. Unlock it or reload the page.";
  }
  return error.message || "The wallet reported an error.";
}

export function KuotaWalletProvider({ children }: { children: React.ReactNode }) {
  const dialog = useRef<WalletDialogHandle>(null);
  const [error, setError] = useState<string | null>(null);
  // Only errors from a connection the user started reopen the dialog; a failed silent
  // auto-connect on page load should not pop anything up.
  const userAttempt = useRef(false);

  const open = useCallback(() => {
    setError(null);
    dialog.current?.open();
  }, []);
  const value = useMemo(() => ({ open }), [open]);

  const onAttempt = useCallback(() => {
    userAttempt.current = true;
    setError(null);
  }, []);
  const onConnected = useCallback(() => {
    userAttempt.current = false;
  }, []);

  const onError = useCallback((e: WalletError) => {
    if (!userAttempt.current) return;
    userAttempt.current = false;
    setError(describe(e));
    dialog.current?.open();
  }, []);

  // Wallet Standard wallets (Phantom, Backpack) register themselves, so the list stays empty here.
  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={[]} autoConnect onError={onError}>
        <WalletDialogContext.Provider value={value}>
          {children}
          <WalletDialog
            ref={dialog}
            cluster={CLUSTER}
            error={error}
            onAttempt={onAttempt}
            onConnected={onConnected}
          />
        </WalletDialogContext.Provider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
