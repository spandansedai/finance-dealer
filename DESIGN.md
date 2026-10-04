# Finance-Dealer — Design Language

**खाता (Khata) — the bound account book.**

The reference object is not a dashboard. It is the red cloth-bound ledger a Nepali household or
shopkeeper opens fresh at Laxmi Puja — the one festival in the year that is explicitly about
money — and writes in by hand all year. Everything below is derived from that object and from the
two other artefacts this app actually deals with: the bank passbook and the NEPSE floor sheet.

**Revision history.**
1. The first pass carried the concept too far: a saturated crimson as structural chrome, a
   double-ruled masthead, a solid-colour binding edge, a hard graphic offset shadow. Read as harsh.
2. The second pass went fully monochrome — no accent colour anywhere, everything carried by
   weight and contrast alone. Correct in principle, but read as flat.
3. This pass restores two deliberate named accents — Indigo and Marigold — chosen specifically
   so neither sits near the gain/loss hues and gets mistaken for a data signal. They're used only
   at the points that need them: the mark, primary actions, active states, and secondary
   emphasis. Chrome, borders, and body text stay neutral, so the colour still reads as intentional
   rather than decorative. The Devanagari companion labels were also dropped in this pass — the
   ledger vocabulary (lakh grouping, the fiscal stamp, the floor sheet) carries the identity on
   its own without them.

---

## 1. Colour

A neutral scale for structure and text, two data-signal colours, and two named accents used
sparingly and on purpose.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `paper` | `#F6F5F3` | `#18181A` | Page background. Quiet neutral, not tinted toward warm or cool. |
| `sheet` / `sheet-alt` | `#FCFBF9` / `#EDEBE6` | `#1E1E20` / `#26262A` | Card surface and its header/footer band. |
| `ink` | `#232323` | `#E9E9E7` | Primary text and structural chrome — borders, secondary buttons, table rules. |
| `ink-soft` / `ink-faint` | `#625F58` / `#96938A` | `#A6A39B` / `#726F67` | Secondary and tertiary text. |
| `rule` / `rule-strong` | `#E4E2DD` / `#D3CFC7` | `#2C2C2E` / `#38383B` | Hairline borders; `rule-strong` for anything that needs to read as a boundary rather than a hint. |
| **Indigo** (`khata`) | `#4B4F96` | `#9598D9` | Brand mark, primary actions, active/selected states, links. The one colour that says "this is FinanceDealer." |
| **Marigold** (`sayapatri`) | `#B9860F` | `#E0A83C` | Secondary emphasis: guest mode, stale rates, locked/reconciliation states. A step below Indigo, never competing with it. |
| `gain` / `loss` | `#4B7A5A` / `#A85A4E` | `#6FA37D` / `#C4796B` | Financial signal only: profit/loss figures, inflow/outflow. Chosen to sit clearly apart from both Indigo and Marigold so a figure is never mistaken for a button. |

Rules that keep it honest:

- `gain`/`loss` are **data signal only** — never chrome, never a button, never a section heading.
- Every signed figure also carries an explicit `+`/`−`, so colour is never the only channel.
- Indigo and Marigold are applied at specific, repeatable points (the mark, `.btn-ink`, active
  nav/segment states, links; `.btn-warn`, `.note-warn`, lock badges) — never as a generic
  "brand tint" smeared across backgrounds. Everything else — body copy, borders, secondary
  buttons, the masthead rule — stays neutral ink, so the two accents still read as deliberate.
- No emerald/sky/violet SaaS defaults, and nothing in the red family except `loss` itself.

## 2. Type

**Geist Sans** for everything set in words — mastheads, headings, body, form controls. One
family, so the page reads as a single quiet voice rather than a demonstration of typefaces.

**IBM Plex Mono** — every figure, ticker, date, and currency code. Real tabular figures, and a
slightly mechanical character that reads as *statement printout*. This is the only other voice in
the system, and it is reserved strictly for data.

Numerals are **lakh-grouped**: `Rs 15,00,000`, not `Rs 1,500,000`. Chart axes abbreviate to
`L` and `Cr`, not `k` and `M`.

## 3. Layout

