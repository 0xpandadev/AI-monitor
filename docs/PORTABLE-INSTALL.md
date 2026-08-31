# Portable installation

## Goal

Another team member should be able to clone AI Opportunity Monitor, use it with Codex or Claude Code, and preserve the research workflow even when their machine has a different set of global skills.

The repository therefore separates two layers:

1. Required project workflow: shipped inside `.agents/skills` and `.claude/skills`.
2. Optional research enhancers: detected and installed only from allowlisted sources after an explicit command.

Missing optional skills never reduce the watchlist or change the JSON contracts. The embedded procedures remain the fallback.

## Clone and check

```powershell
git clone <AI_OPPORTUNITY_MONITOR_REPOSITORY_URL>
cd ai-opportunity-monitor
npm run doctor
npm run capabilities
npm run skills:check -- --target=both
```

`skills:check` is read-only. It reports project-local skills, user-installed Codex and Claude Code skills, installable missing skills, and embedded fallbacks.

## Explicit installation

```powershell
npm run skills:install -- --target=codex
npm run skills:install -- --target=claude
npm run skills:install -- --target=both
```

The installer:

- installs only dependencies allowlisted in `config/skill-dependencies.json`;
- accepts only HTTPS GitHub sources for automatic skill installation;
- validates that the downloaded folder contains a compatible `SKILL.md`;
- never overwrites an existing skill directory;
- does nothing during `npm install`;
- requires the explicit `--install` path exposed by `npm run skills:install`;
- retains an embedded fallback when installation is unavailable.

## Current dependency status

| Dependency | Role | Delivery |
|---|---|---|
| update-ai-opportunity-monitor | Weekly orchestration and publication | Included for Codex and Claude Code |
| Foresight Radar | Three-year baseline and source maps | Optional; source URL must be registered before repository release |
| Smart Research | Evidence packs and contradiction checks | Optional; installable from its public GitHub repository |
| AIhot | Seven-day discovery | Built-in public REST connector; separate skill is not required |
| Browser verification | Official-source confirmation | Codex or Claude Code runtime capability with embedded fallback |

## Release gate before GitHub publication

Before publishing the repository:

1. Decide whether Foresight Radar will be published as its own repository or distributed inside this repository.
2. Confirm its redistribution license.
3. Replace `unpublished-source-not-recorded` in `config/skill-dependencies.json` with the canonical source.
4. Confirm every external GitHub dependency remains pinned to a reviewed commit SHA rather than a moving branch. Smart Research is already pinned.
5. Run `npm run skills:check -- --target=both`, `npm run doctor`, and `npm test` on a clean machine.
6. Clone the repository under a second OS account and confirm Codex and Claude Code can both produce a valid profile batch.

## Team operation

Do not have multiple researchers edit `data/entity-profiles.json` directly. Allocate non-overlapping company batches, save each result against `schemas/entity-profile-batch.schema.json`, review the evidence, then import the reviewed batch centrally.

Machine-local schedules are not created by Git clone. Register the weekly schedule separately on every computer that should execute the monitor.
