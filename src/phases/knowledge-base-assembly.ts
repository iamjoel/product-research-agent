import path from "node:path";

import { PHASE_TITLES, WORKSPACE_ROOT, type ResearchTarget } from "../content.js";
import {
  assertFilesExist,
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
  return `This is the phase 2 recap in a new thread. Read /memories${target.outputPaths.memoryProduct}, everything under ${target.outputPaths.rawDirectory}, and the guidance in /frameworks/research-rubric.md, /frameworks/lenses.md, and /frameworks/confidence.md. Your job is to optimize the raw material into a structured analysis package inside ${target.outputPaths.analysisDirectory}.

Create all of the following files:
- ${target.outputPaths.evidenceIndex}: map every raw file to its purpose, source type, and the main claims it supports.
- ${target.outputPaths.normalizedFacts}: deduplicated facts extracted from raw material, grouped by topic.
- ${target.outputPaths.claimsAndConfidence}: key conclusions, each with supporting evidence and an explicit low/medium/high confidence rating.
- ${target.outputPaths.conflicts}: contradictions, ambiguities, and how they should be interpreted.
- ${target.outputPaths.openQuestions}: unresolved questions, evidence gaps, and what should be verified next.
- ${target.outputPaths.knowledgeBase}: the main synthesized knowledge base for "${target.productName}" built from all of the files above.

Requirements:
- Do not just rewrite the raw files.
- Deduplicate overlapping points.
- Separate facts, assumptions, and interpretations.
- Make evidence traceable back to raw files.
- Use the confidence framework explicitly.
- The knowledge base should be easy to browse and should reference the structured analysis files where helpful.

Briefly explain why this proves durable memory works across threads.`;
}

function threadConfig(threadId: string) {
  return {
    configurable: { thread_id: threadId },
  };
}

export async function runKnowledgeBaseAssemblyPhase(
  resources: ResearchAgentResources,
  target: ResearchTarget,
) {
  printSection(PHASE_TITLES.phase2);
  printAction(
    `Saving durable conclusions for "${target.productName}" and reusing them in a new thread to generate the structured analysis package.`,
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
  const requiredPhase2Files = [
    target.outputPaths.evidenceIndex,
    target.outputPaths.normalizedFacts,
    target.outputPaths.claimsAndConfidence,
    target.outputPaths.conflicts,
    target.outputPaths.openQuestions,
    target.outputPaths.knowledgeBase,
  ].map((filePath) => path.join(WORKSPACE_ROOT, filePath));

  await writeExecutionLog(
    executionLogPath,
    `${PHASE_TITLES.phase2} - Memory Capture`,
    seedState.values?.messages,
  );
  await writeExecutionLog(
    executionLogPath,
    `${PHASE_TITLES.phase2} - Structured Analysis`,
    recall.messages,
  );
  await assertFilesExist(requiredPhase2Files, PHASE_TITLES.phase2);

  printResult(
    `Wrote /memories${target.outputPaths.memoryProduct} and generated the analysis package in ${target.outputPaths.analysisDirectory}. Final takeaway: ${singleLine(finalMessage || "Phase 2 analysis synthesis is complete.")}`,
  );
}
