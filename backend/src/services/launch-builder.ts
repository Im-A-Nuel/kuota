import { buildLaunchConfig, BASE_UNIT, LaunchConfigError, type LaunchInput } from "@kuota/core";
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { Keypair, PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import BN from "bn.js";

export interface BuildLaunchDeps {
  connection: Connection;
  /** Kuota wallet that becomes the DBC partner (fee claimer) on every config. */
  treasury: PublicKey;
  usdcMint: PublicKey;
}

export interface BuildLaunchInput extends LaunchInput {
  providerPubkey: string;
  name: string;
  symbol: string;
  uri: string;
  endpointUrl: string;
  /** USDC the provider buys in the same launch. 0 or empty skips the first buy. */
  firstBuyUsdc?: number;
}

export interface BuiltLaunch {
  /** createConfig, then createPoolWithFirstBuy. Base64, partially signed, fee payer = provider. */
  transactions: [string, string];
  mint: string;
  config: string;
  pool: string;
  /** Echo of what was built, stored so /launch/confirm can check the chain against it. */
  input: BuildLaunchInput;
}

function pubkey(field: string, value: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new LaunchConfigError("INVALID_PARAMS", `${field} is not a valid public key`, { field });
  }
}

/**
 * Builds the two unsigned launch transactions (docs/REQUIREMENTS.md FR-02).
 *
 * Kuota only creates the throwaway config and mint keypairs the program needs as signers and
 * signs with those. The provider's wallet is the fee payer and signs last; no provider key ever
 * reaches this process, and the throwaway secrets are dropped when this function returns.
 */
export async function buildLaunchTransactions(
  deps: BuildLaunchDeps,
  input: BuildLaunchInput,
): Promise<BuiltLaunch> {
  const provider = pubkey("providerPubkey", input.providerPubkey);

  const { config } = buildLaunchConfig({ ...input, leftoverReceiver: provider.toBase58() });

  const configKeypair = Keypair.generate();
  const mintKeypair = Keypair.generate();
  const client = DynamicBondingCurveClient.create(deps.connection, "confirmed");

  const firstBuy = input.firstBuyUsdc && input.firstBuyUsdc > 0 ? input.firstBuyUsdc : 0;

  const { createConfigTx, createPoolWithFirstBuyTx } = await client.partner.createConfigAndPoolWithFirstBuy({
    ...config,
    config: configKeypair.publicKey,
    feeClaimer: deps.treasury,
    leftoverReceiver: provider,
    quoteMint: deps.usdcMint,
    payer: provider,
    preCreatePoolParam: {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri,
      poolCreator: provider,
      baseMint: mintKeypair.publicKey,
    },
    // minimumAmountOut is 0 because the pool does not exist until this same transaction
    // creates it, so nobody can move the price between creation and the first buy.
    firstBuyParam: firstBuy
      ? {
          buyer: provider,
          receiver: provider,
          buyAmount: new BN(Math.round(firstBuy * BASE_UNIT)),
          minimumAmountOut: new BN(0),
          referralTokenAccount: null,
        }
      : undefined,
  });

  const { blockhash, lastValidBlockHeight } = await deps.connection.getLatestBlockhash("confirmed");
  const finish = (tx: Transaction, signer: Keypair) => {
    tx.feePayer = provider;
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.partialSign(signer);
    return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
  };

  return {
    transactions: [finish(createConfigTx, configKeypair), finish(createPoolWithFirstBuyTx, mintKeypair)],
    mint: mintKeypair.publicKey.toBase58(),
    config: configKeypair.publicKey.toBase58(),
    pool: deriveDbcPoolAddress(deps.usdcMint, mintKeypair.publicKey, configKeypair.publicKey).toBase58(),
    input,
  };
}
