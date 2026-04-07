import path from "node:path";

import { PHASE_TITLES, WORKSPACE_ROOT, type ResearchTarget } from "../content.js";
import {
  getLastMessageText,
  printAction,
  printResult,
  printSection,
  singleLine,
  writeExecutionLog,
} from "../helpers.js";
import { type ResearchAgentResources } from "../runtime.js";

function buildPhase2SeedMessage(target: ResearchTarget) {
  return `This is phase 2 of the product research workflow. Read the raw material under ${target.outputPaths.rawDirectory}, then write the stable conclusions about "${target.productName}" to /memories${target.outputPaths.memoryProduct}. Cover at least the core value proposition, most likely target users, main competitive relationships, key risks, major source-backed facts, and the next research priorities. Confirm briefly after writing it.`;
}

function buildPhase2RecallMessage(target: ResearchTarget) {
  return `This is the phase 2 recap in a new thread. Read /memories${target.outputPaths.memoryProduct} and the raw material under ${target.outputPaths.rawDirectory}, then organize that information into a clean wiki document for "${target.productName}" at ${target.outputPaths.wiki}. The wiki must organize the raw findings into clear sections, preserve source-aware detail, separate facts from assumptions, and make the material easy to browse. Briefly explain why this proves durable memory works across threads.`;
}

function threadConfig(threadId: string) {
  return {
    configurable: { thread_id: threadId },
  };
}

export async function runPhase2LongTermMemory(
  resources: ResearchAgentResources,
  target: ResearchTarget,
) {
  printSection(PHASE_TITLES.phase2);
  printAction(
    `Saving durable conclusions for "${target.productName}" and reusing them in a new thread to generate the wiki.`,
  );

  await resources.agent.invoke(
    {
      messages: [{ role: "user", content: buildPhase2SeedMessage(target) }],
    },
    threadConfig(target.threadIds.phase2Seed),
  );
  const seedState = (await resources.agent.getState(
    threadConfig(target.threadIds.phase2Seed),
  )) as { values?: { messages?: unknown } };

  const recall = await resources.agent.invoke(
    {
      messages: [{ role: "user", content: buildPhase2RecallMessage(target) }],
    },
    threadConfig(target.threadIds.phase2Recall),
  );

  const finalMessage = getLastMessageText(recall.messages);
  const executionLogPath = path.join(WORKSPACE_ROOT, target.outputPaths.executionLog);

  await writeExecutionLog(
    executionLogPath,
    `${PHASE_TITLES.phase2} - Memory Capture`,
    seedState.values?.messages,
  );
  await writeExecutionLog(
    executionLogPath,
    `${PHASE_TITLES.phase2} - Wiki Synthesis`,
    recall.messages,
  );

  printResult(
    `Wrote /memories${target.outputPaths.memoryProduct} and generated ${target.outputPaths.wiki}. Final takeaway: ${singleLine(finalMessage || "Phase 2 wiki synthesis is complete.")}`,
  );
}
