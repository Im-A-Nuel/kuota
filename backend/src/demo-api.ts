import { kuotaPaywall, type KuotaPaywallConfig } from "@kuota/x402";
import express from "express";

/**
 * The baseline provider the project demos with (docs/ARCHITECTURE.md, `demo-api`).
 * One paid route, `GET /v1/quote`, behind the two-price paywall. The data it returns is
 * generated, not real market data: it exists to have something to pay for.
 */
export function createDemoApi(paywall: KuotaPaywallConfig) {
  const app = express();
  let served = 0;

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/v1", kuotaPaywall(paywall));

  app.get("/v1/quote", (_req, res) => {
    served++;
    res.json({
      note: "Generated demo data, not a market price.",
      call: served,
      answer: 40 + (served % 5),
      servedAt: new Date().toISOString(),
    });
  });

  return app;
}
