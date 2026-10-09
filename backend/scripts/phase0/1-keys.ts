// Creates the three throwaway devnet keys and asks the devnet faucet for SOL for the one that
// pays fees. Safe to run again: existing keys are kept.
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { connection, loadKeys, web3Keypair } from "./shared";

const keys = loadKeys();
const conn = connection();

for (const role of ["facilitator", "provider", "agent"] as const) {
  console.log(`${role.padEnd(12)} ${web3Keypair(keys[role]).publicKey.toBase58()}`);
}

const facilitator = web3Keypair(keys.facilitator).publicKey;
const balance = await conn.getBalance(facilitator);
console.log(`\nfacilitator balance: ${balance / LAMPORTS_PER_SOL} SOL`);

if (balance < 0.5 * LAMPORTS_PER_SOL) {
  try {
    const signature = await conn.requestAirdrop(facilitator, 2 * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(signature, "confirmed");
    console.log("airdrop ok: 2 SOL");
  } catch (e) {
    console.log(`airdrop failed (${(e as Error).message.slice(0, 100)})`);
    console.log("The public devnet faucet is rate limited. Send devnet SOL to the facilitator address above");
    console.log("at https://faucet.solana.com (choose devnet), then run this script again.");
    process.exitCode = 2;
  }
}
