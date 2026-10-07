import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, Transaction, type AccountInfo, type Connection } from "@solana/web3.js";
import { createApp } from "../src/app";
import { sql } from "drizzle-orm";
import { openDatabase, type Database } from "../src/db/client";
import { loadEnv, type Env } from "../src/env";

export const provider = Keypair.generate();
export const treasury = Keypair.generate().publicKey;

export const DOCS_EXAMPLE = {
  usdcPricePerCall: "0.01",
  committedCalls: 150_000,
  migrationThresholdUsdc: 750,
};

export const BUILD_BODY = {
  ...DOCS_EXAMPLE,
  providerPubkey: provider.publicKey.toBase58(),
  name: "Demo API calls",
  symbol: "KUOTA-DEMO",
  uri: "https://example.com/kuota-demo.json",
  endpointUrl: "https://demo-api.example/v1/quote",
  firstBuyUsdc: 1,
};

export interface FakeChain {
  connection: Connection;
  /** Transactions "landed" on the fake chain, keyed by signature. */
  land: (signature: string, base64: string, opts?: { feePayer?: string; failed?: boolean }) => void;
}

/** An initialised classic SPL mint with 6 decimals, in the account layout the token program uses. */
function mintAccount(): AccountInfo<Buffer> {
  const data = Buffer.alloc(82);
  data.writeBigUInt64LE(1_000_000_000_000n, 36); // supply
  data.writeUInt8(6, 44); // decimals
  data.writeUInt8(1, 45); // is initialised
  return { data, executable: false, lamports: 1_461_600, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

/** A Connection with only what the code under test calls. No network. */
export function fakeChain(mints: PublicKey[] = []): FakeChain {
  const landed = new Map<string, unknown>();
  const isMint = (key: PublicKey) => mints.some((m) => m.equals(key));
  const connection = {
    getLatestBlockhash: async () => ({
      blockhash: "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
      lastValidBlockHeight: 1_000,
    }),
    // Token accounts do not exist yet on the fake chain.
    getAccountInfo: async (key: PublicKey) => (isMint(key) ? mintAccount() : null),
    getMultipleAccountsInfo: async (keys: PublicKey[]) => keys.map((k) => (isMint(k) ? mintAccount() : null)),
    getTransaction: async (signature: string) => landed.get(signature) ?? null,
  } as unknown as Connection;

  return {
    connection,
    land(signature, base64, opts = {}) {
      const tx = Transaction.from(Buffer.from(base64, "base64"));
      const keys = tx.compileMessage().accountKeys.map((k) => k.toBase58());
      if (opts.feePayer) keys[0] = opts.feePayer;
      landed.set(signature, {
        meta: { err: opts.failed ? { InstructionError: [0, "Custom"] } : null },
        transaction: {
          message: { getAccountKeys: () => ({ staticAccountKeys: keys.map((k) => new PublicKey(k)) }) },
        },
      });
    },
  };
}

// Opening and migrating PGlite takes a few seconds, so each test file shares one database
// and starts every test from empty tables.
let shared: Promise<Database> | null = null;
async function cleanDatabase(): Promise<Database> {
  shared ??= openDatabase(null);
  const database = await shared;
  await database.db.execute(
    sql`truncate table settlements, burns, snapshots, launches, pending_launches, wallet_labels restart identity cascade`,
  );
  return database;
}

export async function makeApp(overrides: Partial<Env> = {}, makeChain = fakeChain) {
  const env: Env = { ...loadEnv({}), treasury, ...overrides };
  const chain = makeChain([env.usdcMint]);
  const database = await cleanDatabase();
  const app = createApp({ env, db: database.db, connection: chain.connection });

  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.request(path, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: (await res.json()) as any };
  };

  // The database is shared across the file, so closing is a no-op here.
  return { app, call, chain, db: database.db, close: async () => {}, env };
}

/** 88-character strings that pass the signature length check in the confirm schema. */
export const sig = (n: number) => `${n}`.padStart(88, "1");
