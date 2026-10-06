import { clusterApiUrl } from "@solana/web3.js";

export type Cluster = "devnet" | "mainnet-beta";

export const CLUSTER: Cluster =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta" ? "mainnet-beta" : "devnet";

export const CLUSTER_LABEL = CLUSTER === "mainnet-beta" ? "Mainnet" : "Devnet";

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl(CLUSTER);
