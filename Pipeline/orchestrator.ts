/**
 * Cortex Pipeline Orchestrator
 *
 * Coordinates the full generation pipeline:
 *   Research → Outline → Write → Ground → Verify → Assemble
 *
 * Each phase produces structured output that feeds the next.
 * The reasoning chain is captured DURING generation, not after.
 */

import { researchSources } from "./research-agent.ts";
import { planOutline } from "./outline-agent.ts";
import { writeSections } from "./writing-agent.ts";
import { groundSources } from "./grounding-agent.ts";
import { verifyClaims } from "./verify-agent.ts";
import { assembleDocument } from "./assembler.ts";
import type { CortexDocument, CortexMeta, Author } from "../schema/cortex-schema.ts";

export interface GenerateOptions {
  topic: string;
  outline?: string; // Optional pre-made outline
  style?: "academic" | "accessible" | "technical";
  depth?: "brief" | "standard" | "thorough";
  authors?: Author[];
  model?: string;
}

export async function generateCortexPaper(options: GenerateOptions): Promise<string> {
  const startTime = Date.now();
  const model = options.model ?? "claude-opus-4-6";

  console.log("\n  CORTEX GENERATION PIPELINE");
  console.log("  ═══════════════════════════════════\n");

  // ─── Phase 1: Research ────────────────────────────────
  console.log("  [1/6] Researching sources...");
  const sources = await researchSources({
    topic: options.topic,
    depth: options.depth ?? "standard",
    model,
  });
  console.log(`         Found ${Object.keys(sources).length} sources\n`);

  // ─── Phase 2: Outline ─────────────────────────────────
  console.log("  [2/6] Planning outline and claim map...");
  const outline = await planOutline({
    topic: options.topic,
    sources,
    existingOutline: options.outline,
    style: options.style ?? "academic",
    model,
  });
  console.log(`         ${outline.sections.length} sections, ${outline.totalClaims} planned claims\n`);

  // ─── Phase 3: Write with Live Reasoning ───────────────
  console.log("  [3/6] Writing with live reasoning capture...");
  const { sections, claims, reasoning } = await writeSections({
    outline,
    sources,
    style: options.style ?? "academic",
    model,
  });
  console.log(`         ${Object.keys(claims).length} claims written with ${Object.keys(reasoning).length} reasoning steps\n`);

  // ─── Phase 3.5: Mechanical Grounding ──────────────────
  // Binary checks only — no AI inference. Terminates the verification recursion.
  console.log("  [3.5/6] Running mechanical grounding checks...");
  const groundingResult = await groundSources({
    sources,
    claims,
  });
  console.log(`         ${groundingResult.facts.length} grounding facts produced\n`);

  // ─── Phase 4: Independent Verification ────────────────
  console.log("  [4/6] Running adversarial verification...");
  const validations = await verifyClaims({
    claims,
    sources,
    reasoning,
    groundingFacts: groundingResult.facts,
    model,
  });
  console.log(`         ${validations.summary.claims_verified}/${validations.summary.total_claims} claims verified`);
  console.log(`         ${validations.summary.sources_live}/${validations.summary.total_sources} sources live\n`);

  // ─── Phase 5: Assemble ────────────────────────────────
  console.log("  [6/6] Assembling Cortex document...");

  const meta: CortexMeta = {
    title: outline.title,
    subtitle: outline.subtitle,
    authors: options.authors ?? [
      { name: "AI", type: "ai", model, role: "primary author" },
    ],
    generated_at: new Date().toISOString(),
    generator: {
      pipeline_version: "0.1.0",
      model_id: model,
      research_model: model,
      verify_model: model,
      generated_at: new Date().toISOString(),
      generation_duration_ms: Date.now() - startTime,
    },
    schema_version: "1.0",
    paper_hash: "", // Computed during assembly
    topic: options.topic,
    abstract: outline.abstract,
    keywords: outline.keywords,
  };

  const document: CortexDocument = {
    meta,
    sections,
    claims,
    reasoning,
    sources,
    grounding: groundingResult,
    validations: [validations],
  };

  const html = await assembleDocument(document);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Done in ${duration}s`);
  console.log(`  ${Object.keys(claims).length} claims | ${Object.keys(sources).length} sources | ${Object.keys(reasoning).length} reasoning steps`);
  console.log(`  Verification: ${validations.summary.claims_verified}/${validations.summary.total_claims} passed\n`);

  return html;
}
