import { formatPercentFromBps, formatUsdc, hostOf, shortKey } from "@/lib/format";
import type { KuotaStatus } from "@/lib/types";

export interface VoucherData {
  name: string;
  symbol: string;
  mint: string | null;
  status: KuotaStatus;
  priceKuotaUsdc: string;
  usdcPrice: string;
  discountBps: number;
  curveProgressBps: number;
  endpointUrl: string;
  /** Sample data from the mock layer. */
  isSample?: boolean;
  /** Launch-form preview of a kuota that does not exist yet. */
  preview?: boolean;
}

function mintLabel(data: VoucherData) {
  if (data.preview) return "Assigned at launch";
  if (data.isSample || !data.mint) return "Sample, not on-chain";
  return shortKey(data.mint, 4, 4);
}

/** The token card: brand header with identity, white body with the price. */
export function Voucher({ data }: { data: VoucherData }) {
  const progress = Math.min(100, Math.max(0, data.curveProgressBps / 100));
  const graduated = data.status === "graduated";
  const statusText = data.preview ? "Opening price" : graduated ? "Graduated" : "On curve";

  return (
    <article className="overflow-hidden rounded-panel border border-line bg-paper" aria-label={`${data.name} token`}>
      <div className="brand-band p-6">
        <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <path d="M0 120 C160 40 300 170 460 80 S600 30 600 30" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="40" />
        </svg>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-white/85">
              {data.symbol}
              {data.isSample && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">sample</span>}
            </p>
            <h3 className="mt-1 truncate text-3xl font-light sm:text-4xl">{data.name}</h3>
            <p className="mt-1 text-sm text-white/85">
              1 kuota pays for 1 call on {data.endpointUrl ? hostOf(data.endpointUrl) : "your endpoint"}
            </p>
          </div>
          <dl className="flex gap-2 text-xs">
            <div className="rounded-[14px] bg-white/12 px-3 py-2">
              <dt className="text-white/80">Mint</dt>
              <dd className="font-semibold" title={data.mint ?? undefined}>{mintLabel(data)}</dd>
            </div>
            <div className="rounded-[14px] bg-white/12 px-3 py-2">
              <dt className="text-white/80">Status</dt>
              <dd className="font-semibold">{statusText}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="text-6xl font-light leading-none tracking-tight">
            {formatUsdc(data.priceKuotaUsdc)}
            <span className="ml-2 text-lg font-normal text-mute">USDC</span>
          </p>
          <p className="pb-1 text-sm text-mute">
            per call, against {formatUsdc(data.usdcPrice)} USDC paying direct
          </p>
        </div>

        <p className="mt-4 inline-flex rounded-full bg-teal-wash px-3 py-1 text-sm font-semibold text-teal">
          {formatPercentFromBps(data.discountBps)} below the USDC price
        </p>

        <div className="mt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">{graduated ? "Graduated to DAMM v2" : "Curve progress"}</span>
            <span className="text-mute">{graduated ? "100%" : `${Math.round(progress)}%`}</span>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-card"
            role="progressbar"
            aria-label="Curve progress to graduation"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={graduated ? 100 : Math.round(progress)}
          >
            <div className="fill-in h-full rounded-full bg-accent" style={{ width: `${graduated ? 100 : progress}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}
