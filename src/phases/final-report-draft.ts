import path from "node:path";

import { PHASE_TITLES, WORKSPACE_ROOT, type ResearchTarget } from "../content.js";
import {
  assertFilesExist,
  assertReportMatchesTemplate,
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
  return `This is phase 3 of the product research workflow for "${target.productName}". Read the structured analysis package in ${target.outputPaths.analysisDirectory}, the raw material in ${target.outputPaths.rawDirectory}, and /frameworks/report-template.md. Then generate the final report at ${target.outputPaths.report}.

You must treat this as a report compilation and validation task, not a loose rewrite.

Requirements:
- Use ${target.outputPaths.knowledgeBase} as the main synthesis layer.
- Cross-check important claims against ${target.outputPaths.claimsAndConfidence}, ${target.outputPaths.normalizedFacts}, ${target.outputPaths.conflicts}, and ${target.outputPaths.openQuestions}.
- Follow the section structure in /frameworks/report-template.md exactly.
- Distinguish facts, assumptions, and recommendations clearly.
- If evidence is weak or contradictory, say so explicitly instead of smoothing it over.
- Make the report concise, decision-oriented, and source-aware.`;
}

export async function runFinalReportDraftPhase(
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
  const analysisFiles = [
    target.outputPaths.evidenceIndex,
    target.outputPaths.normalizedFacts,
    target.outputPaths.claimsAndConfidence,
    target.outputPaths.conflicts,
    target.outputPaths.openQuestions,
    target.outputPaths.knowledgeBase,
  ].map((filePath) => path.join(WORKSPACE_ROOT, filePath));
  const reportPath = path.join(WORKSPACE_ROOT, target.outputPaths.report);
  const reportTemplatePath = path.join(
    WORKSPACE_ROOT,
    "frameworks",
    "report-template.md",
  );

  if (!shouldContinue) {
    await writeExecutionLogNote(
      executionLogPath,
      `${PHASE_TITLES.phase3} - Approval`,
      "User declined report generation before the phase 3 agent run.",
    );
    printResult("Report generation stopped by user.");
    return false;
  }

  await assertFilesExist(analysisFiles, PHASE_TITLES.phase3);

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
  await assertFilesExist([reportPath], PHASE_TITLES.phase3);
  await assertReportMatchesTemplate(reportTemplatePath, reportPath);

  printResult(
    `Generated ${target.outputPaths.report}. Final takeaway: ${singleLine(finalMessage || "The final report is complete.")}`,
  );

  return true;
}
