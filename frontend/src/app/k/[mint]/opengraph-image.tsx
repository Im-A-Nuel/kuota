import { getKuota } from "@/lib/api";
import { formatPercentFromBps, formatUsdc, hostOf } from "@/lib/format";
import { ogSize, voucherImage } from "@/lib/og";

export const alt = "Kuota voucher with the current price per call and discount";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const kuota = await getKuota(mint).catch(() => null);
  if (!kuota) {
    return voucherImage({
      symbol: "Kuota",
      name: "Kuota not found",
      price: "-",
      usdcPrice: "-",
      discount: "0%",
      note: "This mint is not listed on Kuota.",
    });
  }
  return voucherImage({
    symbol: kuota.symbol,
    name: kuota.name,
    price: formatUsdc(kuota.priceKuotaUsdc),
    usdcPrice: formatUsdc(kuota.usdcPrice),
    discount: formatPercentFromBps(kuota.discountBps),
    note: kuota.isSample
      ? "Sample figures from the project docs. Not on-chain."
      : `1 kuota pays for 1 call on ${hostOf(kuota.endpointUrl)}`,
  });
}
