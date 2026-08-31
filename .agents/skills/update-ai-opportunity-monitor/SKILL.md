---
name: update-ai-opportunity-monitor
description: Refresh the AI Opportunity Monitor with current, source-verified changes across AI companies, consulting firms, Japanese enterprises, startups, and SaaS companies. Use for the weekly update or a requested current refresh of this board.
---

# Update AI Opportunity Monitor

Use the signed-in Codex session as the research and synthesis environment. Do not request or call an OpenAI or Anthropic API key.

## Capability resolution

This repository owns the workflow. External skill names are optional adapters, not hard dependencies.

1. Read `config/research-capabilities.json` and `config/skill-dependencies.json`, then run `npm run capabilities` and `npm run skills:check`.
2. Resolve work by capability ID: `historical-baseline`, `weekly-discovery`, `deep-verification`, `primary-verification`, and `dashboard-publication`.
3. Use Foresight Radar for the three-year source map and changes when available. Use Smart Research for evidence packs and contradiction checks when available. Use AIhot's public REST API for the latest seven-day discovery lane when available; AIhot is not an MCP server and is not a historical archive for this workflow.
4. When a preferred skill is absent or named differently, execute the embedded fallback in `docs/BASELINE-RESEARCH.md`. Never reduce the watchlist because another machine lacks a global skill.
5. Codex and Claude Code must produce the same JSON contracts, so their outputs can be merged without sharing model API keys.
6. Do not install or overwrite external skills implicitly. When the user explicitly asks to install missing skills, use `npm run skills:install -- --target=codex`; review unresolved or unpinned sources before publication.

## Three-year baseline mode

When asked to build or refresh company fundamentals, read `docs/BASELINE-RESEARCH.md`, `config/entity-intelligence.json`, `data/entity-profiles.json`, and `schemas/entity-profile-batch.schema.json`.

- Generate non-overlapping assignments with `npm run research:batches -- <group-id> <batch-size>`.
- Write one profile batch per assignee. Do not edit `data/entity-profiles.json` concurrently.
- Import each reviewed batch with `npm run profiles:import -- <batch-file>`.
- Mark a profile `complete` only after the specified three-year official-source window has been reviewed.
- Keep internal use, external offerings, partnerships, maturity, development method, and evidence-backed history separate.

1. Work from the repository root and execute `npm run doctor`.
2. Read `config/weekly-research.json`, `config/watchlist.json`, `config/topics.json`, `config/sources.json`, `config/entity-intelligence.json`, the current `data/signals.json`, `data/entity-profiles.json`, and `schemas/weekly-update.schema.json`.
3. Execute `npm run update:template` and use the generated `data/drafts/weekly-update.json` as the only draft.
4. Run the AI market pulse first. Review AIhot's selected information for the complete target week through all six lenses defined in `config/weekly-research.json`: models, products and agents, industry adoption, research, implementation practice, and market or governance perspectives. This lane is not restricted to companies in the watchlist.
5. Treat AIhot titles and summaries as discovery material. Open the linked original source and verify material claims with the original paper, company announcement, product page, official repository, or government source. Do not repeat an AIhot summary as a confirmed fact.
6. Run the company watch second. Check every registered company in all six monitoring groups every week, including all `core`, `extended`, and `candidate` startup and emerging-company entries. Priority changes the order and depth of review only; it never permits skipping a registered company. Give deeper attention to major AI companies, Big 4, MBB, Kearney, Japanese AI startups and emerging companies, major domestic enterprises, and leading domestic/global SaaS companies.
7. Record only an actual change from the prior state. Separate confirmed information from candidates. Do not invent activity to fill the board.
8. For every signal, explain `why_it_matters` for a strategy or market-research discussion. Use only `critical`, `high`, `medium`, or `watch` for importance and `confirmed`, `candidate`, `updated`, or `retracted` for verification.
9. Include source failures and coverage gaps in `source_health` and `limitations`.
10. Execute `npm run update:import -- data/drafts/weekly-update.json`. Do not report completion unless validation succeeds.
11. Update the relevant entity profile after verified changes so the change ledger, current-position summary, maturity stage, and qualitative heatmap remain consistent. A weekly signal must not stay isolated from the company baseline.

The weekly research definition and the baseline research procedure in this repository remain the source of truth when external skills are absent or named differently.

Report verified changes, review candidates, source gaps, and the three most important discussion points.
