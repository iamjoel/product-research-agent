import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { MemorySaver } from "@langchain/langgraph";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";
import { ChatOpenAI } from "@langchain/openai";
import {
  CompositeBackend,
  LocalShellBackend,
  StoreBackend,
  createDeepAgent,
} from "deepagents";

import {
  MEMORY_NAMESPACE,
  WORKSPACE_ROOT,
  supervisorPrompt,
  type ResearchTarget,
} from "./content.js";
import { createResearchSubagent, createResearchTools } from "./tools/index.js";

export type ResearchAgentResources = {
  agent: ReturnType<typeof createDeepAgent>;
  shellBackend: LocalShellBackend;
  memoryBackend: StoreBackend;
};

function getModel() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Copy .env.example to .env and fill in your OpenAI key before running the product research agent.",
    );
  }

  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0,
  });
}

export async function createResearchAgentResources(
  target: ResearchTarget,
): Promise<ResearchAgentResources> {
  await mkdir(WORKSPACE_ROOT, { recursive: true });
  await mkdir(path.join(WORKSPACE_ROOT, "outputs", target.slug), {
    recursive: true,
  });
  await mkdir(path.join(WORKSPACE_ROOT, "outputs", target.slug, "raw"), {
    recursive: true,
  });

  const shellBackend = await LocalShellBackend.create({
    rootDir: WORKSPACE_ROOT,
    virtualMode: true,
    inheritEnv: false,
    env: {
      PATH: process.env.PATH ?? "",
    },
  });

  const store = new InMemoryStore();
  const memoryBackend = new StoreBackend(
    {
      state: {},
      store,
    },
    {
      namespace: MEMORY_NAMESPACE,
    },
  );

  const tools = createResearchTools();
  const researchSubagent = createResearchSubagent(tools);

  const agent = createDeepAgent({
    name: `deepagentsjs-product-research-${target.slug}`,
    model: getModel(),
    systemPrompt: supervisorPrompt,
    tools: [
      tools.lookupResearchAspectTool,
      tools.lookupResearchLensTool,
      tools.scoreResearchConfidenceTool,
    ],
    subagents: [researchSubagent],
    checkpointer: new MemorySaver(),
    store,
    backend: (config) =>
      new CompositeBackend(shellBackend, {
        "/memories/": new StoreBackend(config, {
          namespace: MEMORY_NAMESPACE,
        }),
      }),
  });

  return {
    agent,
    shellBackend,
    memoryBackend,
  };
}
