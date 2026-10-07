import { buildLaunchConfig, LaunchConfigError } from "@kuota/core";
import type { Connection } from "@solana/web3.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError, z } from "zod";
import type { Db } from "./db/client";
import type { Env } from "./env";
import { ApiError, STATUS, type ApiErrorCode } from "./errors";
import { rateLimit } from "./rate-limit";
import { buildLaunchTransactions } from "./services/launch-builder";
import { confirmLaunch, savePending } from "./services/launch-confirm";
import { getKuotaStats, launchIdFor, listBurns, listProviders, listSettlements } from "./services/stats";

export interface AppDeps {
  env: Env;
  db: Db;
  connection: Connection;
}

const pubkeyField = z.string().min(32).max(44);

const simulateBody = z.object({
  usdcPricePerCall: z.string().regex(/^\d+(\.\d+)?$/, "must be a decimal number"),
  committedCalls: z.number().int().positive(),
  migrationThresholdUsdc: z.number().positive(),
  /** 3000 means 30%. Defaults to 30%. */
  migrationFeeBps: z.number().int().min(0).max(9900).optional(),
});

const buildBody = simulateBody.extend({
  providerPubkey: pubkeyField,
  name: z.string().trim().min(1).max(32),
  symbol: z.string().regex(/^[A-Za-z0-9-]{2,10}$/, "2 to 10 letters, digits or dashes"),
  uri: z.string().regex(/^(https:\/\/|ipfs:\/\/|ar:\/\/).+/, "must be an https, ipfs or ar link").max(200),
  endpointUrl: z.string().url().startsWith("https://").max(300),
  firstBuyUsdc: z.number().min(0).max(1_000_000).optional(),
});

const confirmBody = z.object({
  mint: pubkeyField,
  signatures: z.tuple([z.string().min(64).max(100), z.string().min(64).max(100)]),
});

/** Config holds BN values; send them as strings so they survive JSON. */
function jsonSafe<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_, v) => {
      if (v && typeof v === "object" && v.constructor?.name === "BN") return v.toString();
      if (v && typeof v === "object" && v.constructor?.name === "PublicKey") return v.toBase58();
      return typeof v === "bigint" ? v.toString() : v;
    }),
  );
}

async function readBody<S extends z.ZodType>(c: { req: { json: () => Promise<unknown> } }, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ApiError("INVALID_PARAMS", "Request body must be JSON.");
  }
  return schema.parse(raw);
}

export function createApp({ env, db, connection }: AppDeps) {
  const app = new Hono();

  app.use("*", cors({ origin: env.corsOrigin }));

  app.onError((err, c) => {
    let code: ApiErrorCode = "RPC_ERROR";
    let message = "Unexpected error.";
    let details: Record<string, unknown> = {};

    if (err instanceof ApiError || err instanceof LaunchConfigError) {
      code = err.code;
      message = err.message;
      details = err.details;
    } else if (err instanceof ZodError) {
      code = "INVALID_PARAMS";
      message = err.issues.map((i) => `${i.path.join(".") || "body"} ${i.message}`).join("; ");
      details = { issues: err.issues.map((i) => ({ path: i.path, message: i.message })) };
    } else {
      console.error(err);
    }
    return c.json({ error: { code, message, details } }, STATUS[code]);
  });

  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "No such route.", details: {} } }, 404));

  app.get("/health", (c) =>
    c.json({ ok: true, cluster: env.cluster, treasuryConfigured: env.treasury !== null }),
  );

  // Launch -------------------------------------------------------------------------------

  app.post("/launch/simulate", async (c) => {
    const body = await readBody(c, simulateBody);
    const { config, preview } = buildLaunchConfig({
      usdcPricePerCall: body.usdcPricePerCall,
      committedCalls: body.committedCalls,
      migrationThresholdUsdc: body.migrationThresholdUsdc,
      migrationFeePercent: body.migrationFeeBps === undefined ? undefined : body.migrationFeeBps / 100,
    });
    return c.json({
      config: jsonSafe(config),
      curve: preview.curve,
      discountStartBps: preview.discountStartBps,
      discountEndBps: preview.discountEndBps,
      callsSoldAtThreshold: preview.callsSoldAtThreshold,
      migrationThresholdUsdc: preview.migrationThresholdUsdc,
      totalTokenSupply: preview.totalTokenSupply,
      leftoverTokens: preview.leftoverTokens,
      warnings: preview.warnings,
    });
  });

  // Each build asks the RPC for a blockhash, so cap it per client.
  app.use("/launch/build", rateLimit({ limit: 20, windowMs: 60_000 }));

  app.post("/launch/build", async (c) => {
    if (!env.treasury) {
      throw new ApiError("NOT_CONFIGURED", "KUOTA_TREASURY is not set, so launches cannot be built yet.");
    }
    const body = await readBody(c, buildBody);
    let built;
    try {
      built = await buildLaunchTransactions(
        { connection, treasury: env.treasury, usdcMint: env.usdcMint },
        {
          usdcPricePerCall: body.usdcPricePerCall,
          committedCalls: body.committedCalls,
          migrationThresholdUsdc: body.migrationThresholdUsdc,
          migrationFeePercent: body.migrationFeeBps === undefined ? undefined : body.migrationFeeBps / 100,
          providerPubkey: body.providerPubkey,
          name: body.name,
          symbol: body.symbol,
          uri: body.uri,
          endpointUrl: body.endpointUrl,
          firstBuyUsdc: body.firstBuyUsdc,
        },
      );
    } catch (e) {
      if (e instanceof LaunchConfigError) throw e;
      throw new ApiError("RPC_ERROR", `Could not build the launch: ${(e as Error).message}`);
    }
    await savePending(db, built);
    return c.json({
      transactions: built.transactions,
      mint: built.mint,
      config: built.config,
      pool: built.pool,
    });
  });

  app.post("/launch/confirm", async (c) => {
    const body = await readBody(c, confirmBody);
    return c.json(await confirmLaunch({ db, connection }, body));
  });

  // Stats --------------------------------------------------------------------------------

  app.get("/providers", async (c) => c.json(await listProviders(db)));

  app.get("/kuota/:mint", async (c) => {
    const stats = await getKuotaStats(db, c.req.param("mint"));
    if (!stats) throw new ApiError("NOT_FOUND", "No kuota with this mint.");
    return c.json(stats);
  });

  app.get("/kuota/:mint/burns", async (c) => {
    const id = await launchIdFor(db, c.req.param("mint"));
    if (!id) throw new ApiError("NOT_FOUND", "No kuota with this mint.");
    return c.json(await listBurns(db, id, c.req.query("cursor")));
  });

  app.get("/kuota/:mint/settlements", async (c) => {
    const id = await launchIdFor(db, c.req.param("mint"));
    if (!id) throw new ApiError("NOT_FOUND", "No kuota with this mint.");
    return c.json(await listSettlements(db, id, c.req.query("cursor")));
  });

  return app;
}
