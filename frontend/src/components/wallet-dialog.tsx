"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { shortKey } from "@/lib/format";
import { ErrorNote } from "./states";

export interface WalletDialogHandle {
  open: () => void;
}

interface Props {
  cluster: string;
  error: string | null;
  onAttempt: () => void;
  onConnected: () => void;
}

export const WalletDialog = forwardRef<WalletDialogHandle, Props>(function WalletDialog(
  { cluster, error, onAttempt, onConnected },
  ref,
) {
  const el = useRef<HTMLDialogElement>(null);
  const closeOnConnect = useRef(false);
  const { wallets, select, connect, disconnect, publicKey, connecting, wallet } = useWallet();

  useImperativeHandle(ref, () => ({
    open: () => {
      if (!el.current?.open) el.current?.showModal();
    },
  }));

  // Stay open while the wallet asks for approval, then close once it is connected.
  useEffect(() => {
    if (publicKey && closeOnConnect.current) {
      closeOnConnect.current = false;
      onConnected();
      el.current?.close();
    }
  }, [publicKey, onConnected]);

  const detected = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable,
  );

  async function onDisconnect() {
    await disconnect().catch(() => undefined);
    el.current?.close();
  }

  return (
    <dialog
      ref={el}
      aria-labelledby="wallet-dialog-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-panel border-[1.5px] border-ink bg-card p-0 text-ink"
      onClick={(e) => {
        if (e.target === el.current) el.current?.close();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-rule p-5">
        <div>
          <h2 id="wallet-dialog-title" className="text-2xl font-bold">
            {publicKey ? "Wallet connected" : "Connect a wallet"}
          </h2>
          <p className="mt-1 text-sm text-mute">Network: Solana {cluster}</p>
        </div>
        <button
          type="button"
          onClick={() => el.current?.close()}
          className="min-h-11 min-w-11 cursor-pointer rounded-control border border-rule px-3 text-sm font-semibold hover:border-ink"
        >
          Close
        </button>
      </div>

      <div className="space-y-4 p-5">
        {publicKey ? (
          <>
            <p className="text-sm text-mute">{wallet?.adapter.name ?? "Wallet"}</p>
            <p className="break-all font-semibold" title={publicKey.toBase58()}>
              {shortKey(publicKey.toBase58(), 6, 6)}
            </p>
            <button
              type="button"
              onClick={onDisconnect}
              className="min-h-11 w-full cursor-pointer rounded-control border-[1.5px] border-ink px-4 font-semibold hover:bg-ink hover:text-paper"
            >
              Disconnect
            </button>
          </>
        ) : connecting ? (
          <p role="status" className="font-semibold">
            Connecting to {wallet?.adapter.name ?? "your wallet"}. Approve the request in the
            wallet window.
          </p>
        ) : detected.length > 0 ? (
          <ul className="space-y-2">
            {detected.map((w) => (
              <li key={w.adapter.name}>
                <button
                  type="button"
                  onClick={() => {
                    onAttempt();
                    closeOnConnect.current = true;
                    // Re-picking the wallet that just failed does not trigger auto-connect again.
                    if (wallet?.adapter.name === w.adapter.name) {
                      connect().catch(() => undefined);
                    } else {
                      select(w.adapter.name);
                    }
                  }}
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-control border-[1.5px] border-ink px-4 text-left font-semibold hover:bg-ink hover:text-paper"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.adapter.icon} alt="" width={24} height={24} />
                  {w.adapter.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">No Solana wallet found in this browser.</p>
            <p className="text-mute">
              Install one, then reload this page. Kuota never sees your keys.
            </p>
            <ul className="space-y-1 font-semibold underline underline-offset-4">
              <li>
                <a href="https://phantom.com/download" target="_blank" rel="noreferrer">
                  Get Phantom
                </a>
              </li>
              <li>
                <a href="https://backpack.app/download" target="_blank" rel="noreferrer">
                  Get Backpack
                </a>
              </li>
            </ul>
          </div>
        )}
        {error && !connecting && <ErrorNote>{error}</ErrorNote>}
      </div>
    </dialog>
  );
});
