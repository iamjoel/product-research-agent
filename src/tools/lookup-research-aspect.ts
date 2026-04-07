import { tool } from "langchain";
import { z } from "zod";

import {
  RESEARCH_ASPECTS,
  getResearchAspectQuestions,
} from "../content.js";
import { normalizeAspect, toJson } from "./shared.js";

export function createLookupResearchAspectTool() {
  return tool(
    async ({ aspect }: { aspect: string }) => {
      const resolvedAspect = normalizeAspect(aspect);

      if (!resolvedAspect) {
        return toJson({
          error: "unknown_research_aspect",
          received: aspect,
          supportedAspects: RESEARCH_ASPECTS,
        });
      }

      return toJson({
        aspect: resolvedAspect,
        questions: getResearchAspectQuestions(resolvedAspect),
      });
    },
    {
      name: "lookup_research_aspect",
      description:
        "Look up a product research aspect and the questions that should be answered for it. Good inputs include value-proposition, target-users, pricing, competition, risk, moat, users, market, or ux.",
      schema: z.object({
        aspect: z
          .string()
          .describe("The research aspect to inspect, for example pricing, users, competition, market, or risk."),
      }),
    },
  );
}
