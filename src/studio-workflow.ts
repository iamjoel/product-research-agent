import "dotenv/config";
import path from "node:path";

import {
  Annotation,
  END,
  MemorySaver,
  START,
  StateGraph,
  interrupt,
} from "@langchain/langgraph";

import {
  PHASE_TITLES,
  WORKSPACE_ROOT,
  createResearchTarget,
} from "./content.js";
import { writeExecutionLogNote } from "./helpers.js";
import { generateFinalReport } from "./phases/final-report-draft.js";
import {
  runEvidenceHarvestPhase,
  runKnowledgeBaseAssemblyPhase,
} from "./phases/index.js";
import { createResearchAgentResources } from "./runtime.js";

const StudioWorkflowState = Annotation.Root({
  productName: Annotation<string>(),
  approved: Annotation<boolean>(),
  stoppedBeforeReport: Annotation<boolean>(),
  outputDirectory: Annotation<string>(),
  rawDirectory: Annotation<string>(),
  analysisDirectory: Annotation<string>(),
  executionLog: Annotation<string>(),
  reportPath: Annotation<string>(),
});

function normalizeProductName(input: typeof StudioWorkflowState.State) {
  return typeof input.productName === "string" ? input.productName.trim() : "";
}

function normalizeApproval(input: unknown) {
  if (typeof input === "boolean") {
    return input;
  }

  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    if (normalized === "y" || normalized === "yes") {
      return true;
    }

    if (normalized === "n" || normalized === "no") {
      return false;
    }
  }

  if (input && typeof input === "object" && "approved" in input) {
    const approved = (input as { approved?: unknown }).approved;
    if (typeof approved === "boolean") {
      return approved;
    }
  }

  throw new Error("Phase 3 approval must be resumed with y/yes, n/no, or a boolean.");
}

async function runEvidenceHarvestNode(state: typeof StudioWorkflowState.State) {
  const productName = normalizeProductName(state);

  if (!productName) {
    throw new Error("productName is required.");
  }

  const target = createResearchTarget(productName);
  const resources = await createResearchAgentResources(target);

  await runEvidenceHarvestPhase(resources, target);

  return {
    productName: target.productName,
    outputDirectory: target.outputPaths.directory,
    rawDirectory: target.outputPaths.rawDirectory,
    analysisDirectory: target.outputPaths.analysisDirectory,
    executionLog: target.outputPaths.executionLog,
    reportPath: target.outputPaths.report,
  };
}

async function runKnowledgeBaseAssemblyNode(
  state: typeof StudioWorkflowState.State,
) {
  const productName = normalizeProductName(state);

  if (!productName) {
    throw new Error("productName is required.");
  }

  const target = createResearchTarget(productName);
  const resources = await createResearchAgentResources(target);

  await runKnowledgeBaseAssemblyPhase(resources, target);

  return {
    productName: target.productName,
    outputDirectory: target.outputPaths.directory,
    rawDirectory: target.outputPaths.rawDirectory,
    analysisDirectory: target.outputPaths.analysisDirectory,
    executionLog: target.outputPaths.executionLog,
    reportPath: target.outputPaths.report,
  };
}

async function runFinalReportDraftNode(state: typeof StudioWorkflowState.State) {
  const productName = normalizeProductName(state);

  if (!productName) {
    throw new Error("productName is required.");
  }

  const target = createResearchTarget(productName);
  const resources = await createResearchAgentResources(target);
  const approved = normalizeApproval(
    interrupt({
      question: `Generate report.md for "${target.productName}"? Reply with y or n.`,
      productName: target.productName,
      reportPath: target.outputPaths.report,
      analysisDirectory: target.outputPaths.analysisDirectory,
    }),
  );

  if (!approved) {
    await writeExecutionLogNote(
      path.join(WORKSPACE_ROOT, target.outputPaths.executionLog),
      `${PHASE_TITLES.phase3} - Approval`,
      "Studio reviewer declined report generation before the phase 3 agent run.",
    );

    return {
      productName: target.productName,
      approved: false,
      stoppedBeforeReport: true,
      outputDirectory: target.outputPaths.directory,
      rawDirectory: target.outputPaths.rawDirectory,
      analysisDirectory: target.outputPaths.analysisDirectory,
      executionLog: target.outputPaths.executionLog,
      reportPath: target.outputPaths.report,
    };
  }

  await generateFinalReport(resources, target);

  return {
    productName: target.productName,
    approved: true,
    stoppedBeforeReport: false,
    outputDirectory: target.outputPaths.directory,
    rawDirectory: target.outputPaths.rawDirectory,
    analysisDirectory: target.outputPaths.analysisDirectory,
    executionLog: target.outputPaths.executionLog,
    reportPath: target.outputPaths.report,
  };
}

export const workflow = new StateGraph(StudioWorkflowState)
  .addNode(PHASE_TITLES.phase1, runEvidenceHarvestNode)
  .addNode(PHASE_TITLES.phase2, runKnowledgeBaseAssemblyNode)
  .addNode(PHASE_TITLES.phase3, runFinalReportDraftNode)
  .addEdge(START, PHASE_TITLES.phase1)
  .addEdge(PHASE_TITLES.phase1, PHASE_TITLES.phase2)
  .addEdge(PHASE_TITLES.phase2, PHASE_TITLES.phase3)
  .addEdge(PHASE_TITLES.phase3, END)
  .compile({
    name: "product-research-workflow",
    checkpointer: new MemorySaver(),
  });
