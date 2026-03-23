/**
 * Cortex Outline Agent
 *
 * Phase 2 of the pipeline. Creates a structured outline where every
 * planned claim is pre-mapped to its supporting sources.
 *
 * If a claim can't be sourced, it's flagged as unsupported (but still
 * allowed — some claims are analytical synthesis).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Source } from "../schema/cortex-schema.ts";

export interface OutlineOptions {
  topic: string;
  sources: Record<string, Source>;
  existingOutline?: string;
  style: "academic" | "accessible" | "technical";
  model: string;
}

export interface PlannedOutline {
  title: string;
  subtitle: string;
  abstract: string;
  keywords: string[];
  sections: PlannedSection[];
  totalClaims: number;
}

export interface PlannedSection {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  plannedClaims: PlannedClaim[];
}

export interface PlannedClaim {
  id: string;
  plannedText: string;
  claimType: "empirical" | "definitional" | "analytical" | "synthesis" | "methodological" | "normative";
  sourceRefs: string[];
  unsupported: boolean;
  notes: string;
}

export async function planOutline(options: OutlineOptions): Promise<PlannedOutline> {
  const client = new Anthropic();

  // Build source summary for the prompt
  const sourceSummary = Object.entries(options.sources)
    .map(([id, src]) => `${id}: ${src.authors.join(", ")} (${src.year}) "${src.title}" — Excerpt: "${src.relevant_excerpt}"`)
    .join("\n");

  const styleGuide = {
    academic: "Use formal academic language with precise terminology. Structure follows standard academic paper conventions (introduction, background, analysis, discussion, conclusion).",
    accessible: "Use clear, engaging language accessible to educated non-specialists. Structure follows narrative arc — hook, context, exploration, implications.",
    technical: "Use precise technical language with explicit definitions. Structure follows technical report conventions — problem statement, methodology, findings, applications.",
  };

  const prompt = options.existingOutline
    ? `Given this existing outline and these sources, refine the outline so every claim maps to supporting sources:

EXISTING OUTLINE:
${options.existingOutline}

AVAILABLE SOURCES:
${sourceSummary}

STYLE: ${styleGuide[options.style]}`
    : `Create a structured outline for an ${options.style} paper on this topic, using ONLY these verified sources as evidence:

TOPIC: ${options.topic}

AVAILABLE SOURCES:
${sourceSummary}

STYLE: ${styleGuide[options.style]}

CRITICAL RULES:
- Every empirical claim MUST map to at least one source by ID (e.g., "src001")
- Synthesis claims that combine multiple sources should list all source IDs used
- If a planned claim has no supporting source, mark it as unsupported:true
- Include claim_type for each: empirical, definitional, analytical, synthesis, methodological, or normative
- Normative claims (value judgments, speculative assertions) MUST be explicitly typed as "normative"`;

  const result = await client.messages.create({
    model: options.model,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `${prompt}

Return as JSON matching this structure:
{
  "title": "Paper Title",
  "subtitle": "Paper Subtitle",
  "abstract": "150-250 word abstract",
  "keywords": ["keyword1", "keyword2"],
  "sections": [
    {
      "id": "s1",
      "title": "Section Title",
      "level": 1,
      "plannedClaims": [
        {
          "id": "c001",
          "plannedText": "Brief description of the claim to be written",
          "claimType": "empirical",
          "sourceRefs": ["src001", "src003"],
          "unsupported": false,
          "notes": "Any notes for the writing agent"
        }
      ]
    }
  ]
}`,
      },
    ],
  });

  const outline = parseJSON<PlannedOutline>(extractText(result));

  // Calculate total claims
  outline.totalClaims = outline.sections.reduce(
    (sum, s) => sum + s.plannedClaims.length,
    0,
  );

  return outline;
}

function extractText(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}
