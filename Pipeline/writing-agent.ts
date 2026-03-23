/**
 * Cortex Writing Agent
 *
 * Phase 3 of the pipeline — the critical innovation.
 * Writes prose AND captures honest reasoning traces simultaneously.
 *
 * For each claim, the AI produces:
 *   - The prose text (how it reads in the paper)
 *   - A reasoning chain (what it was thinking)
 *   - Source interpretations (what sources say vs. what's inferred)
 *   - Alternatives considered (what it chose not to say, and why)
 *   - A confidence level (how sure it is)
 *
 * The reasoning is captured DURING generation, not reconstructed after.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  Claim,
  ReasoningStep,
  Section,
  ContentBlock,
  Source,
} from "../schema/cortex-schema.ts";
import type { PlannedOutline, PlannedSection, PlannedClaim } from "./outline-agent.ts";

export interface WriteOptions {
  outline: PlannedOutline;
  sources: Record<string, Source>;
  style: "academic" | "accessible" | "technical";
  model: string;
}

export interface WriteResult {
  sections: Section[];
  claims: Record<string, Claim>;
  reasoning: Record<string, ReasoningStep>;
}

export async function writeSections(options: WriteOptions): Promise<WriteResult> {
  const client = new Anthropic();
  const allClaims: Record<string, Claim> = {};
  const allReasoning: Record<string, ReasoningStep> = {};
  const sections: Section[] = [];

  for (const plannedSection of options.outline.sections) {
    const { section, claims, reasoning } = await writeSection(
      client,
      plannedSection,
      options.sources,
      options.style,
      options.model,
    );
    sections.push(section);
    Object.assign(allClaims, claims);
    Object.assign(allReasoning, reasoning);
  }

  return { sections, claims: allClaims, reasoning: allReasoning };
}

async function writeSection(
  client: Anthropic,
  planned: PlannedSection,
  sources: Record<string, Source>,
  style: string,
  model: string,
): Promise<{
  section: Section;
  claims: Record<string, Claim>;
  reasoning: Record<string, ReasoningStep>;
}> {
  // Build source context for this section's claims
  const relevantSourceIds = new Set(
    planned.plannedClaims.flatMap((c) => c.sourceRefs),
  );
  const sourceContext = Array.from(relevantSourceIds)
    .map((id) => {
      const src = sources[id];
      if (!src) return "";
      return `${id}: ${src.authors.join(", ")} (${src.year}) "${src.title}"
  Excerpt: "${src.relevant_excerpt}" [${src.excerpt_location}]`;
    })
    .filter(Boolean)
    .join("\n\n");

  const claimDescriptions = planned.plannedClaims
    .map(
      (c) =>
        `${c.id} [${c.claimType}]: ${c.plannedText} → sources: [${c.sourceRefs.join(", ")}]${c.unsupported ? " (UNSUPPORTED)" : ""}`,
    )
    .join("\n");

  const result = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are writing a section of a Cortex paper — a transparent academic document where every claim carries its own reasoning chain.

SECTION: ${planned.title}
STYLE: ${style}

PLANNED CLAIMS (write prose incorporating ALL of these):
${claimDescriptions}

AVAILABLE SOURCES:
${sourceContext}

For EACH claim, produce TWO things simultaneously:

1. PROSE: Write the claim as natural academic prose. Wrap the claim text in a span tag:
   <span class="claim" data-claim="CLAIM_ID" data-confidence="CONFIDENCE_0_100" data-type="CLAIM_TYPE">claim text here</span>

2. REASONING: A chain of reasoning steps showing your thought process. Be honest — show what you actually considered, not a post-hoc rationalization. Include:
   - What you searched for / consulted
   - How you interpreted the sources (what they literally say vs. what you're inferring)
   - What alternatives you considered and why you rejected them
   - Your confidence level and why

Return JSON:
{
  "paragraphs": [
    {
      "text": "Full paragraph HTML with <span class='claim'> tags wrapping claims",
      "claim_refs": ["c001", "c002"]
    }
  ],
  "claims": {
    "c001": {
      "text": "The claim text without HTML",
      "confidence": 0.85,
      "claim_type": "empirical",
      "source_refs": ["src001", "src002"],
      "synthesis": false,
      "unsupported": false,
      "alternatives_considered": [
        { "text": "An alternative claim", "reason_rejected": "Why rejected" }
      ]
    }
  },
  "reasoning": {
    "r001": {
      "claim_id": "c001",
      "step_number": 1,
      "type": "query",
      "content": "What I searched for and why",
      "parent_id": null,
      "source_refs": []
    },
    "r002": {
      "claim_id": "c001",
      "step_number": 2,
      "type": "evaluation",
      "content": "What I found and how I assessed it",
      "parent_id": "r001",
      "source_refs": ["src001"]
    }
  }
}

CRITICAL:
- Write naturally flowing prose, not a list of claims
- Each paragraph should contain 1-3 claims woven into readable text
- Reasoning chains should be HONEST — show real thought process
- Confidence must reflect actual certainty (don't inflate)
- Normative claims must be explicitly typed and have lower confidence`,
      },
    ],
  });

  const parsed = parseJSON<{
    paragraphs: Array<{ text: string; claim_refs: string[] }>;
    claims: Record<string, Partial<Claim>>;
    reasoning: Record<string, Partial<ReasoningStep>>;
  }>(extractText(result));

  // Structure the section
  const content: ContentBlock[] = parsed.paragraphs.map((p) => ({
    type: "paragraph" as const,
    text: p.text,
    claim_refs: p.claim_refs,
  }));

  const section: Section = {
    id: planned.id,
    title: planned.title,
    level: planned.level,
    content,
  };

  // Structure claims with full schema
  const claims: Record<string, Claim> = {};
  for (const [id, c] of Object.entries(parsed.claims)) {
    claims[id] = {
      id,
      text: c.text ?? "",
      section_id: planned.id,
      claim_type: (c.claim_type as Claim["claim_type"]) ?? "empirical",
      confidence: c.confidence ?? 0.5,
      reasoning_chain: Object.entries(parsed.reasoning)
        .filter(([, r]) => r.claim_id === id)
        .sort((a, b) => (a[1].step_number ?? 0) - (b[1].step_number ?? 0))
        .map(([rid]) => rid),
      source_refs: c.source_refs ?? [],
      alternatives_considered: c.alternatives_considered ?? [],
      unsupported: c.unsupported ?? false,
      synthesis: c.synthesis ?? false,
    };
  }

  // Structure reasoning with timestamps
  const reasoning: Record<string, ReasoningStep> = {};
  for (const [id, r] of Object.entries(parsed.reasoning)) {
    reasoning[id] = {
      id,
      claim_id: r.claim_id ?? "",
      step_number: r.step_number ?? 1,
      type: (r.type as ReasoningStep["type"]) ?? "query",
      content: r.content ?? "",
      parent_id: r.parent_id ?? null,
      source_refs: r.source_refs ?? [],
      captured_at: new Date().toISOString(),
    };
  }

  return { section, claims, reasoning };
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
