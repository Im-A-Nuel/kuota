import type { FacilitatorClient } from "@x402/core/server";
import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { kuotaPaywall, priceOptions, SOLANA_DEVNET, toBaseUnits, type KuotaPaywallConfig, type SettledPayment } from "./index";

const FEE_PAYER = "JCpj2NYNUBSWNXxn2zakXqP6NH4tSzfKvDKQ7hLkcpom";
const PROVIDER = "H67sd6vdAMTV4g4vdaJnY48TkaCtVyToTq7tPc5CHf1e";
const MINT = "CbVUx86UpNVjAPjTGRKF3HYdKDEh8tf4KwVRjWoL2hiw";
const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/** A facilitator that approves every payment, so the tests only exercise the middleware. */
function fakeFacilitator(outcome: { settle?: "ok" | "fail" } = {}): FacilitatorClient & { settled: number } {
  const f = {
    settled: 0,
    async getSupported() {
      return {
        kinds: [{ x402Version: 2, scheme: "exact", network: SOLANA_DEVNET, extra: { feePayer: FEE_PAYER } }],
        extensions: [],
        signers: { "solana:*": [FEE_PAYER] },
      };
    },
    async verify() {
      return { isValid: true, payer: "AgentWallet1111111111111111111111111111111" };
    },
    async settle() {
      f.settled++;
      if (outcome.settle === "fail") return { success: false, errorReason: "transaction_failed", transaction: "", network: SOLANA_DEVNET };
      return { success: true, payer: "AgentWallet1111111111111111111111111111111", transaction: `sig-${f.settled}`, network: SOLANA_DEVNET };
    },
  };
  return f as never;
}

const config = (patch: Partial<KuotaPaywallConfig> = {}): KuotaPaywallConfig => ({
  network: SOLANA_DEVNET,
  payTo: PROVIDER,
  usdcPrice: "0.01",
  kuotaMint: MINT,
  facilitator: fakeFacilitator(),
  ...patch,
});

let server: Server | null = null;
afterEach(() => server?.close());

