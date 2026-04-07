import "dotenv/config";
import { createInterface } from "node:readline/promises";
import process from "node:process";

import {
  PHASE_TITLES,
  WORKSPACE_ROOT,
  createResearchTarget,
} from "./content.js";
import { printSection } from "./helpers.js";
import {
  runEvidenceHarvestPhase,
  runKnowledgeBaseAssemblyPhase,
  runFinalReportDraftPhase,
} from "./phases/index.js";
import { createResearchAgentResources } from "./runtime.js";

async function promptForProductName() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question("Enter the product name to research: ");
    const productName = answer.trim();

    if (!productName) {
      throw new Error("Product name is required.");
    }

    return productName;
  } finally {
    rl.close();
  }
}

async function main() {
  const productName = await promptForProductName();
  const target = createResearchTarget(productName);
  const resources = await createResearchAgentResources(target);

  await runEvidenceHarvestPhase(resources, target);
  await runKnowledgeBaseAssemblyPhase(resources, target);
  const phase3Completed = await runFinalReportDraftPhase(resources, target);

  if (!phase3Completed) {
    printSection("Stopped");
    console.log("Current action: Exiting after publication was declined.");
    console.log(
      `Result: Research workflow for "${target.productName}" stopped before brief publication.`,
    );
    return;
  }

  printSection(PHASE_TITLES.done);
  console.log("Current action: Wrapping up and printing run details.");
  console.log(
    `Result: Research workflow for "${target.productName}" is complete. Workspace: ${WORKSPACE_ROOT}`,
  );
}

main().catch((error) => {
  console.error("\nRun failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
