/**
 * Cortex Verify Agent
 *
 * Phase 4 of the pipeline. An INDEPENDENT, ADVERSARIAL agent that
 * tries to find problems with the paper's claims, sources, and reasoning.
 *
 * This agent is separate from the writing agent — its job is to catch
 * errors, not to confirm. It's scored on what it finds, not what it passes.
 *
 * Verification tiers:
 *   1. Source existence — does the URL/DOI resolve?
 *   2. Claim-source alignment — do sources actually support the claim?
 *   3. Cross-source consistency — do multiple sources agree?
 *   4. Reasoning chain audit — is the logic sound?
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  Claim,
  Source,
  ReasoningStep,
  ValidationRun,
  ValidationCheck,
  ValidationSummary,
} from "../schema/cortex-schema.ts";

export interface VerifyOptions {
  claims: Record<string, Claim>;
  sources: Record<string, Source>;
  reasoning: Record<string, ReasoningStep>;
  model: string;
}

export async function verifyClaims(options: VerifyOptions): Promise<ValidationRun> {
  const client = new Anthropic();
  const checks: ValidationCheck[] = [];
  let checkIdx = 1;

  // ─── Tier 1: Source Existence ─────────────────────────
  for (const [id, src] of Object.entries(options.sources)) {
    if (src.doi) {
      const exists = await checkDOI(src.doi);
      checks.push({
        check_id: `chk${String(checkIdx++).padStart(3, "0")}`,
        type: "source_exists",
        target_id: id,
        result: exists ? "pass" : "fail",
        detail: exists
          ? `DOI ${src.doi} resolves successfully`
          : `DOI ${src.doi} could not be resolved — source may not exist`,
        suggestion: exists ? undefined : "Verify this citation manually or replace with a confirmed source",
      });

      // Update source verification status
      src.verification_status = exists ? "verified" : "failed";
      src.verified_at = new Date().toISOString();
    } else if (src.url) {
      const exists = await checkURL(src.url);
      checks.push({
        check_id: `chk${String(checkIdx++).padStart(3, "0")}`,
        type: "source_exists",
        target_id: id,
        result: exists ? "pass" : "warn",
        detail: exists
          ? `URL resolves: ${src.url}`
          : `URL returned non-200: ${src.url}`,
        suggestion: exists ? undefined : "Check archived version or find alternative URL",
      });
      src.verification_status = exists ? "verified" : "degraded";
      src.verified_at = new Date().toISOString();
    }
  }

  // ─── Tier 2-4: AI-Driven Verification ────────────────
  // Package everything for the adversarial review agent
  const claimsSummary = Object.entries(options.claims)
    .map(([id, c]) => {
      const srcDetails = c.source_refs
        .map((sid) => {
          const s = options.sources[sid];
          return s ? `  ${sid}: "${s.relevant_excerpt}" [${s.excerpt_location}]` : `  ${sid}: (source not found)`;
        })
        .join("\n");
      const reasoningDetails = c.reasoning_chain
        .map((rid) => {
          const r = options.reasoning[rid];
          return r ? `  Step ${r.step_number} [${r.type}]: ${r.content}` : `  ${rid}: (step not found)`;
        })
        .join("\n");
      return `CLAIM ${id} [${c.claim_type}, confidence: ${c.confidence}]:
"${c.text}"
Sources:\n${srcDetails}
Reasoning:\n${reasoningDetails}
Unsupported: ${c.unsupported} | Synthesis: ${c.synthesis}`;
    })
    .join("\n\n---\n\n");

  const verification = await client.messages.create({
    model: options.model,
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: `You are an adversarial academic reviewer. Your job is to find problems, NOT to confirm. You are scored on what you catch.

Review these claims from a Cortex paper. For each claim, check:

1. CLAIM-SOURCE ALIGNMENT: Does the cited source actually support the specific claim being made? Check the excerpt against the claim text. Flag any mismatch.

2. CONFIDENCE JUSTIFICATION: Is the stated confidence level appropriate? Too high for weak evidence? Too low for strong consensus?

3. LOGIC AUDIT: Is the reasoning chain logically valid? Are there leaps, false equivalences, or unstated assumptions?

4. ALTERNATIVES FAIRNESS: Were rejected alternatives fairly represented, or were they straw-manned?

5. NORMATIVE FLAGS: Are value judgments and speculative claims properly flagged as normative?

CLAIMS TO REVIEW:
${claimsSummary}

Return JSON array of checks:
[
  {
    "type": "claim_supported" | "confidence_justified" | "logic_valid" | "alternatives_fair" | "normative_flagged",
    "target_id": "claim_id",
    "result": "pass" | "warn" | "fail",
    "detail": "Specific explanation",
    "suggestion": "How to fix (if warn/fail)"
  }
]

Be rigorous. A good review finds at least one issue. Do not rubber-stamp.`,
      },
    ],
  });

  const aiChecks = parseJSON<Partial<ValidationCheck>[]>(extractText(verification));
  for (const check of aiChecks) {
    checks.push({
      check_id: `chk${String(checkIdx++).padStart(3, "0")}`,
      type: (check.type as ValidationCheck["type"]) ?? "claim_supported",
      target_id: check.target_id ?? "",
      result: (check.result as ValidationCheck["result"]) ?? "warn",
      detail: check.detail ?? "",
      suggestion: check.suggestion,
    });
  }

  // ─── Build Summary ────────────────────────────────────
  const claimIds = Object.keys(options.claims);
  const sourceIds = Object.keys(options.sources);

  const claimChecks = checks.filter(
    (c) => claimIds.includes(c.target_id) && c.type === "claim_supported",
  );
  const claimsVerified = claimChecks.filter((c) => c.result === "pass").length;
  const claimsFlagged = claimChecks.filter((c) => c.result !== "pass").length;

  const sourceChecks = checks.filter(
    (c) => sourceIds.includes(c.target_id) && c.type === "source_exists",
  );
  const sourcesLive = sourceChecks.filter((c) => c.result === "pass").length;
  const sourcesDegraded = sourceChecks.filter((c) => c.result === "warn").length;
  const sourcesDead = sourceChecks.filter((c) => c.result === "fail").length;

  const logicChecks = checks.filter((c) => c.type === "logic_valid");
  const logicIssues = logicChecks.filter((c) => c.result !== "pass").length;

  const summary: ValidationSummary = {
    total_claims: claimIds.length,
    claims_verified: claimsVerified || claimIds.length - claimsFlagged,
    claims_flagged: claimsFlagged,
    total_sources: sourceIds.length,
    sources_live: sourcesLive,
    sources_degraded: sourcesDegraded,
    sources_dead: sourcesDead,
    reasoning_chains_audited: claimIds.length,
    logic_issues_found: logicIssues,
  };

  return {
    run_id: `val_${Date.now()}`,
    run_at: new Date().toISOString(),
    agent: `${options.model} (adversarial verify mode)`,
    summary,
    checks,
  };
}

// ─── Network Verification Helpers ───────────────────────

async function checkDOI(doi: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://doi.org/${doi}`, {
      method: "HEAD",
      redirect: "follow",
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function checkURL(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });
    return resp.ok;
  } catch {
    return false;
  }
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
