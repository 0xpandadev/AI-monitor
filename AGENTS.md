# Repository rules

- This repository contains only **AI Opportunity Monitor**.
- Its purpose is recurring AI-market and company monitoring for strategy and market-research discussions.
- Do not add a free-form research request screen, unrelated historical data, or terminology from other products.
- Use `.agents/skills/update-ai-opportunity-monitor/SKILL.md` for weekly updates.
- Do not mark an update complete until `scripts/import-update.cjs` accepts the weekly JSON.
- Keep confirmed information, candidates, sources, and coverage gaps distinguishable.
- Never present an unavailable API, MCP, RSS feed, or connector as connected.
- The application must not directly call OpenAI or Anthropic APIs.

## Design system

- Keep the product editorial and analytical: one conclusion per screen, strict tables, restrained decoration.
- Use deep navy and neutral gray as the base, orange for discussion/attention, and cobalt only for evidence-backed matrix states.
- A matrix cell is qualitative evidence state (`unknown`, `observed`, `active`, `scaled`), never a count-based ranking.
- Preserve the three-column company detail: current position, change history, official evidence.
- Keep change ledger, enterprise adoption matrix, and meeting mode as first-class views.
- Record material visual changes and rationale in `DESIGN.md`.
