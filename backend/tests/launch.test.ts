import { Transaction } from "@solana/web3.js";
import { afterEach, describe, expect, it } from "vitest";
import { BUILD_BODY, DOCS_EXAMPLE, makeApp, provider, sig } from "./helpers";

type TestApp = Awaited<ReturnType<typeof makeApp>>;
let current: TestApp | null = null;
const start = async (...args: Parameters<typeof makeApp>) => (current = await makeApp(...args));
afterEach(async () => {
  await current?.close();
  current = null;
});

describe("GET /health", () => {
  it("reports the cluster and whether the treasury is set", async () => {
    const { call } = await start();
    const res = await call("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ ok: true, cluster: "devnet", treasuryConfigured: true });
  });
});

describe("POST /launch/simulate", () => {
  it("returns a validated config and the curve for the docs example", async () => {
    const { call } = await start();
    const res = await call("POST", "/launch/simulate", { ...DOCS_EXAMPLE, migrationFeeBps: 3000 });
    expect(res.status).toBe(200);
    expect(res.json.discountStartBps).toBe(5000);
    expect(res.json.discountEndBps).toBe(1500);
    expect(res.json.curve.length).toBeGreaterThan(10);
    expect(Number(res.json.curve.at(-1).priceUsdc)).toBeLessThanOrEqual(0.0085 + 1e-9);
    // BN values arrive as strings, so the whole config survives JSON.
    expect(typeof res.json.config.migrationQuoteThreshold).toBe("string");
    expect(res.json.config.creatorTradingFeePercentage).toBe(50);
  });

  it("defaults the migration fee to 30%", async () => {
    const { call } = await start();
    const res = await call("POST", "/launch/simulate", DOCS_EXAMPLE);
    expect(res.json.config.migrationFee).toEqual({ feePercentage: 30, creatorFeePercentage: 100 });
  });

  it("answers INVALID_PARAMS in the documented error shape", async () => {
    const { call } = await start();
    const res = await call("POST", "/launch/simulate", { ...DOCS_EXAMPLE, committedCalls: 0 });
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("INVALID_PARAMS");
    expect(res.json.error.message).toContain("committedCalls");
    expect(res.json.error).toHaveProperty("details");
  });

  it("explains how many calls the threshold needs", async () => {
    const { call } = await start();
    const res = await call("POST", "/launch/simulate", { ...DOCS_EXAMPLE, committedCalls: 50_000 });
    expect(res.status).toBe(400);
    expect(res.json.error.details.callsNeeded).toBeGreaterThan(100_000);
  });

  it("rejects a body that is not JSON", async () => {
    const { app } = await start();
    const res = await app.request("/launch/simulate", { method: "POST", body: "nope" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_PARAMS");
  });
});

describe("POST /launch/build", () => {
  it("returns two partially signed transactions paid by the provider", async () => {
    const { call } = await start();
    const res = await call("POST", "/launch/build", BUILD_BODY);
    expect(res.status).toBe(200);
    expect(res.json.transactions).toHaveLength(2);
    expect(res.json.mint).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

    for (const b64 of res.json.transactions) {
      const tx = Transaction.from(Buffer.from(b64, "base64"));
      expect(tx.feePayer?.toBase58()).toBe(provider.publicKey.toBase58());
      // Kuota signed with its throwaway key, the provider's slot is still empty.
      const providerSig = tx.signatures.find((s) => s.publicKey.equals(provider.publicKey));
      expect(providerSig?.signature).toBeNull();
      expect(tx.signatures.some((s) => s.signature !== null)).toBe(true);
    }
  });

  it("makes the first transaction create the config and the second the mint and pool", async () => {
    const { call } = await start();
    const res = await call("POST", "/launch/build", BUILD_BODY);
    const keys = (b64: string) =>
      Transaction.from(Buffer.from(b64, "base64"))
        .compileMessage()
        .accountKeys.map((k) => k.toBase58());
    expect(keys(res.json.transactions[0])).toContain(res.json.config);
    expect(keys(res.json.transactions[1])).toContain(res.json.mint);
    expect(keys(res.json.transactions[1])).toContain(res.json.pool);
  });

  it("does not return or store any throwaway secret key", async () => {
    const { call, db } = await start();
    const res = await call("POST", "/launch/build", BUILD_BODY);
    expect(Object.keys(res.json).sort()).toEqual(["config", "mint", "pool", "transactions"]);
    const { pendingLaunches } = await import("../src/db/schema");
    const rows = await db.select().from(pendingLaunches);
    expect(JSON.stringify(rows)).not.toMatch(/secret/i);
    expect(rows).toHaveLength(1);
  });

  it("builds without a first buy", async () => {
    const { call } = await start();
    const res = await call("POST", "/launch/build", { ...BUILD_BODY, firstBuyUsdc: 0 });
    expect(res.status).toBe(200);
  });

  it("answers NOT_CONFIGURED when no treasury is set", async () => {
    const { call } = await start({ treasury: null });
    const res = await call("POST", "/launch/build", BUILD_BODY);
    expect(res.status).toBe(503);
    expect(res.json.error.code).toBe("NOT_CONFIGURED");
  });

  it.each([
    ["providerPubkey", "not-a-key"],
    ["symbol", "x"],
    ["uri", "ftp://nope"],
    ["endpointUrl", "http://insecure.example"],
    ["name", ""],
  ])("rejects a bad %s", async (field, value) => {
    const { call } = await start();
    const res = await call("POST", "/launch/build", { ...BUILD_BODY, [field]: value });
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("INVALID_PARAMS");
  });

  it("limits how often one client can build", async () => {
    const { call } = await start();
    const headers = { "x-forwarded-for": "203.0.113.9" };
    let last = 0;
    for (let i = 0; i < 21; i++) last = (await call("POST", "/launch/build", BUILD_BODY, headers)).status;
    expect(last).toBe(429);
  });
});

describe("POST /launch/confirm", () => {
  const built = async (t: TestApp) => (await t.call("POST", "/launch/build", BUILD_BODY)).json;

  it("records the launch once both transactions landed", async () => {
    const t = await start();
    const b = await built(t);
    t.chain.land(sig(1), b.transactions[0]);
    t.chain.land(sig(2), b.transactions[1]);

    const res = await t.call("POST", "/launch/confirm", { mint: b.mint, signatures: [sig(1), sig(2)] });
    expect(res.status).toBe(200);
    expect(res.json.launchId).toMatch(/^[0-9a-f-]{36}$/);

    const stats = await t.call("GET", `/kuota/${b.mint}`);
    expect(stats.status).toBe(200);
    expect(stats.json.symbol).toBe("KUOTA-DEMO");
  });

  it("is idempotent: confirming twice returns the same launch", async () => {
    const t = await start();
    const b = await built(t);
    t.chain.land(sig(1), b.transactions[0]);
    t.chain.land(sig(2), b.transactions[1]);
    const body = { mint: b.mint, signatures: [sig(1), sig(2)] };
    const first = await t.call("POST", "/launch/confirm", body);
    const second = await t.call("POST", "/launch/confirm", body);
    expect(second.json.launchId).toBe(first.json.launchId);
  });

  it("answers TX_NOT_FOUND while a transaction is not on-chain", async () => {
    const t = await start();
    const b = await built(t);
    t.chain.land(sig(1), b.transactions[0]);
    const res = await t.call("POST", "/launch/confirm", { mint: b.mint, signatures: [sig(1), sig(2)] });
    expect(res.status).toBe(404);
    expect(res.json.error.code).toBe("TX_NOT_FOUND");
    expect(res.json.error.details.signatures).toEqual([sig(2)]);
  });

  it("answers MISMATCH when the transaction failed", async () => {
    const t = await start();
    const b = await built(t);
    t.chain.land(sig(1), b.transactions[0]);
    t.chain.land(sig(2), b.transactions[1], { failed: true });
    const res = await t.call("POST", "/launch/confirm", { mint: b.mint, signatures: [sig(1), sig(2)] });
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("MISMATCH");
  });

  it("answers MISMATCH when someone else paid", async () => {
    const t = await start();
    const b = await built(t);
    t.chain.land(sig(1), b.transactions[0], { feePayer: b.config });
    t.chain.land(sig(2), b.transactions[1]);
    const res = await t.call("POST", "/launch/confirm", { mint: b.mint, signatures: [sig(1), sig(2)] });
    expect(res.json.error.code).toBe("MISMATCH");
  });

  it("answers MISMATCH when the transactions are swapped", async () => {
    const t = await start();
    const b = await built(t);
    t.chain.land(sig(1), b.transactions[1]);
    t.chain.land(sig(2), b.transactions[0]);
    const res = await t.call("POST", "/launch/confirm", { mint: b.mint, signatures: [sig(1), sig(2)] });
    expect(res.json.error.code).toBe("MISMATCH");
  });

  it("answers NOT_FOUND for a mint that was never built", async () => {
    const t = await start();
    const other = (await built(t)).mint;
    const res = await t.call("POST", "/launch/confirm", {
      mint: "So11111111111111111111111111111111111111112",
      signatures: [sig(1), sig(2)],
    });
    expect(res.status).toBe(404);
    expect(res.json.error.code).toBe("NOT_FOUND");
    expect(other).toBeTruthy();
  });
});
