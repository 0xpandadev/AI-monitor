---
name: update-ai-opportunity-monitor
description: Run the AI Opportunity Monitor as a recurring intelligence system: collect, verify, structure, optionally stress-test, and publish source-backed changes across the full fixed watchlist and the AI market.
---

# AI Opportunity Monitor: weekly intelligence orchestrator

Use the same workflow and contracts as `.agents/skills/update-ai-opportunity-monitor/SKILL.md`. This repository-owned parent skill orchestrates Foresight Radar, **AIhot MCP**, Smart Research, the optional Opportunity Intelligence adapter, Palantir Ontology, and optional MiroFish without using model API keys. AIhot MCP is discovery-only: collect official releases, papers, official X posts, and posts by globally influential actors; verify material facts against their primary source before publication.

1. Run `npm run doctor`, `npm run capabilities`, `npm run skills:check -- --target=claude`, and `npm run research:run -- YYYY-MM-DD`.
2. Use the returned run directory as the sole workspace for discovery, verification, ontology analysis, optional simulation, and publish data.
3. Follow the exact stages, evidence rules, and publication boundary in `.agents/skills/update-ai-opportunity-monitor/SKILL.md`.
4. Run `npm run research:validate -- <run_id>` then `npm run research:publish -- <run_id>`; do not call an update complete before both pass.

The five run outputs mean: discovery candidates, verified evidence, ontology analysis, optional hypotheses, and publishable confirmed changes. Candidates and MiroFish output must never be presented as confirmed facts.
