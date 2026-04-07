import { tool } from "langchain";
import { z } from "zod";

import {
  CONFIDENCE_LEVELS,
  RESEARCH_ASPECTS,
  getConfidenceRule,
} from "../content.js";
import {
  normalizeAspect,
  normalizeConfidence,
  scoreInterpretation,
  toJson,
} from "./shared.js";

export function createScoreResearchConfidenceTool() {
  return tool(
    async ({
      aspect,
      evidenceCoverage,
      confidence,
    }: {
      aspect: string;
      evidenceCoverage: number;
      confidence: string;
    }) => {
      const resolvedAspect = normalizeAspect(aspect);
      const resolvedConfidence = normalizeConfidence(confidence);

      if (!resolvedAspect || !resolvedConfidence) {
        return toJson({
          error: "invalid_confidence_inputs",
          received: {
            aspect,
            confidence,
          },
          supportedAspects: RESEARCH_ASPECTS,
          supportedConfidenceLevels: CONFIDENCE_LEVELS,
        });
      }

      const clampedCoverage = Math.max(0, Math.min(10, evidenceCoverage));
      const confidenceBoost = {
        low: 0,
        medium: 1,
        high: 2,
      } as const;
      const score = clampedCoverage + confidenceBoost[resolvedConfidence];

      return toJson({
        aspect: resolvedAspect,
        evidenceCoverage: clampedCoverage,
        confidence: resolvedConfidence,
        score,
        interpretation: scoreInterpretation(score),
        rule: getConfidenceRule(resolvedConfidence),
      });
    },
    {
      name: "score_research_confidence",
      description:
        "Score how strong the current research confidence is for a product aspect.",
      schema: z.object({
        aspect: z.string().describe("The product aspect being scored, for example pricing, users, competition, or risk."),
        evidenceCoverage: z.number().min(0).max(10),
        confidence: z.string().describe("Confidence level, usually low, medium, or high."),
      }),
    },
  );
}
