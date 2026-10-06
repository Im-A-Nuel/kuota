# Kuota UI direction

Source: direction chosen by the project owner on 2026-10-06 ("warm, internet-kuota voucher"). The agent transcribed it into tokens. Applied under `antislop` (core + `antislop-ui`) and `ui-ux-pro-max`.

Design Read: Web app for x402 API providers and agent operators, in a printed-voucher style, dial ENERGY 2 / RHYTHM 3 / MOTION 1.

Dial: ENERGY 2 / RHYTHM 3 / MOTION 1

## Product facts the UI must respect

- 1 kuota = 1 API call. Supply is fixed to committed calls.
- Curve stays below the USDC per-call price (50% to 85%). Never imply price growth. Kuota is a service credit, not an investment (REQUIREMENTS: Non-Goals).
- Every number on screen is real or labelled sample data (R-17, R-38). No backend yet, so pages run on a mock layer and say so.

## Identity motif

A printed voucher. Ticket shape with a perforation line, a mint serial on the stub, and a rubber stamp reading "Redeemed" on every burned row. Reason: a kuota token is a voucher for one call, and burning is redemption. The motif carries meaning on each screen instead of decorating it.

## Palette (2 core + neutral base, 1 accent, R-29)

| Token | Light | Dark | Role | Reason |
| --- | --- | --- | --- | --- |
| paper | `#F4EDDD` | `#17150F` | page ground | warm cardstock, reads as printed matter |
| card | `#FBF7EC` | `#211E17` | voucher and panels | one step above paper, no shadow needed |
| ink | `#1C1A15` | `#F2EBDA` | text, borders | 14.9:1 on paper (light), 15.4:1 (dark) |
| mute | `#5C5648` | `#B3AA96` | secondary text | 6.3:1 on paper (light), 7.9:1 (dark) |
| teal | `#0D5A4B` | `#6FC9AF` | core 2: redeemed, discount held, graduated | green = value kept; 7.0:1 on paper |
| accent | `#C93C12` | `#FF7A4D` | the one moment: buy and launch actions, discount figure | white on accent 5.1:1 (light) |

Theme: light default. Dark toggle ships and both are verified (R-21, R-34). Reason for light default: the product is a consumer-facing credit, not a terminal.

## Typography

- Display: Bricolage Grotesque. Reason: a little ink-trap character reads as print, not as the AI default roster.
- Body and data: Public Sans, tabular numerals on every figure. Reason: neutral and legible for prices and ledgers.
- No monospace as aesthetic (R-06). Code samples use the system monospace stack because they are literal code.

## Shape, depth, effects

- Radius: 6px on panels and inputs, 4px on controls, ticket notches are circles. No pills.
- Borders: 1.5px ink lines carry structure. Zero blur, zero glow, zero gradient. Elevation: none, except the sticky buy panel which gets a hard offset edge (R-12 reason: it floats over the ledger while scrolling).
- Icons: three hand-drawn SVGs (theme, wallet, copy). No icon library.

## Motion (dial 1)

Hover, press and focus states only, plus one purposeful fill: the curve progress bar animates once on mount to show how far the curve has moved. All motion is disabled under `prefers-reduced-motion`.

## Copy rules

English UI. Sentence case. No em dash, no emoji, no buzzwords. CTAs name the action ("Launch a kuota", "Browse live kuota").

## Layout rhythm

Home alternates: asymmetric hero with the voucher, wide code panel plus narrow note, full-bleed teal band for the price path, ledger left with stamp column, and a plain footer. Each page is built from its own content, not a shared section template.
