import { tool } from "langchain";
import { z } from "zod";

import {
  RESEARCH_LENSES,
  getResearchLensGuidance,
} from "../content.js";
import { normalizeLens, toJson } from "./shared.js";

export function createLookupResearchLensTool() {
  return tool(
    async ({ lens }: { lens: string }) => {
      const resolvedLens = normalizeLens(lens);

      if (!resolvedLens) {
        return toJson({
          error: "unknown_research_lens",
          received: lens,
          supportedLenses: RESEARCH_LENSES,
        });
      }

      return toJson({
        lens: resolvedLens,
        guidance: getResearchLensGuidance(resolvedLens),
      });
    },
    {
      name: "lookup_research_lens",
      description:
        "Return structured guidance for a specific research lens such as product, market, business, or risk.",
      schema: z.object({
        lens: z
          .string()
          .describe("The research lens to inspect, for example product, market, business, or risk."),
      }),
    },
  );
}
