# Product Research Agent

This repository contains a CLI product research agent built with `deepagents` and TypeScript.

The agent asks for a product name, works inside a checked-in `.workspace/` directory, and runs a three-phase workflow:

- harvest raw evidence into `outputs/<slug>/raw/`
- optimize that material into a structured analysis package under `outputs/<slug>/analysis/`
- optionally compile a final `report.md` from the analysis package and a checked-in report template

## Capabilities

- Multi-step planning with `write_todos`
- Filesystem-backed research inputs and outputs
- A focused `market-researcher` subagent for deeper slices such as users, pricing, competition, and risk
- Durable memory stored under `/memories/*`
- Streaming execution during phase 1
- CLI approval before generating the final report

## Project Structure

- `src/main.ts`: CLI entrypoint
- `src/runtime.ts`: agent, backend, memory, and model wiring
- `src/content.ts`: prompts, research frameworks, and output paths
- `src/phases/*`: the three workflow phases
- `src/tools/*`: one file per tool plus shared tool helpers
- `.env.example`: required environment variables
- `.workspace/frameworks/brief.md`: base research brief used by phase 1
- `.workspace/frameworks/report-template.md`: required structure for the final report
- `.workspace/frameworks/*`: checked-in research guidance files read by the agent at runtime

## Installation

```bash
pnpm install
cp .env.example .env
```

Set the required environment variables in `.env`:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

## Run

```bash
pnpm research:agent
```

The agent runs three phases in sequence:

1. `Evidence Harvest`
Reads `.workspace/frameworks/brief.md` and the rest of `.workspace/frameworks/*`, researches the product across the configured dimensions, and writes multiple source-heavy raw files under `outputs/<slug>/raw/`.
2. `Knowledge Base Assembly`
Writes durable findings to `/memories/products/<slug>.md`, then reuses that memory plus the raw files to generate a structured analysis package under `outputs/<slug>/analysis/`.
3. `Final Report Draft`
Waits for CLI confirmation. Enter `y` to generate `report.md` from `analysis/`, `raw/`, and `.workspace/frameworks/report-template.md`. Enter `n` to stop before report generation.

## Outputs

For each product, the agent creates files under `outputs/<product-slug>` inside the runtime workspace:

- `raw/`
- `analysis/`
- `agent-execution-log.md`
- `report.md`

The `raw/` directory is expected to contain multiple focused files rather than a single polished synthesis document.

The `analysis/` directory contains the optimized phase 2 artifacts:

- `evidence-index.md`
- `normalized-facts.md`
- `claims-and-confidence.md`
- `conflicts.md`
- `open-questions.md`
- `knowledge-base.md`

The agent also writes durable findings to `/memories/products/<product-slug>.md`.

`agent-execution-log.md` is cumulative across all phases. It records:

- phase prompts
- assistant responses
- tool calls and arguments
- tool outputs
- approval outcomes in phase 3

## Development

Type-check the project with:

```bash
pnpm typecheck
```

## Implementation Notes

This project uses the installed `deepagents@1.8.8` API directly rather than copying example code verbatim.

`CompositeBackend` is configured with a default shell backend and a routed memory backend:

```ts
new CompositeBackend(defaultBackend, {
  "/memories/": routedBackend,
});
```

That setup allows normal filesystem work to stay in `.workspace/` while durable memory is persisted through `StoreBackend`.
