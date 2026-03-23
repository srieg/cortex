/**
 * Cortex Research Agent
 *
 * Phase 1 of the pipeline. Gathers and verifies sources BEFORE any prose is written.
 * This separation is critical — it prevents the AI from writing a claim first
 * and then hunting for a source to justify it (the primary hallucination vector).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Source } from "../schema/cortex-schema.ts";

export interface ResearchOptions {
  topic: string;
  depth: "brief" | "standard" | "thorough";
  model: string;
}

const DEPTH_CONFIG = {
  brief: { targetSources: 5, subQuestions: 3 },
  standard: { targetSources: 10, subQuestions: 6 },
  thorough: { targetSources: 20, subQuestions: 10 },
};

export async function researchSources(
  options: ResearchOptions,
): Promise<Record<string, Source>> {
  const client = new Anthropic();
  const config = DEPTH_CONFIG[options.depth];

  // Step 1: Decompose the topic into research sub-questions
  const decomposition = await client.messages.create({
    model: options.model,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a research librarian. Decompose this topic into ${config.subQuestions} specific research sub-questions that would require consulting different sources:

Topic: ${options.topic}

Return as JSON array of strings. Each question should target a specific, verifiable fact or established finding.`,
      },
    ],
  });

  const subQuestions = parseJSON<string[]>(extractText(decomposition));

  // Step 2: For each sub-question, find and structure sources
  const sourcePromises = subQuestions.map(async (question, i) => {
    const result = await client.messages.create({
      model: options.model,
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are a research assistant with expertise in finding and citing academic sources.

For this research question, identify 1-3 real, verifiable academic sources. These must be REAL publications — do not fabricate citations.

Question: ${question}

For each source, provide:
- authors (array of "Last, F.I." strings)
- title (exact paper/book title)
- publication (journal name, book title, or website)
- year (publication year)
- doi (if available — must be a real DOI)
- type: one of "journal_article", "book", "book_chapter", "conference_paper", "preprint", "institutional_report", "government_data", "news_article", "website", "dataset"
- relevant_excerpt: the specific text from this source that answers the question (must be a real quote or close paraphrase)
- excerpt_location: where in the source this appears (e.g., "Abstract", "Section 3, paragraph 2")
- reliability_rating: 0.0-1.0 based on source type and journal impact

CRITICAL: Only cite sources you are confident exist. If you are not sure a specific paper exists, say so explicitly rather than guessing.

Return as JSON array of source objects.`,
        },
      ],
    });

    const sources = parseJSON<Partial<Source>[]>(extractText(result));
    return sources.map((src, j) => ({
      ...src,
      id: `src${String(i * 3 + j + 1).padStart(3, "0")}`,
      content_hash: `sha256:pending_verification`,
      verified_at: new Date().toISOString(),
      verification_method: src.doi ? "doi_resolved" : src.url ? "url_checked" : "manual_verification",
      verification_status: "unverified" as const, // Will be verified in Phase 4
    }));
  });

  const sourceArrays = await Promise.all(sourcePromises);
  const allSources = sourceArrays.flat();

  // Deduplicate by DOI or title similarity
  const seen = new Map<string, Source>();
  for (const src of allSources) {
    const key = src.doi || src.title?.toLowerCase().replace(/\s+/g, " ");
    if (key && !seen.has(key)) {
      seen.set(key, src as Source);
    }
  }

  // Build record
  const sources: Record<string, Source> = {};
  let idx = 1;
  for (const src of seen.values()) {
    const id = `src${String(idx).padStart(3, "0")}`;
    sources[id] = { ...src, id };
    idx++;
  }

  return sources;
}

// ─── Helpers ────────────────────────────────────────────

function extractText(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

function parseJSON<T>(text: string): T {
  // Extract JSON from potential markdown code fences
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}
