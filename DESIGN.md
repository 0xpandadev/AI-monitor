# AI Opportunity Monitor design system

## Product context

The product is a weekly intelligence board for strategy and market-research teams. It must answer three questions quickly: what changed, where each company stands, and what decision makers should discuss next. It is not a generic news reader and not a company-logo gallery.

## Visual direction

The visual character is analytical, editorial, and understated. Deep navy and neutral gray establish the base. Orange marks attention and discussion. Cobalt appears only where a qualitative company state has official evidence; it must not imply market share or a numeric score.

## Typography

- Display: Yu Gothic UI, then BIZ UDPGothic and Japanese system fallbacks.
- Body: BIZ UDPGothic, then Yu Gothic UI and Japanese system fallbacks.
- Data labels: Cascadia Mono, then Consolas.
- Large type is reserved for the weekly conclusion and meeting mode. Tables remain compact.

## Layout and spacing

- Desktop navigation: fixed 248 px dark sidebar.
- Content: fluid canvas with a 1520 px maximum width.
- Main spacing rhythm: 4, 8, 13, 18, 24, 34 px.
- Use borders and whitespace instead of rounded cards and shadows.
- Company detail is a wide drawer with three columns: current position, history, evidence.

## Components

- Change ledger: exact change, previous difference, and source on one row.
- Company matrix: qualitative cells only: unknown, observed, active, scaled.
- Industry matrix: aggregation of researched companies with an explicit coverage warning; never an industry adoption rate.
- Meeting mode: one message per screen with conclusion, evidence, competitor effect, implication, and next watch items.
- Coverage warning: always visible while the three-year baseline is incomplete.

## Motion and accessibility

- Motion is limited to the detail drawer and toast, with reduced-motion support.
- Keyboard Escape closes overlays; arrow keys move meeting slides.
- Matrix states use a symbol and a text label in addition to color.

## Decision log

- 2026-08-31: Replaced name-only company presentation with strict evidence matrices and a three-column profile drawer. Reason: the company list is a navigation aid, not the intelligence product.
- 2026-08-31: Added cobalt as a secondary semantic color only for confirmed activity states. Reason: distinguish evidence from orange discussion accents.
- 2026-08-31: Kept incomplete baseline coverage visible. Reason: prevent unresearched companies from being mistaken for inactive companies.
