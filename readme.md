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

Run the end-to-end CLI workflow:

```bash
pnpm start
```

This command asks for a product name and executes the full three-phase research pipeline locally.

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

## LangGraph Studio

This project includes a Studio entrypoint for local debugging with LangSmith Studio.

Files involved:

- `langgraph.json`: LangGraph CLI configuration
- `src/studio-workflow.ts`: exported workflow graph entrypoint for Studio

Environment variables:

- `LANGSMITH_API_KEY`: required for LangSmith Studio to connect to your local agent server, but not required by the local workflow code itself
- `LANGSMITH_TRACING=false`: optional if you do not want traces sent to LangSmith

Run the local Studio server:

```bash
pnpm studio:dev
```

This command starts a local LangGraph Agent Server for the Studio wrapper workflow.
In Studio, start the graph with either a plain product name string or an object such as `{ "productName": "LangSmith" }`.
The wrapper then runs phases 1 and 2 automatically and pauses on a phase 3 interrupt for report approval.
You can start the local server without `LANGSMITH_API_KEY`, but the Studio UI connection may still require it.

If you need a tunnel for Safari or remote access:

```bash
pnpm studio:dev:tunnel
```

When phase 3 is reached, resume the interrupt with `y` to generate `report.md` or `n` to stop before report generation.
This Studio integration wraps the full workflow rather than exposing only the low-level supervisor agent.

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
