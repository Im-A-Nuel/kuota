import { PublicKey, clusterApiUrl } from "@solana/web3.js";
import { USDC_MINT } from "@kuota/core";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta"]).default("devnet"),
  SOLANA_RPC: z.string().url().optional(),
  /** Kuota's wallet: the DBC partner that claims platform fees. Public key only. */
  KUOTA_TREASURY: z.string().optional(),
  /** Overrides the default Circle USDC mint of the cluster. */
  USDC_MINT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export interface Env {
  port: number;
  cluster: "devnet" | "mainnet-beta";
  rpcUrl: string;
  treasury: PublicKey | null;
  usdcMint: PublicKey;
  databaseUrl: string | null;
  corsOrigin: string;
}

function key(name: string, value: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${name} is not a valid Solana public key`);
  }
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const raw = schema.parse(source);
  return {
    port: raw.PORT,
    cluster: raw.SOLANA_CLUSTER,
    rpcUrl: raw.SOLANA_RPC ?? clusterApiUrl(raw.SOLANA_CLUSTER),
    treasury: raw.KUOTA_TREASURY ? key("KUOTA_TREASURY", raw.KUOTA_TREASURY) : null,
    usdcMint: key("USDC_MINT", raw.USDC_MINT ?? USDC_MINT[raw.SOLANA_CLUSTER]),
    databaseUrl: raw.DATABASE_URL ?? null,
    corsOrigin: raw.CORS_ORIGIN,
  };
}
