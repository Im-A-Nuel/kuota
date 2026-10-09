// Creates the test kuota mint and gives the provider and the agent a token account.
// The agent receives 100 test kuota. Safe to run again.
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection, loadKeys, saveKeys, web3Keypair } from "./shared";

const keys = loadKeys();
const conn = connection();
const facilitator = web3Keypair(keys.facilitator);
const provider = web3Keypair(keys.provider);
const agent = web3Keypair(keys.agent);

const sol = (await conn.getBalance(facilitator.publicKey)) / LAMPORTS_PER_SOL;
if (sol < 0.1) {
  console.error(`The facilitator has ${sol} SOL. Fund ${facilitator.publicKey.toBase58()} on devnet first.`);
  process.exit(2);
}

let mint: PublicKey;
if (keys.mint) {
  mint = new PublicKey(keys.mint);
  console.log(`mint (existing)  ${mint.toBase58()}`);
} else {
  // Classic SPL Token, 6 decimals, like a real kuota (docs/ARCHITECTURE.md).
  mint = await createMint(conn, facilitator, facilitator.publicKey, null, 6, undefined, undefined, TOKEN_PROGRAM_ID);
  keys.mint = mint.toBase58();
  saveKeys(keys);
  console.log(`mint (created)   ${mint.toBase58()}`);
}

// The exact scheme does not create the receiver's token account inside the payment, so the
// provider's account has to exist before the first paid call (docs/SCHEMA.md).
const providerAta = await getOrCreateAssociatedTokenAccount(conn, facilitator, mint, provider.publicKey);
const agentAta = await getOrCreateAssociatedTokenAccount(conn, facilitator, mint, agent.publicKey);
console.log(`provider ATA     ${providerAta.address.toBase58()}`);
console.log(`agent ATA        ${agentAta.address.toBase58()}`);

const agentBalance = (await getAccount(conn, agentAta.address)).amount;
if (agentBalance < 10_000_000n) {
  await mintTo(conn, facilitator, mint, agentAta.address, facilitator, 100_000_000n);
  console.log("minted 100 test kuota to the agent");
}
console.log(`agent balance    ${(await getAccount(conn, agentAta.address)).amount} base units`);
