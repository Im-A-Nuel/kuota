"use client";

import { useState } from "react";
import { getBurns, getSettlements } from "@/lib/api";
import {
  explorerTx,
  formatCount,
  formatUsdc,
  formatUtc,
  shortKey,
  wholeUnits,
} from "@/lib/format";
import type { BurnItem, Page, SettlementItem } from "@/lib/types";
import { EmptyState, ErrorNote } from "./states";

function usePaged<T>(initial: Page<T>, fetchPage: (cursor: string) => Promise<Page<T>>) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more rows.");
    } finally {
      setLoading(false);
    }
  }

  return { items, hasMore: Boolean(cursor), loading, error, loadMore };
}

function LoadMore({
  label,
  paged,
}: {
  label: string;
  paged: { hasMore: boolean; loading: boolean; error: string | null; loadMore: () => void };
}) {
  if (!paged.hasMore) return null;
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={paged.loadMore}
        disabled={paged.loading}
        className="min-h-11 cursor-pointer rounded-full border border-line-strong px-4 font-semibold transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
      >
        {paged.loading ? "Loading" : label}
      </button>
      {paged.error && <ErrorNote>{paged.error}</ErrorNote>}
    </div>
  );
}

function When({ createdAt, slot }: { createdAt: string | null; slot: number | null }) {
  if (!createdAt) return <span className="text-sm text-mute">sample, no time</span>;
  return (
    <span className="text-sm text-mute">
      <time dateTime={createdAt}>{formatUtc(createdAt)}</time>
      {slot !== null && `, slot ${formatCount(slot)}`}
    </span>
  );
}

function TxLink({ signature }: { signature: string | null }) {
  if (!signature) return <span className="text-sm text-mute">no transaction</span>;
  return (
    <a
      href={explorerTx(signature)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
    >
      {shortKey(signature, 6, 6)}
    </a>
  );
}

export function BurnLedger({ mint, initial }: { mint: string; initial: Page<BurnItem> }) {
  const paged = usePaged(initial, (cursor) => getBurns(mint, cursor));

  if (paged.items.length === 0) {
    return (
      <EmptyState
        title="Nothing burned yet."
        body="The first row appears after the provider receives kuota and the burn worker runs. That takes at most 10 minutes after the first paid call."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-line border-y border-line">
        {paged.items.map((b) => (
          <li
            key={b.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <span className="text-2xl font-light">
              {formatCount(wholeUnits(b.amount))} kuota
            </span>
            <span className="justify-self-end rounded-full bg-teal-wash px-3 py-1 text-xs font-semibold text-teal sm:order-last">Burned</span>
            <When createdAt={b.createdAt} slot={b.slot} />
            <span className="justify-self-end sm:justify-self-auto">
              <TxLink signature={b.signature} />
            </span>
          </li>
        ))}
      </ul>
      <LoadMore label="Load older burns" paged={paged} />
    </>
  );
}

export function PaymentList({ mint, initial }: { mint: string; initial: Page<SettlementItem> }) {
  const paged = usePaged(initial, (cursor) => getSettlements(mint, cursor));

  if (paged.items.length === 0) {
    return (
      <EmptyState
        title="No calls paid yet."
        body="Payments show up here once an agent pays this endpoint with kuota or USDC."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-line border-y border-line">
        {paged.items.map((s) => (
          <li
            key={s.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[8rem_1fr_auto_auto]"
          >
            <span className="font-semibold">
              {s.asset === "kuota"
                ? `${formatCount(wholeUnits(s.amount))} kuota`
                : `${formatUsdc(Number(s.amount) / 1_000_000)} USDC`}
            </span>
            <span className="justify-self-end text-sm text-mute sm:order-2 sm:justify-self-auto">
              {s.payer ? shortKey(s.payer) : "sample wallet"}
              {s.isTeam && ", team"}
            </span>
            <span className="sm:order-3">
              <When createdAt={s.createdAt} slot={null} />
            </span>
            <span className="justify-self-end sm:order-4">
              <TxLink signature={s.signature} />
            </span>
          </li>
        ))}
      </ul>
      <LoadMore label="Load older payments" paged={paged} />
    </>
  );
}
