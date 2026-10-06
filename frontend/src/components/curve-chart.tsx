import { formatCount, formatUsdc } from "@/lib/format";
import type { CurvePoint } from "@/lib/types";

interface Props {
  points: CurvePoint[];
  usdcPrice: number;
  /** Calls sold so far; draws the "you are here" marker when it falls on the curve. */
  soldNow?: number;
  title: string;
}

const W = 100;
const H = 100;

/**
 * Curve and redemption line. Lines are drawn in a stretched SVG with non-scaling strokes;
 * all text and the marker are HTML so they stay readable at any width.
 */
export function CurveChart({ points, usdcPrice, soldNow, title }: Props) {
  if (points.length < 2 || !(usdcPrice > 0)) return null;

  const maxX = points[points.length - 1].supplySold;
  const maxY = usdcPrice * 1.12;
  const x = (v: number) => (v / maxX) * W;
  const y = (v: number) => H - (v / maxY) * H;

  const line = points.map((p) => `${x(p.supplySold)},${y(p.priceUsdc)}`).join(" ");
  const redeemY = y(usdcPrice);
  const gap = `${points.map((p) => `${x(p.supplySold)},${y(p.priceUsdc)}`).join(" ")} ${W},${redeemY} 0,${redeemY}`;

  const first = points[0];
  const last = points[points.length - 1];

  let marker: { left: number; top: number; price: number } | null = null;
  if (soldNow !== undefined && soldNow >= 0 && soldNow <= maxX) {
    const t = soldNow / maxX;
    const price = first.priceUsdc + (last.priceUsdc - first.priceUsdc) * t;
    marker = { left: t * 100, top: (y(price) / H) * 100, price };
  }

  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <div className="relative ml-12 mr-2 mt-6 mb-8 h-56 sm:h-64" role="img"
        aria-label={`Price per call rises from ${formatUsdc(first.priceUsdc)} to ${formatUsdc(last.priceUsdc)} USDC over ${formatCount(maxX)} calls sold, always below the ${formatUsdc(usdcPrice)} USDC redemption price.`}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <polygon points={gap} fill="var(--teal-wash)" />
          <line x1="0" x2={W} y1={redeemY} y2={redeemY} stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          <polyline points={line} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2="0" y1="0" y2={H} stroke="var(--ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={W} y1={H} y2={H} stroke="var(--ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>

        <span
          className="absolute right-0 -top-6 text-xs font-bold text-accent-text"
          style={{ top: `calc(${(redeemY / H) * 100}% - 1.5rem)` }}
        >
          USDC price {formatUsdc(usdcPrice)}
        </span>
        <span className="absolute -left-12 w-10 text-right text-xs font-semibold text-mute" style={{ top: `calc(${(y(first.priceUsdc) / H) * 100}% - 0.55rem)` }}>
          {formatUsdc(first.priceUsdc)}
        </span>
        <span className="absolute -left-12 w-10 text-right text-xs font-semibold text-mute" style={{ top: `calc(${(y(last.priceUsdc) / H) * 100}% - 0.55rem)` }}>
          {formatUsdc(last.priceUsdc)}
        </span>
        <span className="absolute -bottom-6 left-0 text-xs font-semibold text-mute">0 calls sold</span>
        <span className="absolute -bottom-6 right-0 text-xs font-semibold text-mute">{formatCount(maxX)}</span>

        {marker && (
          <>
            <span
              className="absolute top-0 h-full w-px bg-ink"
              style={{ left: `${marker.left}%` }}
              aria-hidden="true"
            />
            <span
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-ink bg-accent"
              style={{ left: `${marker.left}%`, top: `${marker.top}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>
      <p className="ml-12 text-sm text-mute">
        The shaded gap is your discount. The curve never reaches the dashed line, so while it runs
        a kuota costs less than the call it pays for.
      </p>
    </figure>
  );
}
