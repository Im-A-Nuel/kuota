import { describe, expect, it } from "vitest";
import { burns, launches, settlements, snapshots, walletLabels } from "../src/db/schema";
import { makeApp } from "./helpers";

const MINT = "So11111111111111111111111111111111111111112";

async function seedLaunch(t: Awaited<ReturnType<typeof makeApp>>) {
  const [row] = await t.db
    .insert(launches)
    .values({
      mint: MINT,
      config: "Config1111111111111111111111111111111111111",
      pool: "Pool111111111111111111111111111111111111111",
      providerPubkey: "Provider11111111111111111111111111111111111",
      name: "Demo API calls",
      symbol: "KUOTA-DEMO",
      endpointUrl: "https://demo-api.example/v1/quote",
      usdcPrice: 10_000n,
      committedCalls: 150_000n,
      migrationThreshold: 750_000_000n,
      migrationFeeBps: 3000,
    })
    .returning();
  return row;
}

describe("stats API", () => {
  it("answers NOT_FOUND for unknown mints on every stats route", async () => {
    const t = await makeApp();
    for (const path of [`/kuota/${MINT}`, `/kuota/${MINT}/burns`, `/kuota/${MINT}/settlements`]) {
      const res = await t.call("GET", path);
      expect(res.status).toBe(404);
      expect(res.json.error.code).toBe("NOT_FOUND");
    }
  });

  it("shows the opening price and an empty ledger for a fresh launch", async () => {
    const t = await makeApp();
    await seedLaunch(t);
    const res = await t.call("GET", `/kuota/${MINT}`);
    expect(res.json).toMatchObject({
      mint: MINT,
      symbol: "KUOTA-DEMO",
      status: "curve",
      usdcPrice: "0.01",
      priceKuotaUsdc: "0.005",
      discountBps: 5000,
      curveProgressBps: 0,
      committedCalls: 150_000,
      holders: 0,
      burned: "0",
      callsPaid: 0,
      dammPool: null,
    });
  });

  it("uses the latest snapshot for price, discount and progress", async () => {
    const t = await makeApp();
    const launch = await seedLaunch(t);
    const base = { launchId: launch.id, holders: 3, burned: 0n, callsPaid: 0n };
    await t.db.insert(snapshots).values([
      { ...base, priceKuota: 5_200n, discountBps: 4800, curveProgressBps: 400, takenAt: new Date("2026-10-07T10:00:00Z") },
      { ...base, priceKuota: 6_100n, discountBps: 3900, curveProgressBps: 2400, holders: 23, takenAt: new Date("2026-10-07T11:00:00Z") },
    ]);
    const res = await t.call("GET", `/kuota/${MINT}`);
    expect(res.json).toMatchObject({ priceKuotaUsdc: "0.0061", discountBps: 3900, curveProgressBps: 2400, holders: 23 });
  });

  it("totals burns and counts only kuota payments as paid calls", async () => {
    const t = await makeApp();
    const launch = await seedLaunch(t);
    await t.db.insert(burns).values([
      { signature: "b1", launchId: launch.id, amount: 100_000_000n, slot: 1n },
      { signature: "b2", launchId: launch.id, amount: 212_000_000n, slot: 2n },
    ]);
    await t.db.insert(settlements).values([
      { signature: "s1", launchId: launch.id, payer: "A", asset: "kuota", amount: 1_000_000n, source: "chain", slot: 1n },
      { signature: "s2", launchId: launch.id, payer: "B", asset: "usdc", amount: 10_000n, source: "chain", slot: 2n },
      { signature: "s3", launchId: launch.id, payer: "C", asset: "kuota", amount: 1_000_000n, source: "chain", slot: 3n },
    ]);
    const res = await t.call("GET", `/kuota/${MINT}`);
    // Burned is returned in base units, as docs/SCHEMA.md specifies.
    expect(res.json.burned).toBe("312000000");
    expect(res.json.callsPaid).toBe(2);
  });

  it("lists launches on /providers, newest first", async () => {
    const t = await makeApp();
    await seedLaunch(t);
    const res = await t.call("GET", "/providers");
    expect(res.json.items).toHaveLength(1);
    expect(res.json.items[0]).toMatchObject({ mint: MINT, name: "Demo API calls", status: "curve", discountBps: 5000 });
  });

  it("pages the burn ledger with a stable cursor", async () => {
    const t = await makeApp();
    const launch = await seedLaunch(t);
    const rows = Array.from({ length: 25 }, (_, i) => ({
      signature: `burn-${i}`,
      launchId: launch.id,
      amount: BigInt(i + 1) * 1_000_000n,
      slot: BigInt(i),
      createdAt: new Date(Date.UTC(2026, 9, 7, 10, i)),
    }));
    await t.db.insert(burns).values(rows);

    const first = await t.call("GET", `/kuota/${MINT}/burns`);
    expect(first.json.items).toHaveLength(20);
    expect(first.json.items[0].signature).toBe("burn-24");
    expect(first.json.nextCursor).toBeTruthy();

    const second = await t.call("GET", `/kuota/${MINT}/burns?cursor=${first.json.nextCursor}`);
    expect(second.json.items).toHaveLength(5);
    expect(second.json.items.at(-1).signature).toBe("burn-0");
    expect(second.json.nextCursor).toBeNull();

    const all = [...first.json.items, ...second.json.items].map((i: { signature: string }) => i.signature);
    expect(new Set(all).size).toBe(25);
  });

  it("does not skip rows that share a timestamp", async () => {
    const t = await makeApp();
    const launch = await seedLaunch(t);
    const same = new Date("2026-10-07T10:00:00Z");
    await t.db.insert(burns).values(
      Array.from({ length: 22 }, (_, i) => ({ signature: `tie-${i}`, launchId: launch.id, amount: 1n, slot: BigInt(i), createdAt: same })),
    );
    const first = await t.call("GET", `/kuota/${MINT}/burns`);
    const second = await t.call("GET", `/kuota/${MINT}/burns?cursor=${first.json.nextCursor}`);
    const sigs = [...first.json.items, ...second.json.items].map((i: { signature: string }) => i.signature);
    expect(new Set(sigs).size).toBe(22);
  });

  it("flags team wallets in settlements", async () => {
    const t = await makeApp();
    const launch = await seedLaunch(t);
    await t.db.insert(walletLabels).values({ pubkey: "TeamWallet", label: "demo agent", isTeam: true });
    await t.db.insert(settlements).values([
      { signature: "s1", launchId: launch.id, payer: "TeamWallet", asset: "kuota", amount: 1_000_000n, source: "chain", slot: 1n, createdAt: new Date("2026-10-07T10:00:00Z") },
      { signature: "s2", launchId: launch.id, payer: "Stranger", asset: "usdc", amount: 10_000n, source: "chain", slot: 2n, createdAt: new Date("2026-10-07T10:01:00Z") },
    ]);
    const res = await t.call("GET", `/kuota/${MINT}/settlements`);
    expect(res.json.items.map((i: { payer: string; isTeam: boolean }) => [i.payer, i.isTeam])).toEqual([
      ["Stranger", false],
      ["TeamWallet", true],
    ]);
    // Amounts are base-unit strings so nothing rounds through a double.
    expect(res.json.items[1].amount).toBe("1000000");
  });

  it("returns the documented 404 for unknown routes", async () => {
    const t = await makeApp();
    const res = await t.call("GET", "/nope");
    expect(res.status).toBe(404);
    expect(res.json.error.code).toBe("NOT_FOUND");
  });
});
