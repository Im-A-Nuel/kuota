# Kuota UI direction (v2)

Source: on 2026-10-07 the project owner replaced the v1 "printed voucher" direction with a visual reference: a clean white SaaS landing page with electric blue, large light-weight headlines with one coloured phrase, pill buttons, a glossy 3D object in the hero, a blue gradient stats band, and an icon list of capabilities. The agent transcribed that reference into tokens. Applied under `antislop` (core + `antislop-ui`) and `ui-ux-pro-max`.

Design Read: Product landing and web app for x402 API providers and agent operators, in a bright Swiss-SaaS style with an electric blue brand, dial ENERGY 2 / RHYTHM 3 / MOTION 2.

Dial: ENERGY 2 / RHYTHM 3 / MOTION 2

## What the reference changes, and what the filter keeps

| Reference element | Used as | Reason |
| --- | --- | --- |
| Electric blue + gradient band | Brand colour, one gradient band per page at most | Owner's chosen identity (R-01 allows brand gradients) |
| Light, very large headlines with one coloured phrase | Hero and section titles | The reference's main voice |
| Pill buttons with an arrow circle | Primary CTA only gets the arrow | The arrow marks "go somewhere"; secondary buttons stay plain (R-08) |
| Glossy 3D loop | Inline SVG loop | Reads as the kuota lifecycle: buy, spend, burn. No stock 3D asset |
| Big traction stats (6.5M+, 150k+) | Protocol facts (1:1, 50 to 85%, 10 min) | No real traction yet, so no invented numbers (R-17, R-36) |
| "Backed by" logo row | "Built on" row of the real stack, in text | Kuota has no backers to show; the stack is real (R-18, R-38) |
| Capabilities list | Three real jobs: providers, agents, the public ledger | Each links to a page that exists (R-24) |

## Palette (R-29: 2 core + neutrals, 1 accent)

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| paper | `#FFFFFF` | `#070B24` | page ground |
| card | `#F4F6FF` | `#10163A` | panels, code, inputs ground |
| ink | `#0E1330` | `#F3F5FF` | text (18.2:1, 17.9:1) |
| mute | `#585E7A` | `#A3AACB` | secondary text (6.4:1, 8.5:1) |
| line | `#E3E6F2` | `#232A55` | hairlines between rows (decorative) |
| line-strong | `#7E85A6` | `#6E78A0` | input and control borders (3.6:1, 4.5:1) |
| accent (blue) | `#2340FF` | `#7A8CFF` | brand, buttons, links, focus (6.5:1 both) |
| accent-deep | `#0B1FB8` | `#2340FF` | gradient end, pressed state |
| teal (green) | `#0A7A3C` | `#3DDC84` | discount, "kept value", success |

The blue is the one deliberate accent; green is reserved for money you save.

## Typography

Hanken Grotesk for everything. Reason: a neutral neo-grotesk with real light weights, which the reference's thin, large headlines need, and it is not one of the default AI fonts. Headlines use weight 300 to 400 at large sizes; labels and numbers use 500 to 600. Tabular numerals on every figure.

## Shape and depth

- Radius: pills (`9999px`) for buttons and chips, 24px for cards and bands, 12px for inputs and code blocks.
- Borders: hairline `line` on cards. No heavy ink borders.
- Shadow: one soft elevation for the sticky buy panel only (R-12).
- Gradient: the stats band and the closing band. Nothing else (R-01).

## Motion (dial 2, requested by the owner on 2026-10-07)

- Smooth scrolling with Lenis (wheel, keyboard and `#anchor` links). Purpose: anchor jumps glide instead of teleporting. Dialogs and code blocks keep native scrolling.
- Scroll reveal: blocks fade and rise 28px once as they enter the viewport, with short staggers (120 to 150ms) between siblings. Purpose: leads the eye down the page one block at a time. Each element animates once, never loops.
- Route change: the new page fades up over 450ms (`app/template.tsx`).
- Hover, press and focus states, plus the one-time curve progress fill.
- Under `prefers-reduced-motion` all of it is off: no Lenis, no reveal, no page fade. Without JavaScript nothing is hidden, because the reveal is armed by the head script.

## Copy

English, sentence case, no em dash, no emoji, no buzzwords. CTAs name the action.
