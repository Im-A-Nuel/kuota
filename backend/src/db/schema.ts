import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  jsonb,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Mirrors docs/SCHEMA.md. Token amounts are bigint base units (6 decimals), handled as bigint
// in TypeScript so nothing rounds through a double.
const amount = (name: string) => bigint(name, { mode: "bigint" });

export const launches = pgTable(
  "launches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mint: text("mint").notNull().unique(),
    config: text("config").notNull(),
    pool: text("pool").notNull(),
    dammPool: text("damm_pool"),
    providerPubkey: text("provider_pubkey").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    endpointUrl: text("endpoint_url").notNull(),
    usdcPrice: amount("usdc_price").notNull(),
    committedCalls: amount("committed_calls").notNull(),
    migrationThreshold: amount("migration_threshold").notNull(),
    migrationFeeBps: integer("migration_fee_bps").notNull(),
    status: text("status").notNull().default("curve"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    graduatedAt: timestamp("graduated_at", { withTimezone: true }),
  },
  (t) => [check("launches_status_check", sql`${t.status} in ('curve','graduated')`)],
);

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signature: text("signature").notNull().unique(),
    launchId: uuid("launch_id")
      .notNull()
      .references(() => launches.id),
    payer: text("payer").notNull(),
    asset: text("asset").notNull(),
    amount: amount("amount").notNull(),
    source: text("source").notNull(),
    slot: amount("slot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("settlements_asset_check", sql`${t.asset} in ('kuota','usdc')`),
    check("settlements_source_check", sql`${t.source} in ('chain','middleware')`),
    index("settlements_launch_idx").on(t.launchId, t.createdAt),
  ],
);

export const burns = pgTable(
  "burns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signature: text("signature").notNull().unique(),
    launchId: uuid("launch_id")
      .notNull()
      .references(() => launches.id),
    amount: amount("amount").notNull(),
    slot: amount("slot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("burns_launch_idx").on(t.launchId, t.createdAt)],
);

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    launchId: uuid("launch_id")
      .notNull()
      .references(() => launches.id),
    priceKuota: amount("price_kuota").notNull(),
    discountBps: integer("discount_bps").notNull(),
    curveProgressBps: integer("curve_progress_bps").notNull(),
    holders: integer("holders").notNull(),
    burned: amount("burned").notNull(),
    callsPaid: amount("calls_paid").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("snapshots_launch_idx").on(t.launchId, t.takenAt)],
);

export const walletLabels = pgTable("wallet_labels", {
  pubkey: text("pubkey").primaryKey(),
  label: text("label").notNull(),
  isTeam: boolean("is_team").notNull(),
});

/**
 * Launches that were built but not yet confirmed on-chain. Holds what /launch/confirm needs to
 * verify the transactions. Not part of docs/SCHEMA.md; rows are deleted on confirm or expiry.
 */
export const pendingLaunches = pgTable("pending_launches", {
  mint: text("mint").primaryKey(),
  config: text("config").notNull(),
  pool: text("pool").notNull(),
  providerPubkey: text("provider_pubkey").notNull(),
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