**The double-entry spread.** The dashboard is a bound page, not a grid of tiles. The figures sit
in the oldest financial layout there is — two facing columns, cash flow on the left, NEPSE equity
on the right — as **ruled rows with dotted leaders and right-aligned figures**, the way a passbook
actually prints. Totals are closed with a single heavier rule.

```
┌─────────────────────────────────────────────────────────────────────┐
│  FD  FinanceDealer      Dashboard  Ledger  Salary  NEPSE  FAQ        │
├─────────────────────────────────────────────────────────────────────┤
│  Account overview                        Shrawan–Ashar, FY 2083/84  │
│  ─────────────────────────────────────────────────────────────────  │
│   Cash flow / नगद प्रवाह      │   Equity / लगानी                     │
│  ─────────────────────────────┼───────────────────────────────────  │
│   Income ............ 15,00,000│  Invested ............ 4,85,200    │
│   Expenses ........... 6,25,000│  Market value ........ 5,49,500    │
│  ──────────────────────────────┼───────────────────────────────────  │
│   Surplus ═══════════ 8,75,000 │  Unrealised ═══════════ +64,300    │
│   Savings rate .......... 56.9%│  Return ................ +13.26%   │
├─────────────────────────────────────────────────────────────────────┤
│  Cash flow            │  Allocation across 6 scrips                 │
│  [ bars ]             │  [ donut ]                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Observations                                                        │
│  ▸ Food & Groceries 24,000 this month, 18% above baseline           │
│  ▸ Banking is 62% of holdings                                       │
└─────────────────────────────────────────────────────────────────────┘
```

On the portfolio page the same grammar becomes a **NEPSE floor sheet**: fixed-width uppercase
ticker slots in their own ruled column, LTP always to 2dp, hairline weight bars instead of pills.

Mobile collapses to one column; the nav becomes a full-width scrollable tab strip on its own row
so nothing can push the page sideways.

## 4. What makes this *this* app

- **Bikram Sambat.** The masthead is dated `Shrawan–Ashar, FY 2083/84`, Nepal's actual fiscal
  year, not "September 2026". No global finance template would do this.
- **Lakh grouping.** Fixed for real — the app was formatting `1,500,000` while its own function
  was named `formatNepaliCurrency` and documented as producing `1,50,000`.
- **NEPSE vocabulary in the layout**: scrips, floor sheet, LTP, fixed ticker slots.
- **The mark itself**: an ascending three-bar tile, drawn from the app's own cash-flow and
  floor-sheet bar charts rather than a generic wordmark or an imported finance-app cliché
  (a rupee glyph, a rounded coin, a generic upward arrow). See `components/Logomark.tsx` and
  `app/icon.svg` — keep the two in sync if the mark changes.
- **A quiet dark mode.** Same neutral scale, inverted — not a tint flip, not a different material.

## 5. Deliberately not done

The tells this design refuses, and what replaced each:

| Tell | Instead |
| --- | --- |
| Identical rounded cards, same soft grey shadow on everything | Ruled rows and hairline borders, a small consistent 4px radius. Modals get a soft, quiet shadow instead of a floating card shadow. |
| Generic emerald / blue / violet SaaS accent, *or* an equally loud "distinctive" accent as overcorrection | No accent at all. `ink` itself, applied with weight, carries every primary/active state. |
| A double-ruled masthead, a solid-colour binding-edge column, a hard graphic offset shadow | Single hairline rules throughout; no binding edge; a soft, low shadow only on modals. |
| ALL-CAPS eyebrows above every section | Sentence case throughout. Uppercase survives in exactly two places, both factual: NEPSE tickers and currency codes. |
| `01` / `02` / `03` markers | None. Nothing here is a sequence. |
| Meta text joined with `·` or ` — ` | Removed. Replaced with words or a hairline divider element. |
| The same fade-in/slide-up on every card | No entrance animation at all. Only 120ms colour/border transitions on hover/focus, which are functional feedback. |
| A multi-typeface "look" (display face + mono + body face) as a proof of craft | Two families total: Geist Sans for words, IBM Plex Mono for data. Restraint over demonstration. |
