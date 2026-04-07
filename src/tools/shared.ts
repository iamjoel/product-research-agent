import {
  CONFIDENCE_LEVELS,
  RESEARCH_ASPECTS,
  RESEARCH_LENSES,
  type ConfidenceLevel,
  type ResearchAspect,
  type ResearchLens,
} from "../content.js";

export function toJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export function normalizeAspect(input: string): ResearchAspect | null {
  const normalized = normalizeKey(input);

  const aliases: Record<string, ResearchAspect> = {
    value: "value-proposition",
    positioning: "competition-and-positioning",
    users: "target-users",
    user: "target-users",
    ux: "user-experience",
    experience: "user-experience",
    features: "features-and-workflows",
    feature: "features-and-workflows",
    workflow: "features-and-workflows",
    pricing: "pricing-and-business-model",
    "business-model": "pricing-and-business-model",
    business: "pricing-and-business-model",
    growth: "distribution-and-growth",
    distribution: "distribution-and-growth",
    competition: "competition-and-positioning",
    competitors: "competition-and-positioning",
    market: "competition-and-positioning",
    risk: "risks-and-limitations",
    risks: "risks-and-limitations",
    limitations: "risks-and-limitations",
    moat: "moat-and-opportunities",
    opportunity: "moat-and-opportunities",
    opportunities: "moat-and-opportunities",
  };

  if ((RESEARCH_ASPECTS as readonly string[]).includes(normalized)) {
    return normalized as ResearchAspect;
  }

  return aliases[normalized] ?? null;
}

export function normalizeLens(input: string): ResearchLens | null {
  const normalized = normalizeKey(input);

  if ((RESEARCH_LENSES as readonly string[]).includes(normalized)) {
    return normalized as ResearchLens;
  }

  const aliases: Record<string, ResearchLens> = {
    user: "product",
    users: "product",
    competition: "market",
    competitor: "market",
    pricing: "business",
    growth: "business",
    "go-to-market": "market",
    gtm: "market",
    risks: "risk",
  };

  return aliases[normalized] ?? null;
}

export function normalizeConfidence(input: string): ConfidenceLevel | null {
  const normalized = normalizeKey(input);

  if ((CONFIDENCE_LEVELS as readonly string[]).includes(normalized)) {
    return normalized as ConfidenceLevel;
  }

  const aliases: Record<string, ConfidenceLevel> = {
    weak: "low",
    uncertain: "low",
    moderate: "medium",
    solid: "medium",
    strong: "high",
  };

  return aliases[normalized] ?? null;
}

export function scoreInterpretation(score: number) {
  if (score >= 9) {
    return "Very strong thesis fit.";
  }

  if (score >= 7) {
    return "Solid thesis fit.";
  }

  return "Needs stronger supporting argument.";
}
