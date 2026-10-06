"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { shortKey } from "@/lib/format";

export interface WalletDialogHandle {
  open: () => void;
}

export const WalletDialog = forwardRef<WalletDialogHandle, { cluster: string }>(
  function WalletDialog({ cluster }, ref) {
    const el = useRef<HTMLDialogElement>(null);
    const { wallets, select, disconnect, publicKey, connecting, wallet } = useWallet();
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        setError(null);
        el.current?.showModal();
      },
    }));

    const detected = wallets.filter(
      (w) =>
        w.readyState === WalletReadyState.Installed ||
        w.readyState === WalletReadyState.Loadable,
    );

    async function onDisconnect() {
      try {
        await disconnect();
        el.current?.close();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not disconnect.");
      }
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

        <div className="p-5">
          {publicKey ? (
            <div className="space-y-4">
              <p className="text-sm text-mute">
                {wallet?.adapter.name ?? "Wallet"}
              </p>
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
            </div>
          ) : detected.length > 0 ? (
            <ul className="space-y-2">
              {detected.map((w) => (
                <li key={w.adapter.name}>
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => {
                      setError(null);
                      select(w.adapter.name);
                      el.current?.close();
                    }}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-control border-[1.5px] border-ink px-4 text-left font-semibold hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60"
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
          {error && (
            <p role="alert" className="mt-4 text-sm font-semibold text-accent-text">
              {error}
            </p>
          )}
        </div>
      </dialog>
    );
  },
);
