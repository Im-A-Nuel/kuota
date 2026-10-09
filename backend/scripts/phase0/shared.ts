import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";
import { Connection, Keypair } from "@solana/web3.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Phase 0 runs on devnet only. Keys live in backend/.keys, which is gitignored, and are
// throwaway devnet keys: never put a key that ever held real funds in this file.
// A local .env (gitignored) can set SOLANA_RPC to a dedicated devnet endpoint. The public one
// rate limits hard enough to fail settlements (see docs/PHASE0.md).
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // No .env file: use the defaults.
}

export const NETWORK = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;
export const RPC_URL = process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";
export const KEYS_FILE = fileURLToPath(new URL("../../.keys/phase0.json", import.meta.url));

export interface Phase0Keys {
  /** Pays network fees for every x402 payment, as the facilitator. Also creates the test mint. */
  facilitator: number[];
  /** The API provider that receives payments. */
  provider: number[];
  /** The agent that pays. */
  agent: number[];
  /** Set by setup. */
  mint?: string;
}

export function loadKeys(): Phase0Keys {
  if (!existsSync(KEYS_FILE)) {
    const fresh: Phase0Keys = {
      facilitator: [...Keypair.generate().secretKey],
      provider: [...Keypair.generate().secretKey],
      agent: [...Keypair.generate().secretKey],
    };
    mkdirSync(fileURLToPath(new URL("../../.keys", import.meta.url)), { recursive: true });
    writeFileSync(KEYS_FILE, JSON.stringify(fresh));
    return fresh;
  }
  return JSON.parse(readFileSync(KEYS_FILE, "utf8"));
}

export function saveKeys(keys: Phase0Keys) {
  writeFileSync(KEYS_FILE, JSON.stringify(keys));
}

export const web3Keypair = (secret: number[]) => Keypair.fromSecretKey(Uint8Array.from(secret));
export const kitSigner = (secret: number[]): Promise<KeyPairSigner> =>
  createKeyPairSignerFromBytes(Uint8Array.from(secret));
export const connection = () => new Connection(RPC_URL, "confirmed");

export const explorer = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
