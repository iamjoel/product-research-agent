import { type SubAgent } from "deepagents";

import { researchSubagentPrompt } from "../content.js";
import { createLookupResearchAspectTool } from "./lookup-research-aspect.js";
import { createLookupResearchLensTool } from "./lookup-research-lens.js";
import { createScoreResearchConfidenceTool } from "./score-research-confidence.js";

export function createResearchTools() {
  const lookupResearchAspectTool = createLookupResearchAspectTool();
  const lookupResearchLensTool = createLookupResearchLensTool();
  const scoreResearchConfidenceTool = createScoreResearchConfidenceTool();

  return {
    lookupResearchAspectTool,
    lookupResearchLensTool,
    scoreResearchConfidenceTool,
  };
}

export function createResearchSubagent(
  tools: ReturnType<typeof createResearchTools>,
): SubAgent {
  return {
    name: "market-researcher",
    description:
      "Use this subagent when you need a deeper product-research slice such as users, competition, pricing, or risk.",
    systemPrompt: researchSubagentPrompt,
    tools: [
      tools.lookupResearchAspectTool,
      tools.lookupResearchLensTool,
      tools.scoreResearchConfidenceTool,
    ],
  };
}
