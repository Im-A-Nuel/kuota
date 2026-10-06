import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

// Same tokens as globals.css (light theme). Satori cannot read CSS variables.
const PAPER = "#f4eddd";
const CARD = "#fbf7ec";
const INK = "#1c1a15";
const MUTE = "#5c5648";
const ACCENT = "#c93c12";

interface VoucherImage {
  symbol: string;
  name: string;
  price: string;
  usdcPrice: string;
  discount: string;
  note: string;
}

/** Share image in the voucher style: ticket body, perforation, stub. */
export function voucherImage(v: VoucherImage) {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER, padding: 56, color: INK }}>
        <div style={{ display: "flex", flex: 1, background: CARD, border: `4px solid ${INK}`, borderRadius: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 48px" }}>
            <div style={{ fontSize: 30, color: MUTE }}>{v.symbol}</div>
            <div style={{ display: "block", fontSize: 60, fontWeight: 800, marginTop: 4, maxWidth: 760, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {v.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
              <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1 }}>{v.price}</div>
              <div style={{ fontSize: 34, color: MUTE, marginTop: 10 }}>
                {`USDC per call, against ${v.usdcPrice}`}
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 24 }}>
              <div style={{ background: ACCENT, color: "#ffffff", fontSize: 36, fontWeight: 700, padding: "8px 18px", borderRadius: 8 }}>
                {`${v.discount} below the USDC price`}
              </div>
            </div>
            <div style={{ fontSize: 26, color: MUTE, marginTop: "auto" }}>{v.note}</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              width: 230,
              borderLeft: `4px dashed ${INK}`,
              padding: 32,
            }}
          >
            <div style={{ fontSize: 56, fontWeight: 800 }}>kuota</div>
            <div style={{ fontSize: 26, color: MUTE, marginTop: 12 }}>1 kuota = 1 API call</div>
          </div>
        </div>
      </div>
    ),
    ogSize,
  );
}
