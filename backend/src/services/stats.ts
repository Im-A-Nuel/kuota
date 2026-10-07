import { and, count, desc, eq, lt, or, sql } from "drizzle-orm";
import { BASE_UNIT, START_PRICE_BPS } from "@kuota/core";
import type { Db } from "../db/client";
import { burns, launches, settlements, snapshots, walletLabels } from "../db/schema";

const PAGE_SIZE = 20;

const units = (value: bigint) => (Number(value) / BASE_UNIT).toString();

export interface KuotaStats {
  mint: string;
  name: string;
  symbol: string;
  status: "curve" | "graduated";
  priceKuotaUsdc: string;
  usdcPrice: string;
  discountBps: number;
  curveProgressBps: number;
  committedCalls: number;
  holders: number;
  burned: string;
  callsPaid: number;
  endpointUrl: string;
  dammPool: string | null;
}

type Launch = typeof launches.$inferSelect;

async function statsFor(db: Db, launch: Launch): Promise<KuotaStats> {
  const [snapshot] = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.launchId, launch.id))
    .orderBy(desc(snapshots.takenAt))
    .limit(1);
  const [burned] = await db
    .select({ total: sql<string>`coalesce(sum(${burns.amount}), 0)::text` })
    .from(burns)
    .where(eq(burns.launchId, launch.id));
  const [paid] = await db
    .select({ n: count() })
    .from(settlements)
    .where(and(eq(settlements.launchId, launch.id), eq(settlements.asset, "kuota")));

  // Before the first snapshot the curve sits at its opening price with nothing sold.
  const opening = (launch.usdcPrice * BigInt(START_PRICE_BPS)) / 10_000n;
  const priceBase = snapshot?.priceKuota ?? opening;

  return {
    mint: launch.mint,
    name: launch.name,
    symbol: launch.symbol,
    status: launch.status as "curve" | "graduated",
    priceKuotaUsdc: units(priceBase),
    usdcPrice: units(launch.usdcPrice),
    discountBps: snapshot?.discountBps ?? 10_000 - START_PRICE_BPS,
    curveProgressBps: snapshot?.curveProgressBps ?? 0,
    committedCalls: Number(launch.committedCalls),
    holders: snapshot?.holders ?? 0,
    burned: burned?.total ?? "0",
    callsPaid: paid?.n ?? 0,
    endpointUrl: launch.endpointUrl,
    dammPool: launch.dammPool,
  };
}

export async function getKuotaStats(db: Db, mint: string): Promise<KuotaStats | null> {
  const [launch] = await db.select().from(launches).where(eq(launches.mint, mint)).limit(1);
  return launch ? statsFor(db, launch) : null;
}

export async function listProviders(db: Db) {
  const rows = await db.select().from(launches).orderBy(desc(launches.createdAt)).limit(100);
  const items = await Promise.all(rows.map((row) => statsFor(db, row)));
  return {
    items: items.map((s) => ({
      mint: s.mint,
      name: s.name,
      symbol: s.symbol,
      endpointUrl: s.endpointUrl,
      status: s.status,
      usdcPrice: s.usdcPrice,
      discountBps: s.discountBps,
      curveProgressBps: s.curveProgressBps,
    })),
  };
}

/** Cursors carry the last row's time and id, so paging stays stable while new rows arrive. */
function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const [iso, id] = Buffer.from(cursor, "base64url").toString().split("|");
    const at = new Date(iso);
    return Number.isNaN(at.getTime()) || !id ? null : { at, id };
  } catch {
    return null;
  }
}

export async function launchIdFor(db: Db, mint: string): Promise<string | null> {
  const [row] = await db.select({ id: launches.id }).from(launches).where(eq(launches.mint, mint)).limit(1);
  return row?.id ?? null;
}

export async function listBurns(db: Db, launchId: string, cursor?: string) {
  const after = decodeCursor(cursor);
  const rows = await db
    .select()
    .from(burns)
    .where(
      and(
        eq(burns.launchId, launchId),
        after ? or(lt(burns.createdAt, after.at), and(eq(burns.createdAt, after.at), lt(burns.id, after.id))) : undefined,
      ),
    )
    .orderBy(desc(burns.createdAt), desc(burns.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  return {
    items: page.map((r) => ({
      id: r.id,
      signature: r.signature,
      amount: r.amount.toString(),
      slot: Number(r.slot),
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1].id) : null,
  };
}

export async function listSettlements(db: Db, launchId: string, cursor?: string) {
  const after = decodeCursor(cursor);
  const rows = await db
    .select({ s: settlements, isTeam: walletLabels.isTeam })
    .from(settlements)
    .leftJoin(walletLabels, eq(walletLabels.pubkey, settlements.payer))
    .where(
      and(
        eq(settlements.launchId, launchId),
        after
          ? or(lt(settlements.createdAt, after.at), and(eq(settlements.createdAt, after.at), lt(settlements.id, after.id)))
          : undefined,
      ),
    )
    .orderBy(desc(settlements.createdAt), desc(settlements.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  return {
    items: page.map(({ s, isTeam }) => ({
      id: s.id,
      signature: s.signature,
      payer: s.payer,
      asset: s.asset as "kuota" | "usdc",
      amount: s.amount.toString(),
      isTeam: isTeam ?? false,
      createdAt: s.createdAt.toISOString(),
    })),
    nextCursor: rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1].s.createdAt, page[page.length - 1].s.id) : null,
  };
}
