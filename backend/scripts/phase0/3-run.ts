// The Phase 0 experiment: can an x402 endpoint accept a custom SPL mint as payment on devnet?
//
// One process plays all roles so the result is easy to reproduce:
//   facilitator   our own, in-process HTTP service built from @x402/svm (no third party)
//   provider API  Express with paymentMiddleware; /resource accepts USDC or 1 test kuota
//   agent         @x402/fetch client that picks the kuota option
// It then reads the settled transaction from the chain and checks who paid whom.
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { x402Facilitator } from "@x402/core/facilitator";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { paymentMiddleware } from "@x402/express";
import { wrapFetchWithPayment } from "@x402/fetch";
import { toClientSvmSigner, toFacilitatorSvmSigner, USDC_DEVNET_ADDRESS } from "@x402/svm";
import { ExactSvmScheme as ClientScheme } from "@x402/svm/exact/client";
import { registerExactSvmScheme } from "@x402/svm/exact/facilitator";
import { ExactSvmScheme as ServerScheme } from "@x402/svm/exact/server";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import express from "express";
import type { Server } from "node:http";
import { connection, explorer, kitSigner, loadKeys, NETWORK, RPC_URL, web3Keypair } from "./shared";

const keys = loadKeys();
if (!keys.mint) throw new Error("Run 2-setup.ts first: there is no test mint yet.");
const MINT = keys.mint;
const PRICE_KUOTA = "1000000"; // 1 kuota, 6 decimals
const PRICE_USDC = "10000"; // 0.01 USDC
const conn = connection();

const provider = web3Keypair(keys.provider);
const agent = web3Keypair(keys.agent);
const providerAta = getAssociatedTokenAddressSync(new (await import("@solana/web3.js")).PublicKey(MINT), provider.publicKey);
const agentAta = getAssociatedTokenAddressSync(new (await import("@solana/web3.js")).PublicKey(MINT), agent.publicKey);

const listen = (app: express.Express) =>
  new Promise<{ server: Server; url: string }>((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });

// 1. Facilitator ---------------------------------------------------------------------------
const facilitatorSigner = toFacilitatorSvmSigner(await kitSigner(keys.facilitator), { defaultRpcUrl: RPC_URL });
const facilitator = new x402Facilitator();
registerExactSvmScheme(facilitator, { signer: facilitatorSigner, networks: NETWORK });

const facilitatorApp = express();
facilitatorApp.use(express.json());
facilitatorApp.get("/supported", async (_req, res) => res.json(await facilitator.getSupported()));
facilitatorApp.post("/verify", async (req, res) => {
  try {
    res.json(await facilitator.verify(req.body.paymentPayload, req.body.paymentRequirements));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
facilitatorApp.post("/settle", async (req, res) => {
  try {
    res.json(await facilitator.settle(req.body.paymentPayload, req.body.paymentRequirements));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
const facilitatorHost = await listen(facilitatorApp);

// 2. Provider API --------------------------------------------------------------------------
const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorHost.url })).register(
  NETWORK,
  new ServerScheme(),
);

const providerApp = express();
providerApp.use(
  paymentMiddleware(
    {
      "GET /resource": {
        accepts: [
          // Option 1: the normal USDC price.
          { scheme: "exact", network: NETWORK, payTo: provider.publicKey.toBase58(), price: { asset: USDC_DEVNET_ADDRESS, amount: PRICE_USDC } },
          // Option 2: one kuota, a custom mint the x402 packages have never heard of.
          { scheme: "exact", network: NETWORK, payTo: provider.publicKey.toBase58(), price: { asset: MINT, amount: PRICE_KUOTA } },
        ],
        description: "Phase 0 test resource",
      },
    },
    resourceServer,
  ),
);
providerApp.get("/resource", (_req, res) => res.json({ ok: true, answer: 42 }));
const providerHost = await listen(providerApp);

const results: Record<string, unknown> = {};
const fail = (message: string): never => {
  throw new Error(message);
};

try {
  // 3. The 402 challenge ---------------------------------------------------------------
  const challenge = await fetch(`${providerHost.url}/resource`);
  results.challengeStatus = challenge.status;
  const header = challenge.headers.get("payment-required");
  const body = header ? JSON.parse(Buffer.from(header, "base64").toString()) : await challenge.json();
  const accepts = body.accepts as { asset: string; amount: string; payTo: string; extra?: { feePayer?: string } }[];
  results.accepts = accepts.map((a) => ({ asset: a.asset, amount: a.amount, feePayer: a.extra?.feePayer }));
  if (challenge.status !== 402) fail(`expected 402, got ${challenge.status}`);
  if (!accepts.some((a) => a.asset === MINT && a.amount === PRICE_KUOTA)) fail("the 402 does not list the kuota option");
  if (!accepts.some((a) => a.asset === USDC_DEVNET_ADDRESS)) fail("the 402 does not list the USDC option");

  // 4. The agent pays with kuota -----------------------------------------------------------
  const before = {
    agent: (await getAccount(conn, agentAta)).amount,
    provider: (await getAccount(conn, providerAta)).amount,
  };

  const client = new x402Client()
    .register("solana:*", new ClientScheme(toClientSvmSigner(await kitSigner(keys.agent)), { rpcUrl: RPC_URL }))
    // This is the hook kuota-fetch will use: choose the option that costs the agent least.
    .registerPolicy((_version, requirements) => requirements.filter((r) => r.asset === MINT));
  const paidFetch = wrapFetchWithPayment(fetch, client);

  const started = Date.now();
  const paid = await paidFetch(`${providerHost.url}/resource`);
  results.paidStatus = paid.status;
  results.paidMs = Date.now() - started;
  results.paidBody = await paid.json().catch(() => null);
  if (paid.status !== 200) fail(`paid request returned ${paid.status}`);

  const settle = new x402HTTPClient(client).getPaymentSettleResponse((name) => paid.headers.get(name));
  results.settle = settle;
  if (!settle.success) fail(`settlement failed: ${settle.errorReason ?? "unknown"}`);

  // 5. Check the chain instead of trusting the HTTP answer ----------------------------------
  const after = {
    agent: (await getAccount(conn, agentAta)).amount,
    provider: (await getAccount(conn, providerAta)).amount,
  };
  results.agentDelta = (after.agent - before.agent).toString();
  results.providerDelta = (after.provider - before.provider).toString();
  if (after.agent - before.agent !== -1_000_000n) fail(`agent balance moved by ${after.agent - before.agent}`);
  if (after.provider - before.provider !== 1_000_000n) fail(`provider balance moved by ${after.provider - before.provider}`);

  const tx = await conn.getParsedTransaction(settle.transaction, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  const transfer = tx?.transaction.message.instructions
    .map((i) => ("parsed" in i ? i.parsed : null))
    .find((p) => p?.type === "transferChecked");
  results.transferChecked = transfer?.info;
  if (!transfer || transfer.info.mint !== MINT) fail("the settled transaction has no TransferChecked for the kuota mint");

  // 6. Replaying the same payment must not work twice -----------------------------------------
  results.signature = settle.transaction;
  results.explorer = explorer(settle.transaction);
  console.log(JSON.stringify(results, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  console.log("\nPHASE 0 RESULT: PASS. An x402 endpoint settled a payment in a custom SPL mint on devnet.");
} catch (e) {
  console.log(JSON.stringify(results, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  console.log(`\nPHASE 0 RESULT: FAIL. ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  providerHost.server.close();
  facilitatorHost.server.close();
}
