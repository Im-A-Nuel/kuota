import { serve } from "@hono/node-server";
import { Connection } from "@solana/web3.js";
import { createApp } from "./app";
import { openDatabase } from "./db/client";
import { loadEnv } from "./env";

const env = loadEnv();
const { db } = await openDatabase(env.databaseUrl);
const connection = new Connection(env.rpcUrl, "confirmed");

if (!env.databaseUrl) {
  console.warn("DATABASE_URL is not set: using an in-memory database, data is lost on restart.");
}
if (!env.treasury) {
  console.warn("KUOTA_TREASURY is not set: /launch/build will answer NOT_CONFIGURED.");
}

serve({ fetch: createApp({ env, db, connection }).fetch, port: env.port }, ({ port }) => {
  console.log(`Kuota API on http://localhost:${port} (${env.cluster})`);
});
