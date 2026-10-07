import { and, eq, gt } from "drizzle-orm";
import { PublicKey, type Connection } from "@solana/web3.js";
import { BASE_UNIT } from "@kuota/core";
import type { Db } from "../db/client";
import { launches, pendingLaunches } from "../db/schema";
import { ApiError } from "../errors";
import type { BuiltLaunch } from "./launch-builder";

/** How long a built launch stays confirmable. A blockhash is only valid for about 90 seconds. */
export const PENDING_TTL_MS = 30 * 60 * 1000;

export async function savePending(db: Db, built: BuiltLaunch, now = new Date()): Promise<void> {
  await db
    .insert(pendingLaunches)
    .values({
      mint: built.mint,
      config: built.config,
      pool: built.pool,
      providerPubkey: built.input.providerPubkey,
      payload: built.input,
      expiresAt: new Date(now.getTime() + PENDING_TTL_MS),
    })
    .onConflictDoNothing();
}

function accountKeys(tx: Awaited<ReturnType<Connection["getTransaction"]>>): string[] {
  if (!tx) return [];
  return tx.transaction.message.getAccountKeys().staticAccountKeys.map((k) => k.toBase58());
}

/**
 * Records a launch once both transactions are on-chain (FR-02). It checks the chain against
 * what /launch/build produced: both succeeded, the provider paid, and the config, mint and
 * pool accounts appear in the right transactions. Calling it twice returns the same id.
 */
export async function confirmLaunch(
  deps: { db: Db; connection: Connection },
  body: { mint: string; signatures: [string, string] },
  now = new Date(),
): Promise<{ launchId: string }> {
  try {
    new PublicKey(body.mint);
  } catch {
    throw new ApiError("INVALID_PARAMS", "mint is not a valid public key", { field: "mint" });
  }

  const existing = await deps.db.select({ id: launches.id }).from(launches).where(eq(launches.mint, body.mint)).limit(1);
  if (existing[0]) return { launchId: existing[0].id };

  const pendingRows = await deps.db
    .select()
    .from(pendingLaunches)
    .where(and(eq(pendingLaunches.mint, body.mint), gt(pendingLaunches.expiresAt, now)))
    .limit(1);
  const pending = pendingRows[0];
  if (!pending) {
    throw new ApiError("NOT_FOUND", "No pending launch for this mint. Build it first, or it expired.", {
      mint: body.mint,
    });
  }

  let txs;
  try {
    txs = await Promise.all(
      body.signatures.map((signature) =>
        deps.connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
      ),
    );
  } catch (e) {
    throw new ApiError("RPC_ERROR", `Could not read the transactions: ${(e as Error).message}`);
  }

  const missing = body.signatures.filter((_, i) => !txs[i]);
  if (missing.length) {
    throw new ApiError("TX_NOT_FOUND", "A transaction is not confirmed yet or does not exist.", { signatures: missing });
  }

  const [createConfig, createPool] = txs;
  const mismatch = (message: string) => new ApiError("MISMATCH", message, { mint: body.mint });

  if (createConfig!.meta?.err || createPool!.meta?.err) throw mismatch("A launch transaction failed on-chain.");
  const configKeys = accountKeys(createConfig);
  const poolKeys = accountKeys(createPool);
  if (configKeys[0] !== pending.providerPubkey || poolKeys[0] !== pending.providerPubkey)
    throw mismatch("The fee payer is not the provider wallet this launch was built for.");
  if (!configKeys.includes(pending.config)) throw mismatch("The first transaction does not create the expected config.");
  if (!poolKeys.includes(body.mint) || !poolKeys.includes(pending.pool))
    throw mismatch("The second transaction does not create the expected mint and pool.");

  const input = pending.payload as import("./launch-builder").BuildLaunchInput;
  const inserted = await deps.db
    .insert(launches)
    .values({
      mint: pending.mint,
      config: pending.config,
      pool: pending.pool,
      providerPubkey: pending.providerPubkey,
      name: input.name,
      symbol: input.symbol,
      endpointUrl: input.endpointUrl,
      usdcPrice: BigInt(Math.round(Number(input.usdcPricePerCall) * BASE_UNIT)),
      committedCalls: BigInt(input.committedCalls),
      migrationThreshold: BigInt(Math.round(input.migrationThresholdUsdc * BASE_UNIT)),
      migrationFeeBps: Math.round((input.migrationFeePercent ?? 30) * 100),
    })
    .onConflictDoNothing()
    .returning({ id: launches.id });

  await deps.db.delete(pendingLaunches).where(eq(pendingLaunches.mint, pending.mint));

  if (inserted[0]) return { launchId: inserted[0].id };
  // Lost a race with a parallel confirm: read the row that won.
  const row = await deps.db.select({ id: launches.id }).from(launches).where(eq(launches.mint, body.mint)).limit(1);
  return { launchId: row[0].id };
}
