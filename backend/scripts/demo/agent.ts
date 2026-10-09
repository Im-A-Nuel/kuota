// FR-10: an agent that calls a paid API through kuotaFetch and prints what it cost compared
// with paying USDC for every call.
//
// Everything runs in this process on devnet: our facilitator, the demo API, and the agent.
// Setup first: scripts/phase0/1-keys.ts and 2-setup.ts (devnet SOL, test mint, test kuota).
//
//   pnpm exec tsx scripts/demo/agent.ts [calls] [kuotaPriceUsdc]
import { createKuotaFetch, toBaseUnits, type PaymentDecision } from "kuota-fetch";
import { SOLANA_DEVNET } from "@kuota/x402";
import { createDemoApi } from "../../src/demo-api";
import { createFacilitatorApp } from "../../src/facilitator";
import { explorer, kitSigner, loadKeys, RPC_URL, web3Keypair } from "../phase0/shared";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Server } from "node:http";
import type express from "express";

const calls = Number(process.argv[2] ?? 5);
// Stand-in for the curve price until the demo kuota is launched on the curve: 0.0061 USDC.
const marketPrice = toBaseUnits(process.argv[3] ?? "0.0061");
const delayMs = Number(process.argv[4] ?? 4000);

const keys = loadKeys();
if (!keys.mint) throw new Error("Run scripts/phase0/2-setup.ts first.");
const MINT = keys.mint;
const USDC_PRICE = "0.01";

const listen = (app: express.Express) =>
  new Promise<{ server: Server; url: string }>((resolve) => {
    const server = app.listen(0, () => resolve({ server, url: `http://127.0.0.1:${(server.address() as { port: number }).port}` }));
  });

const facilitator = await listen(
  createFacilitatorApp({ feePayer: await kitSigner(keys.facilitator), rpcUrl: RPC_URL, network: SOLANA_DEVNET }),
);

const settled: { signature: string; asset: string }[] = [];
const api = await listen(
  createDemoApi({
    network: SOLANA_DEVNET,
    payTo: web3Keypair(keys.provider).publicKey.toBase58(),
    usdcPrice: USDC_PRICE,
    kuotaMint: MINT,
    facilitatorUrl: facilitator.url,
    onSettled: (p) => void settled.push({ signature: p.signature, asset: p.asset }),
  }),
);

const decisions: PaymentDecision[] = [];
const kuotaFetch = createKuotaFetch({
  signer: await kitSigner(keys.agent),
  rpcUrl: RPC_URL,
  kuotaMint: MINT,
  budgetUsdcPerHour: 2,
  quote: async () => marketPrice,
  onDecision: (d) => decisions.push(d),
});

const conn = new Connection(RPC_URL, "confirmed");
const agentAta = getAssociatedTokenAddressSync(new PublicKey(MINT), web3Keypair(keys.agent).publicKey);
const balance = async () => (await getAccount(conn, agentAta)).amount;

try {
  const before = await balance();
  console.log(`Agent holds ${Number(before) / 1e6} kuota. Calling ${api.url}/v1/quote ${calls} times.\n`);

  let served = 0;
  for (let i = 1; i <= calls; i++) {
    const started = Date.now();
    const res = await kuotaFetch(`${api.url}/v1/quote`);
    const d = decisions.at(-1);
    if (res.status === 200) served++;
    console.log(
      `call ${i}: HTTP ${res.status} in ${Date.now() - started} ms, paid with ${d?.option} (${d?.reason}), body ${JSON.stringify(await res.json())}`,
    );
    // The public devnet RPC allows about 10 requests per method every 10 seconds.
    if (i < calls) await new Promise((r) => setTimeout(r, delayMs));
  }

  const after = await balance();
  const spentKuota = Number(before - after) / 1e6;
  const baseline = served * Number(USDC_PRICE);
  const actual = (served * Number(marketPrice)) / 1e6;

  console.log("\n--- cost report ---");
  console.log(`calls served: ${served} of ${calls}`);
  console.log(`kuota that left the agent: ${spentKuota} (balance now ${Number(after) / 1e6})`);
  console.log(`USDC-only baseline for the served calls: ${baseline.toFixed(4)} USDC`);
  console.log(`cost at the kuota price of ${Number(marketPrice) / 1e6} USDC: ${actual.toFixed(4)} USDC`);
  if (served > 0) console.log(`saving: ${(baseline - actual).toFixed(4)} USDC (${(((baseline - actual) / baseline) * 100).toFixed(0)}%)`);
  if (spentKuota > served) {
    console.log(`\nWARNING: ${spentKuota - served} kuota was paid on-chain for calls that were not served.`);
    console.log("This happens when the facilitator sends the transaction but cannot confirm it, usually an RPC rate limit.");
    console.log("Set SOLANA_RPC in backend/.env to a dedicated devnet endpoint.");
  }
  console.log("\nsettlements the API recorded:");
  for (const s of settled) console.log(`  ${s.asset}  ${explorer(s.signature)}`);
} finally {
  api.server.close();
  facilitator.server.close();
}
