---
name: update-ai-opportunity-monitor
description: Run the AI Opportunity Monitor as a recurring intelligence system: collect, verify, structure, optionally stress-test, and publish source-backed changes across the full fixed watchlist and the AI market.
---

# AI Opportunity Monitor: weekly intelligence orchestrator

This is the repository-owned parent skill. It does not replace Foresight Radar, Smart Research, Palantir Ontology, or MiroFish. It invokes their methods in one fixed operating sequence and saves every stage under one `run_id`.

Use the signed-in Codex or Claude Code session. Do not call OpenAI or Anthropic APIs and do not ask for model API keys.

## The decision this system supports

> Which confirmed AI-market and company moves deserve attention in this period, what is their evidence, and which areas need further research or a human discussion?

The system may recommend items for review. It must never automatically make an external business decision, change a watchlist, publish a candidate as fact, or treat a simulation as evidence.

## Start a weekly run

1. From the repository root, run:

   ```powershell
   npm run doctor
   npm run capabilities
   npm run skills:check -- --target=codex
   npm run research:run -- YYYY-MM-DD
   ```

2. Record the returned `run_id`. Work only in `data/runs/<run_id>/` for this run.
3. Read `manifest.json`, `discovery.json`, `verification.json`, `rankings.json`, `ontology-analysis.json`, `scenario-analysis.json`, `weekly-update.json`, `config/weekly-research.json`, `config/watchlist.json`, `config/sources.json`, and `config/ranking-sources.json` before research.
4. Do not silently install missing skills. Report each unavailable optional adapter with the URL in `config/skill-dependencies.json`, then use the repository fallback.

## Fixed sequence

### 1. Create one common candidate pool

Use these roles before assigning deeper work:

- **Foresight Radar**: review the existing source map and the prior state. Collect official-source candidates for the full watchlist and identify genuine changes, not restatements.
- **AIhot**: review selected items for the target period through all six market lenses in `config/weekly-research.json`. AIhot is discovery only. Preserve its linked original URL and never promote its summary directly to a fact.
- **Opportunity Intelligence adapter, if available**: use its keyword expansion and surrounding-player discovery to identify new Japanese emerging companies, adjacent providers, and search terms. Do not use it to replace the all-company fixed watch.

Save every possible item in `discovery.json` with a unique `id`, category, discovery method, original link, named entity where applicable, and a coverage note. A candidate is not a weekly signal.

### 2. Split verification work only after the pool exists

Use **Smart Research** for each material candidate. Verify an original official release, IR filing, product/release page, official repository, paper, or government source. Run contradiction checks for important claims.

In `verification.json`, keep a separate row for each candidate with:

- `id`, `candidate_id`, `status` (`confirmed`, `candidate`, `retracted`, or `not_verified`)
- direct answer / source-backed fact
- `primary_sources` with URLs, publisher, date, and short evidence
- contradiction, unknown, and coverage notes

All groups in the fixed watchlist must be checked each week. Priority changes research depth, never who is skipped. Do not create activity to fill empty companies.

### 3. Build the current-state and relationship analysis

Use **Palantir Ontology** principles with `config/ontology.json`:

- objects: Company, AIActivity, Offering, Partnership, Source, and Change
- relations: company performed activity; activity affects an offering or internal use; activity relates to a partner; every relation points to verification evidence
- action class: `recommend` only. The action is to place a discussion/research item in the monitor; a human decides what to do externally.

Write `ontology-analysis.json`. A cross-company pattern needs at least two confirmed verification IDs. State the pattern, evidence IDs, counterevidence, unknowns, and the next research question. Do not turn raw item counts into strength scores.

### 3a. Refresh ranking lenses without inventing a single overall rank

Refresh every source in `rankings.json` from its official leaderboard or methodology page. Keep the source-specific measurement separate:

- OpenRouter: developer usage on its own network, not model quality.
- Artificial Analysis: independently run benchmark index, with methodology version.
- Arena: human preference in anonymous pairwise comparisons.
- LiveBench: contamination-resistant objective benchmark.
- SWE-bench Verified: software engineering task success.

For each source record `as_of`, capture time, top rows, metric text, a source URL, and method/version notes. Mark an inaccessible or stale source `not_available`; do not reuse an old ranking as if it were current. Never sum ranks, create a composite score, or call the result “the best AI model.”

### 4. Run MiroFish only when it has a real question

MiroFish is optional and must not run merely because it is installed. Use it only when a decision-relevant theme has multiple confirmed facts and a focused question about adoption, competitive response, partner response, or regulatory reaction.

Before execution, put a source package in `scenario-analysis.json` that names actors, dates, relationships, competing perspectives, and unknowns. If MiroFish is actually run, record the engine, input artifacts, runtime/report artifact paths or URLs, assumptions, and scenarios. Mark all output as `hypothesis`, not fact. If it is not used, leave `status` as `not_requested` or `not_run`.

### 5. Publish verified data only

1. Populate `weekly-update.json` with confirmed changes only. Every signal must have `verification_id` that links to a confirmed verification row.
2. Update affected entity profiles through the established profile-batch process when the current position has actually changed.
3. Run:

   ```powershell
   npm run research:validate -- <run_id>
   npm run research:publish -- <run_id>
   ```

4. Do not report the run as complete until both commands succeed.

## Output contract and boundaries

| File | Meaning | May be shown as fact? |
| --- | --- | --- |
| `discovery.json` | Raw candidates and coverage | No |
| `verification.json` | Primary-source evidence and contradictions | Only `confirmed` rows |
| `ontology-analysis.json` | Evidence-linked cross-company structure | As analysis, never as an unqualified fact |
| `scenario-analysis.json` | Optional hypotheses from a specific scenario | No, always labelled hypothesis |
| `weekly-update.json` | Confirmed changes approved for app import | Yes, after validation |

Finish with: coverage achieved, confirmed changes, candidates requiring review, source gaps, whether MiroFish was used, and the three most important discussion prompts.