async function start(cfg: KuotaPaywallConfig) {
  const app = express();
  app.use("/v1", kuotaPaywall(cfg));
  app.get("/v1/quote", (_req, res) => res.json({ answer: 42 }));
  app.get("/free", (_req, res) => res.json({ free: true }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const url = `http://127.0.0.1:${(server!.address() as { port: number }).port}`;
  return { url };
}

type Accept = { asset: string; amount: string; payTo: string; scheme: string; network: string; extra?: { feePayer?: string } };
async function challenge(url: string) {
  const res = await fetch(`${url}/v1/quote`);
  const header = res.headers.get("payment-required");
  const body = header ? JSON.parse(Buffer.from(header, "base64").toString()) : await res.json();
  return { res, body, accepts: body.accepts as Accept[] };
}

/** What an x402 client sends back: the chosen requirement and a (here fake) signed payload. */
const paymentHeader = (accepted: Accept) =>
  Buffer.from(JSON.stringify({ x402Version: 2, accepted, payload: { transaction: "ZmFrZQ==" } })).toString("base64");

describe("kuotaPaywall", () => {
  it("answers 402 with two ways to pay: USDC, or 1 kuota", async () => {
    const { url } = await start(config());
    const { res, accepts } = await challenge(url);
    expect(res.status).toBe(402);
    expect(accepts).toHaveLength(2);
    expect(accepts[0]).toMatchObject({ asset: USDC_DEVNET, amount: "10000", payTo: PROVIDER, scheme: "exact", network: SOLANA_DEVNET });
    expect(accepts[1]).toMatchObject({ asset: MINT, amount: "1000000", payTo: PROVIDER, scheme: "exact", network: SOLANA_DEVNET });
  });

  it("tells the client which wallet pays the network fee", async () => {
    const { url } = await start(config());
    const { accepts } = await challenge(url);
    expect(accepts.map((a) => a.extra?.feePayer)).toEqual([FEE_PAYER, FEE_PAYER]);
  });

  it("does not touch routes outside the mount path", async () => {
    const { url } = await start(config());
    const res = await fetch(`${url}/free`);
    expect(res.status).toBe(200);
  });

  it("serves the resource once a kuota payment settles", async () => {
    const { url } = await start(config());
    const { accepts } = await challenge(url);
    const res = await fetch(`${url}/v1/quote`, { headers: { "payment-signature": paymentHeader(accepts[1]) } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: 42 });
  });

  it("serves the resource once a USDC payment settles", async () => {
    const { url } = await start(config());
    const { accepts } = await challenge(url);
    const res = await fetch(`${url}/v1/quote`, { headers: { "payment-signature": paymentHeader(accepts[0]) } });
    expect(res.status).toBe(200);
  });

  it("does not serve the resource when settlement fails", async () => {
    const { url } = await start(config({ facilitator: fakeFacilitator({ settle: "fail" }) }));
    const { accepts } = await challenge(url);
    const res = await fetch(`${url}/v1/quote`, { headers: { "payment-signature": paymentHeader(accepts[1]) } });
    expect(res.status).not.toBe(200);
  });

  it("rejects a payment for an amount the endpoint did not ask for", async () => {
    const { url } = await start(config());
    const { accepts } = await challenge(url);
    const cheap = { ...accepts[1], amount: "1" };
    const res = await fetch(`${url}/v1/quote`, { headers: { "payment-signature": paymentHeader(cheap) } });
    expect(res.status).toBe(402);
  });

  it("reports each settled payment, labelled kuota or usdc", async () => {
    const seen: SettledPayment[] = [];
    const { url } = await start(config({ onSettled: (p) => void seen.push(p) }));
    const { accepts } = await challenge(url);
    await fetch(`${url}/v1/quote`, { headers: { "payment-signature": paymentHeader(accepts[1]) } });
    await fetch(`${url}/v1/quote`, { headers: { "payment-signature": paymentHeader(accepts[0]) } });
    expect(seen.map((p) => [p.asset, p.amount])).toEqual([
      ["kuota", 1_000_000n],
      ["usdc", 10_000n],
    ]);
    expect(seen[0]).toMatchObject({ signature: "sig-1", network: SOLANA_DEVNET });
  });

  it("still serves a paid call when the recording callback throws", async () => {
    const { url } = await start(config({ onSettled: () => Promise.reject(new Error("db down")) }));
    const { accepts } = await challenge(url);
    const res = await fetch(`${url}/v1/quote`, { headers: { "payment-signature": paymentHeader(accepts[1]) } });
    expect(res.status).toBe(200);
  });
});

describe("priceOptions", () => {
  it("prices one call at one kuota by default", () => {
    expect(priceOptions(config()).kuota.amount).toBe("1000000");
  });

  it("lets one kuota buy several calls", () => {
    expect(priceOptions(config({ callsPerToken: 10 })).kuota.amount).toBe("100000");
    expect(priceOptions(config({ callsPerToken: 1000 })).kuota.amount).toBe("1000");
  });

  it("rejects call counts that do not divide one kuota into whole base units", () => {
    expect(() => priceOptions(config({ callsPerToken: 3 }))).toThrow(/whole base units/);
    expect(() => priceOptions(config({ callsPerToken: 0 }))).toThrow();
    expect(() => priceOptions(config({ callsPerToken: 1.5 }))).toThrow();
  });

  it("needs a USDC mint on networks it does not know", () => {
    expect(() => priceOptions(config({ network: "solana:unknown" as const }))).toThrow(/usdcMint/);
    expect(priceOptions(config({ network: "solana:unknown" as const, usdcMint: USDC_DEVNET })).usdc.asset).toBe(USDC_DEVNET);
  });

  it("rejects a zero or malformed USDC price", () => {
    expect(() => priceOptions(config({ usdcPrice: "0" }))).toThrow();
    expect(() => priceOptions(config({ usdcPrice: "abc" }))).toThrow();
    expect(() => priceOptions(config({ usdcPrice: "0.0000001" }))).toThrow(/decimals/);
  });
});

describe("kuotaPaywall setup", () => {
  it("needs a facilitator", () => {
    expect(() => kuotaPaywall({ ...config(), facilitator: undefined })).toThrow(/facilitator/);
  });
});

describe("toBaseUnits", () => {
  it("is exact", () => {
    expect(toBaseUnits("0.01")).toBe(10_000n);
    expect(toBaseUnits("12.345678")).toBe(12_345_678n);
    expect(toBaseUnits("3")).toBe(3_000_000n);
  });
});
