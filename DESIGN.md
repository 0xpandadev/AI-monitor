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

- Update history: exact update, previous difference, and source on one row.
- Digest news board: category-filtered list for weekly or imported signals, with evidence-linked cards.
- Consulting filter strip: Big4, MBB, strategy, general, DX/IT, think tank, FAS, and HR segmentation.
- AI company filter strip: ordinary company-type tags such as Big Tech, model developers, enterprise AI, AI cloud/inference, model distribution, semiconductor/hardware, and AI servers; region tags are a separate filter axis.
- Company matrix: qualitative cells only: unknown, observed, active, scaled.
- Industry matrix: aggregation of researched companies with an explicit coverage warning; never an industry adoption rate.
- Meeting mode: one message per screen with conclusion, evidence, competitor effect, implication, and next watch items.
- Coverage warning: always visible while the 3-5 year baseline is incomplete.
- Relationship map: company-to-topic, company-to-offering, and company-to-partner links derived from the canonical profile and weekly-signal stores. Every edge exposes evidence coverage.
- Insight board: deterministic multi-company patterns with conclusion, source count, limitation, implication, and next-watch action.
- Evidence radar: an ordinal evidence profile, never a total score or company ranking. Hide it until at least four dimensions have confirmed states.

## Visualization contracts

| Surface | Analytical question | Form | Sufficiency and fallback | Palette |
| --- | --- | --- | --- | --- |
| Relationship map | Which companies connect to the same change theme, offering type, or partner? | Two-column node-link SVG | Show only evidence-backed edges; empty state when none exist | Navy companies, cobalt topics, orange partnerships, neutral edges |
| Theme momentum | Which AI themes are moving now versus the previous period? | Thematic momentum board | Compare recent 90 days with the previous 90 days; label as acceleration/continuation/new activity and never present raw monthly counts as a market trend | Cobalt bars, orange acceleration badges, neutral context |
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
- 2026-08-31: Restored the category-filtered digest news board, renamed the change ledger to update history, and added consulting segment filters. Reason: the dashboard must support both weekly news reading and long-term company-baseline comparison.
- 2026-08-31: Renamed the scaled matrix state from commercial language to full-scale rollout wording. Reason: avoid implying revenue, market rank, or sales success from a qualitative evidence cell.
- 2026-08-31: Replaced the monthly trend line with a theme momentum board. Reason: sparse monthly counts were easy to misread as a market trend; the useful question is which official-update themes are accelerating, continuing, or newly resurfacing.
- 2026-08-31: Expanded the major AI company surface into an AI supply-chain map with segment filters and a semiconductor/supply-chain axis. Reason: model companies, Chinese model challengers, data/ontology platforms, inference clouds, HBM, fabs, and AI servers affect different strategic questions and should not be collapsed into one flat list.
- 2026-08-31: Added explicit Japan / Global research scope support for Big4 consulting profiles. Reason: Big4 AI capability is often split between local market offerings and global network assets, so the board should show both without double-counting companies.
- 2026-08-31: Split AI company filters into company type and region. Reason: geography and business role answer different questions, so they should be combinable instead of mixed into one label.
