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

function buildPhase1Message(target: ResearchTarget) {
  return `This is phase 1 of the product research workflow for "${target.productName}". Start by reading /frameworks/brief.md and everything else under /frameworks, then do comprehensive research across positioning, target users, experience, core functionality, pricing, growth, competitors, risks, and opportunities. You must use the market-researcher subagent for at least one deep-dive slice. This is a multi-step task, so manage the plan with write_todos. Use filesystem tools such as write_file and edit_file to create the phase artifacts. Do not use execute to create directories or write files. In this phase, do not produce a polished synthesis document. Instead, create multiple source-heavy raw files under ${target.outputPaths.rawDirectory}. Keep them focused on original findings, snippets, source references, extracted facts, and rough evidence buckets. The raw directory should contain several files rather than a single document. Finally, use execute only for verification by running \`pwd\` and \`ls -R ${target.outputPaths.directory}\`.`;
}

function threadConfig(threadId: string) {
  return {
    configurable: { thread_id: threadId },
  };
}

export async function runPhase1ResearchScan(
  resources: ResearchAgentResources,
  target: ResearchTarget,
) {
  printSection(PHASE_TITLES.phase1);
  printAction(
    `Running the phase 1 product scan for "${target.productName}" and generating the initial report.`,
  );

  const stream = await resources.agent.stream(
    {
      messages: [{ role: "user", content: buildPhase1Message(target) }],
    },
    {
      ...threadConfig(target.threadIds.phase1),
      streamMode: ["messages"],
      subgraphs: true,
    },
  );

  for await (const chunk of stream) {
    if (!Array.isArray(chunk) || chunk.length !== 3) {
      continue;
    }

    const [, mode, payload] = chunk as [unknown, string, unknown];
    if (mode !== "messages" || !Array.isArray(payload)) {
      continue;
    }
  }

  const snapshot = (await resources.agent.getState(
    threadConfig(target.threadIds.phase1),
  )) as { values?: { messages?: unknown } };
  const finalMessageText = getLastMessageText(snapshot.values?.messages);
  const executionLogPath = path.join(WORKSPACE_ROOT, target.outputPaths.executionLog);

  await writeExecutionLog(
    executionLogPath,
    PHASE_TITLES.phase1,
    snapshot.values?.messages,
    { reset: true },
  );

  printResult(
    `Generated raw research files under ${target.outputPaths.rawDirectory} and wrote the execution log to ${target.outputPaths.executionLog}. Final takeaway: ${singleLine(finalMessageText || "Phase 1 raw collection is complete.")}`,
  );
}
