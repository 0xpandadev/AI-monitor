---
name: update-ai-opportunity-monitor
description: Refresh the AI Opportunity Monitor with source-verified changes across AI companies, consulting firms, Japanese enterprises, startups, and SaaS companies.
---

# Update AI Opportunity Monitor

Use the signed-in Claude Code subscription. Do not use `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.

## Capability resolution

This repository owns the workflow. External skill names are optional adapters, not hard dependencies.

1. Read `config/research-capabilities.json` and `config/skill-dependencies.json`, then run `npm run capabilities` and `npm run skills:check -- --target=claude`.
2. Resolve work by capability ID: `historical-baseline`, `weekly-discovery`, `deep-verification`, `primary-verification`, and `dashboard-publication`.
3. Use Foresight Radar for the three-year source map and changes when available. Use Smart Research for evidence packs and contradiction checks when available. Use AIhot's public REST API for the latest seven-day discovery lane when available; AIhot is not an MCP server and is not a historical archive for this workflow.
4. When a preferred skill is absent or named differently, execute the embedded fallback in `docs/BASELINE-RESEARCH.md`. Never reduce the watchlist because another machine lacks a global skill.
5. Codex and Claude Code must produce the same JSON contracts, so their outputs can be merged without sharing model API keys.
6. Do not install or overwrite external skills implicitly. When the user explicitly asks to install missing skills, use `npm run skills:install -- --target=claude`; review unresolved or unpinned sources before publication.

## Three-year baseline mode

When asked to build or refresh company fundamentals, read `docs/BASELINE-RESEARCH.md`, `config/entity-intelligence.json`, `data/entity-profiles.json`, and `schemas/entity-profile-batch.schema.json`.

- Generate non-overlapping assignments with `npm run research:batches -- <group-id> <batch-size>`.
- Write one profile batch per assignee. Do not edit `data/entity-profiles.json` concurrently.
- Import each reviewed batch with `npm run profiles:import -- <batch-file>`.
- Mark a profile `complete` only after the specified three-year official-source window has been reviewed.
- Keep internal use, external offerings, partnerships, maturity, development method, and evidence-backed history separate.

1. Execute `npm run doctor`, then read `config/weekly-research.json`, the watchlist, topics, sources, `config/entity-intelligence.json`, current signals, `data/entity-profiles.json`, and the weekly update schema.
2. Execute `npm run update:template`.
3. Run the AI market pulse first. Review AIhot's selected information for the complete target week through the six lenses in `config/weekly-research.json`: models, products and agents, industry adoption, research, implementation practice, and market or governance perspectives. This lane is not restricted to companies in the watchlist.
4. Treat AIhot titles and summaries as discovery material. Open the linked original source and verify material claims with original papers, company announcements, product pages, official repositories, or government sources.
5. Run the company watch second. Check every registered company in all six monitoring groups every week, including all `core`, `extended`, and `candidate` startup and emerging-company entries. Priority changes the order and depth of review only; it never permits skipping a registered company.
6. Record only actual changes, distinguish confirmed information from candidates, and explain why each change matters for a strategy or market-research discussion.
7. Complete `data/drafts/weekly-update.json`, including source gaps and limitations.
8. Execute `npm run update:import -- data/drafts/weekly-update.json`. Do not claim completion if validation fails.
9. Update the relevant entity profile after verified changes so the change ledger, current-position summary, maturity stage, and qualitative heatmap remain consistent. A weekly signal must not stay isolated from the company baseline.

The weekly research definition and the baseline research procedure in this repository remain the source of truth when external skills are absent or named differently.
