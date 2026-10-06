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

export function Voucher({ data }: { data: VoucherData }) {
  const progress = Math.min(100, Math.max(0, data.curveProgressBps / 100));
  const graduated = data.status === "graduated";
  const statusText = data.preview ? "Opening price" : graduated ? "Graduated" : "On curve";

  return (
    <article className="ticket" aria-label={`${data.name} voucher`}>
      <div className="p-5 sm:p-6">
        <p className="text-sm font-semibold text-mute">
          {data.symbol}
          {data.isSample && <span className="ml-2 rounded-control border border-rule px-1.5 py-0.5 text-xs">sample</span>}
        </p>
        <h3 className="mt-1 text-3xl font-extrabold sm:text-4xl">{data.name}</h3>
        <p className="mt-1 text-sm text-mute">
          1 kuota pays for 1 call on {data.endpointUrl ? hostOf(data.endpointUrl) : "your endpoint"}
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-display text-5xl font-extrabold leading-none sm:text-6xl">
            {formatUsdc(data.priceKuotaUsdc)}
            <span className="ml-1.5 text-lg font-bold text-mute">USDC</span>
          </p>
          <p className="pb-1 text-sm text-mute">
            per call, against {formatUsdc(data.usdcPrice)} USDC paying direct
          </p>
        </div>

        <p className="mt-4 inline-block rounded-control bg-accent px-2.5 py-1 font-bold text-accent-ink">
          {formatPercentFromBps(data.discountBps)} below the USDC price
        </p>

        <div className="mt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">{graduated ? "Graduated to DAMM v2" : "Curve progress"}</span>
            <span className="text-mute">{graduated ? "100%" : `${Math.round(progress)}%`}</span>
          </div>
          <div
            className="mt-1.5 h-3 overflow-hidden rounded-control border-[1.5px] border-ink"
            role="progressbar"
            aria-label="Curve progress to graduation"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={graduated ? 100 : Math.round(progress)}
          >
            <div
              className="fill-in h-full bg-teal"
              style={{ width: `${graduated ? 100 : progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="ticket-stub flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-center">
        <div>
          <p className="text-xs font-semibold text-mute">Mint</p>
          <p className="text-sm font-semibold" title={data.mint ?? undefined}>
            {mintLabel(data)}
          </p>
        </div>
        <div className="sm:mt-5">
          <p className="text-xs font-semibold text-mute">Status</p>
          <p className="text-sm font-bold text-teal">{statusText}</p>
        </div>
      </div>
    </article>
  );
}
