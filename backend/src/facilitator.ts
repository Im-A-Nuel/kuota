import { x402Facilitator } from "@x402/core/facilitator";
import { toFacilitatorSvmSigner } from "@x402/svm";
import { registerExactSvmScheme } from "@x402/svm/exact/facilitator";
import type { KeyPairSigner } from "@solana/kit";
import express from "express";

/**
 * Kuota's own x402 facilitator for Solana (docs/PHASE0.md: it accepts any mint, where hosted
 * facilitators may not). It verifies the agent's partially signed transfer, adds the fee payer
 * signature, and submits the transaction. The fee payer wallet only needs SOL; it never holds
 * kuota or USDC.
 *
 * Speaks the three routes the x402 HTTP client expects: GET /supported, POST /verify, POST /settle.
 */
export function createFacilitatorApp(options: {
  feePayer: KeyPairSigner;
  rpcUrl: string;
  network: `${string}:${string}`;
}) {
  const facilitator = new x402Facilitator();
  registerExactSvmScheme(facilitator, {
    signer: toFacilitatorSvmSigner(options.feePayer, { defaultRpcUrl: options.rpcUrl }),
    networks: options.network,
  });

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/supported", async (_req, res) => {
    res.json(await facilitator.getSupported());
  });

  app.post("/verify", async (req, res) => {
    try {
      res.json(await facilitator.verify(req.body.paymentPayload, req.body.paymentRequirements));
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/settle", async (req, res) => {
    try {
      res.json(await facilitator.settle(req.body.paymentPayload, req.body.paymentRequirements));
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return app;
}
