import path from "node:path";
import process from "node:process";

export const WORKSPACE_ROOT = path.resolve(
  process.cwd(),
  ".workspace",
);

export const MEMORY_NAMESPACE = ["product-research-agent", "shared-memory"];

export const RESEARCH_ASPECTS = [
  "value-proposition",
  "target-users",
  "user-experience",
  "features-and-workflows",
  "pricing-and-business-model",
  "distribution-and-growth",
  "competition-and-positioning",
  "risks-and-limitations",
  "moat-and-opportunities",
] as const;

export const RESEARCH_LENSES = [
  "product",
  "market",
  "business",
  "risk",
] as const;

export const CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
] as const;

export type ResearchAspect = (typeof RESEARCH_ASPECTS)[number];
export type ResearchLens = (typeof RESEARCH_LENSES)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export type ResearchTarget = {
  productName: string;
  slug: string;
  outputPaths: {
    directory: string;
    rawDirectory: string;
    executionLog: string;
    wiki: string;
    report: string;
    memoryProduct: string;
  };
  threadIds: {
    phase1: string;
    phase2Seed: string;
    phase2Recall: string;
    phase3: string;
  };
};

const aspectFramework = {
  "value-proposition": [
    "What frequent or high-value problem does the product solve?",
    "What are the alternatives, and why would users switch away from them?",
    "What is the strongest one-sentence positioning statement?",
  ],
  "target-users": [
    "Who are the core users, buyers, and day-to-day operators?",
    "How do high-value users differ from low-value users?",
    "Which user segments are not a good fit yet?",
  ],
  "user-experience": [
    "How hard is it to get started for the first time?",
    "Are the key experience paths smooth and intuitive?",
    "Which experience issues are most likely to drive churn?",
  ],
  "features-and-workflows": [
    "Which features are core, and which are just nice to have?",
    "Will users form a repeatable workflow around the product?",
    "Are there any obvious capability gaps?",
  ],
  "pricing-and-business-model": [
    "How is the product priced, and does the value justify the price?",
    "Is the revenue model scalable?",
    "Are there obvious pricing objections or frictions?",
  ],
  "distribution-and-growth": [
    "What are the primary acquisition channels?",
    "Does growth depend on brand, channels, word of mouth, or product-led loops?",
    "Where is the growth bottleneck most likely to appear?",
  ],
  "competition-and-positioning": [
    "Who are the closest direct competitors?",
    "Where is the product differentiated, and where is it commoditized?",
    "If competitors copy the main selling points, what advantage remains?",
  ],
  "risks-and-limitations": [
    "What is the biggest current product risk?",
    "Which capability gaps could hurt monetization or retention?",
    "What policy, technical, distribution, or organizational constraints matter?",
  ],
  "moat-and-opportunities": [
    "Where could a durable moat come from over time?",
    "What is the highest-conviction opportunity over the next year?",
    "If resources are limited, what should be strengthened first?",
  ],
} as const satisfies Record<ResearchAspect, readonly string[]>;

const lensFramework = {
  product: [
    "Focus on core features, key experience paths, and task completion efficiency.",
    "Separate high-frequency usage from the capabilities that truly drive retention.",
  ],
  market: [
    "Focus on target users, competitor density, education cost, and substitutes.",
    "Judge whether the product creates new demand or captures existing demand.",
  ],
  business: [
    "Focus on pricing logic, willingness to pay, expansion paths, and business scalability.",
    "Judge whether growth is healthy or dependent on unsustainable channels.",
  ],
  risk: [
    "Focus on adoption barriers, technical constraints, distribution risk, and competitive responses.",
    "Make it explicit which conclusions are high-confidence and which are still speculative.",
  ],
} as const satisfies Record<ResearchLens, readonly string[]>;

const confidenceRules = {
  low: "Evidence is limited or assumption-heavy, so treat the conclusion as exploratory.",
  medium: "There is some supporting evidence, but more user, market, or product data is still needed.",
  high: "Multiple signals reinforce the conclusion, so it can be treated as relatively stable.",
} as const satisfies Record<ConfidenceLevel, string>;

export const supervisorPrompt = `You are a deepagentsjs supervisor running a comprehensive product research workflow.

This is a CLI product research assistant. The user will provide a product name first.

Your job is to deliberately exercise Deep Agents core capabilities:
- Use write_todos for multi-step product research.
- Use filesystem tools to read source material and write structured research artifacts.
- Delegate focused deep dives to the market-researcher subagent via the task tool.
- Use /memories for durable product findings that should persist across threads.
- When the user explicitly asks for shell verification, use execute.

Research comprehensively. Cover product, users, UX, workflows, pricing, growth, competition, risks, and opportunities.
Always answer in concise English unless the user asks otherwise.`;

export const researchSubagentPrompt = `You are the market-researcher subagent.

Your role is to go deep on one slice of product research at a time.
Return compact but concrete notes that help the supervisor build a full product dossier.
Prefer explicit assumptions, competitor framing, user segmentation, and risk-aware conclusions over vague summaries.`;

export const PHASE_TITLES = {
  phase1: "1. Evidence Harvest",
  phase2: "2. Knowledge Base Assembly",
  phase3: "3. Final Report Draft",
  done: "Done",
} as const;

export function createResearchTarget(productName: string): ResearchTarget {
  const slug = slugify(productName);
  const outputDirectory = `outputs/${slug}`;
  const outputPaths = {
    directory: outputDirectory,
    rawDirectory: `${outputDirectory}/raw`,
    executionLog: `${outputDirectory}/agent-execution-log.md`,
    wiki: `${outputDirectory}/wiki.md`,
    report: `${outputDirectory}/report.md`,
    memoryProduct: `/products/${slug}.md`,
  };

  return {
    productName,
    slug,
    outputPaths,
    threadIds: {
      phase1: `${slug}-phase-1`,
      phase2Seed: `${slug}-phase-2-seed`,
      phase2Recall: `${slug}-phase-2-recall`,
      phase3: `${slug}-phase-3`,
    },
  };
}

export function getResearchAspectQuestions(aspect: ResearchAspect) {
  return aspectFramework[aspect];
}

export function getResearchLensGuidance(lens: ResearchLens) {
  return lensFramework[lens];
}

export function getConfidenceRule(confidence: ConfidenceLevel) {
  return confidenceRules[confidence];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";
}
