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
- Relationship map: company-to-topic, company-to-offering, and company-to-partner links derived from the canonical profile and weekly-signal stores. Every edge exposes evidence coverage.
- Insight board: deterministic multi-company patterns with conclusion, source count, limitation, implication, and next-watch action.
- Evidence radar: an ordinal evidence profile, never a total score or company ranking. Hide it until at least four dimensions have confirmed states.

## Visualization contracts

| Surface | Analytical question | Form | Sufficiency and fallback | Palette |
| --- | --- | --- | --- | --- |
| Relationship map | Which companies connect to the same change theme, offering type, or partner? | Two-column node-link SVG | Show only evidence-backed edges; empty state when none exist | Navy companies, cobalt topics, orange partnerships, neutral edges |
| Trend panel | Is a repeated movement visible over time? | Monthly line | Require at least 8 observed months; otherwise show categorical bars and exact coverage | Single cobalt root plus neutrals |
| Evidence radar | What dimensions of one company have confirmed activity? | Ordinal radar, maximum 8 axes | Require at least 4 known axes; otherwise show coverage message | Cobalt fill and stroke plus neutral guides |
| Insight board | Which patterns cross multiple companies and sources? | Evidence cards | Require at least 2 companies and 2 confirmed primary-source signals | Navy structure, orange discussion, cobalt high-confidence state |

## Motion and accessibility

- Motion is limited to the detail drawer and toast, with reduced-motion support.
- Keyboard Escape closes overlays; arrow keys move meeting slides.
- Matrix states use a symbol and a text label in addition to color.

## Decision log

- 2026-08-31: Replaced name-only company presentation with strict evidence matrices and a three-column profile drawer. Reason: the company list is a navigation aid, not the intelligence product.
- 2026-08-31: Added cobalt as a secondary semantic color only for confirmed activity states. Reason: distinguish evidence from orange discussion accents.
- 2026-08-31: Kept incomplete baseline coverage visible. Reason: prevent unresearched companies from being mistaken for inactive companies.
- 2026-08-31: Added a locally derived ontology surface, relationship map, honest trend fallback, evidence radar, and deterministic insight board. Reason: connect company facts into decision-ready patterns without adding Palantir, MiroFish, or direct LLM API dependencies.
- 2026-08-31: Changed matrix state marks from abstract shapes to Japanese state glyphs and added per-company evidence-history counts. Reason: make it clear that cells represent evidence status, not a numeric score or market ranking.
