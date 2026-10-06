import { mockGetKuota, SAMPLE_MINT } from "@/lib/mock-data";
import { formatPercentFromBps, formatUsdc } from "@/lib/format";
import { ogSize, voucherImage } from "@/lib/og";

export const alt = "Kuota: a voucher showing one API call priced below its USDC price";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  const sample = mockGetKuota(SAMPLE_MINT)!;
  return voucherImage({
    symbol: "Buy calls before you need them",
    name: "Prepaid API calls",
    price: formatUsdc(sample.priceKuotaUsdc),
    usdcPrice: formatUsdc(sample.usdcPrice),
    discount: formatPercentFromBps(sample.discountBps),
    note: "Sample figures from the project docs. Not on-chain.",
  });
}
