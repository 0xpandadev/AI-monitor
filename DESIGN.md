# AI Opportunity Monitor design system

## Product context

The product is a weekly intelligence board for strategy and market-research teams. It must answer three questions quickly: what changed, where each company stands, and what decision makers should discuss next. It is not a generic news reader and not a company-logo gallery.

## Visual direction

The visual character is analytical, editorial, and understated. Deep navy and neutral gray establish the base. Orange marks attention and discussion. Cobalt appears only where a qualitative company state has official evidence; it must not imply market share or a numeric score.

## Typography

- Display: Yu Gothic UI, then BIZ UDPGothic and Japanese system fallbacks.
- Body: BIZ UDPGothic, then Yu Gothic UI and Japanese system fallbacks.
- Data labels: Cascadia Mono, then Consolas.
- Large type is reserved for the weekly conclusion. Tables remain compact.

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
- Coverage warning: always visible while the 3-5 year baseline is incomplete.
- Relationship surface: the AI市場の動き page shows the period activity matrix and a permanently visible representative relationship map. The map is capped at 12 high-evidence edges for an at-a-glance overview; offering and partnership catalogs retain the full records.
- Player movements: period-confirmed updates are grouped into consulting, Japanese enterprises, startups/emerging, SaaS, and AI companies. The group band shows coverage first; the timeline opens the individual source.
- Consulting comparison: six plain-language columns — 顧客向け提供, 実装・定着能力, 自社AI活用, 共通資産・製品化, 外部連携・エコシステム, AI人材・組織. Industry, client function, and delivery stage remain tags/details rather than radar axes.
- Insight board: deterministic multi-company patterns with conclusion, source count, limitation, implication, and next-watch action.
- Evidence radar: an ordinal evidence profile, never a total score or company ranking. Hide it until at least four dimensions have confirmed states.

## Visualization contracts

| Surface | Analytical question | Form | Sufficiency and fallback | Palette |
| --- | --- | --- | --- | --- |
| Relationship surface | Which companies moved in which AI market layer during the selected period? | Period-scoped activity matrix plus always-visible representative relationship map | Market status controls cover week/month/quarter/year. The graph's company×change-theme view has its own period control; offering and partnership views are baseline relationships | Navy structure, cobalt evidence, orange attention, neutral comparison |
| Theme momentum | Which AI themes are moving now versus the previous period? | Compact thematic signal strip when used in analytical detail | Compare the selected period with the immediately preceding equal window; if sparse, say comparison data is unavailable rather than implying a trend | Cobalt bars, orange increase badges, neutral context |
| Evidence radar | What dimensions of one company have confirmed activity? | Ordinal radar, maximum 8 axes | Require at least 4 known axes; otherwise show coverage message | Cobalt fill and stroke plus neutral guides |
| Insight board | Which patterns cross multiple companies and sources? | Evidence cards | Require at least 2 companies and 2 confirmed primary-source signals | Navy structure, orange discussion, cobalt high-confidence state |

## Motion and accessibility

- Motion is limited to the detail drawer and toast, with reduced-motion support.
- Keyboard Escape closes the detail drawer and search results.
- Matrix states use a symbol and a text label in addition to color.

## Current design decisions

- AI市場の動きは、期間別のAI市場レイヤーマトリクスを主画面にする。
- 関係マップは常時表示し、根拠件数の多い代表12件を一画面で見せる。
- 市場状況と関係マップの期間タグは別管理にする。
- 顧客向け提供と外部提携は、期間変化ではなく基礎関係として扱う。
- すべての状態表示は、一次情報の確認状態であり、企業の優劣や市場シェアではない。
