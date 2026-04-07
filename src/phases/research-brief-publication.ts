import path from "node:path";

import { PHASE_TITLES, WORKSPACE_ROOT, type ResearchTarget } from "../content.js";
import {
  getLastMessageText,
  printAction,
  printResult,
  printSection,
  promptYesNo,
  singleLine,
  writeExecutionLog,
  writeExecutionLogNote,
} from "../helpers.js";
import { type ResearchAgentResources } from "../runtime.js";

function buildPhase3Message(target: ResearchTarget) {
  return `This is phase 3 of the product research workflow for "${target.productName}". Read ${target.outputPaths.wiki}, ${target.outputPaths.rawDirectory}, and /frameworks/report-template.md. Then write a final report to ${target.outputPaths.report}. Follow the section structure from /frameworks/report-template.md exactly. Use the wiki as the main synthesized source, pull in raw evidence where helpful, and keep the tone concise, decision-oriented, and source-aware.`;
}

export async function runPhase3PublicationApproval(
  resources: ResearchAgentResources,
  target: ResearchTarget,
) {
  printSection(PHASE_TITLES.phase3);
  printAction(
    `Waiting for approval to generate the final report for "${target.productName}".`,
  );

  const shouldContinue = await promptYesNo(
    `Generate report.md for "${target.productName}" now? [y/n]: `,
  );
  const executionLogPath = path.join(WORKSPACE_ROOT, target.outputPaths.executionLog);

  if (!shouldContinue) {
    await writeExecutionLogNote(
      executionLogPath,
      `${PHASE_TITLES.phase3} - Approval`,
      "User declined report generation before the phase 3 agent run.",
    );
    printResult("Report generation stopped by user.");
    return false;
  }

  const generated = await resources.agent.invoke(
    {
      messages: [{ role: "user", content: buildPhase3Message(target) }],
    },
    {
      configurable: { thread_id: target.threadIds.phase3 },
    },
  );
  const finalMessage = getLastMessageText(generated.messages);

  await writeExecutionLog(
    executionLogPath,
    PHASE_TITLES.phase3,
    generated.messages,
  );

  printResult(
    `Generated ${target.outputPaths.report}. Final takeaway: ${singleLine(finalMessage || "The final report is complete.")}`,
  );

  return true;
}
