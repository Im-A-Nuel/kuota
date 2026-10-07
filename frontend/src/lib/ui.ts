// Shared class strings so every page uses the same buttons, cards and fields.

const pill =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

export const btnPrimary = `${pill} bg-accent text-accent-ink hover:bg-accent-deep disabled:opacity-60`;
export const btnSecondary = `${pill} border border-line-strong text-ink hover:border-accent hover:text-accent`;
export const btnOnBrand = `${pill} bg-white text-[#0b1fb8] hover:bg-[#eef1ff]`;
export const btnOnBrandOutline = `${pill} border border-white/70 text-white hover:bg-white/10`;

export const card = "rounded-panel border border-line bg-paper";
export const cardTinted = "rounded-panel bg-card";
export const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold";
export const input =
  "mt-1.5 min-h-12 w-full rounded-control border border-line-strong bg-paper px-4 text-base text-ink placeholder:text-mute aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";
export const sectionX = "mx-auto max-w-6xl px-4 sm:px-6";

/**
 * Props that make an element fade and rise into view when it scrolls in (see Motion).
 * `delay` staggers siblings; `variant: "scale"` grows instead of rising.
 */
export function reveal(delay = 0, variant?: "scale") {
  return {
    "data-reveal": variant ?? "",
    style: { "--reveal-delay": `${delay}ms` } as React.CSSProperties,
  };
}
