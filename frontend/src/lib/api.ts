import {
  mockGetBurns,
  mockGetKuota,
  mockGetSettlements,
  mockListProviders,
} from "./mock-data";
import {
  ApiError,
  type BuildLaunchInput,
  type BuildLaunchResult,
  type BurnItem,
  type KuotaStats,
  type Page,
  type ProviderItem,
  type SettlementItem,
} from "./types";

// Set NEXT_PUBLIC_API_URL to the backend base, e.g. https://kuota.example/api.
// Without it the UI runs on sample data and says so on every page that uses it.
const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export const usingSampleData = !BASE;

// The stats API refreshes from Postgres snapshots every 30 seconds (docs/ARCHITECTURE.md).
const REVALIDATE_SECONDS = 30;

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error?.code ?? "RPC_ERROR",
      body?.error?.message ?? `Backend answered ${res.status}.`,
    );
  }
  return (await res.json()) as T;
}

export async function getKuota(mint: string): Promise<KuotaStats | null> {
  if (!BASE) return mockGetKuota(mint);
  const data = await request<Omit<KuotaStats, "isSample" | "dammPool"> & { dammPool?: string | null }>(
    `/kuota/${mint}`,
  );
  return data && { ...data, dammPool: data.dammPool ?? null, isSample: false };
}

const cursorQuery = (cursor?: string) => (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");
const emptyPage = { items: [], nextCursor: null };

export async function getBurns(mint: string, cursor?: string): Promise<Page<BurnItem>> {
  if (!BASE) return mockGetBurns(mint);
  return (await request<Page<BurnItem>>(`/kuota/${mint}/burns${cursorQuery(cursor)}`)) ?? emptyPage;
}

export async function getSettlements(mint: string, cursor?: string): Promise<Page<SettlementItem>> {
  if (!BASE) return mockGetSettlements(mint);
  return (
    (await request<Page<SettlementItem>>(`/kuota/${mint}/settlements${cursorQuery(cursor)}`)) ??
    emptyPage
  );
}

export async function listProviders(): Promise<ProviderItem[]> {
  if (!BASE) return mockListProviders();
  const data = await request<{ items: Omit<ProviderItem, "isSample">[] }>("/providers");
  return (data?.items ?? []).map((p) => ({ ...p, isSample: false }));
}

/** Client-side call: asks the backend for unsigned launch transactions. */
export async function buildLaunch(input: BuildLaunchInput): Promise<BuildLaunchResult> {
  if (!BASE) {
    throw new ApiError(
      "NOT_CONNECTED",
      "The backend is not connected yet. Set NEXT_PUBLIC_API_URL to build launch transactions.",
    );
  }
  const res = await fetch(`${BASE}/launch/build`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? "RPC_ERROR",
      body?.error?.message ?? `Backend answered ${res.status}.`,
    );
  }
  return body as BuildLaunchResult;
}
