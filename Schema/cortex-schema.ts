/**
 * Cortex Evidence Store Schema
 *
 * The data model that lives inside every Cortex paper.
 * Claims, reasoning chains, sources, and validations —
 * all structured so the reader never has to trust the author.
 */

// ─── Top-Level Document ──────────────────────────────────

export interface CortexDocument {
  meta: CortexMeta;
  sections: Section[];
  claims: Record<string, Claim>;
  reasoning: Record<string, ReasoningStep>;
  sources: Record<string, Source>;
  validations: ValidationRun[];
}

// ─── Metadata ────────────────────────────────────────────

export interface CortexMeta {
  title: string;
  subtitle?: string;
  authors: Author[];
  generated_at: string; // ISO 8601
  generator: GeneratorInfo;
  schema_version: "1.0";
  paper_hash: string; // SHA-256 of the prose content
  topic: string;
  abstract: string;
  keywords: string[];
}

export interface Author {
  name: string;
  type: "human" | "ai" | "hybrid";
  model?: string; // e.g. "claude-opus-4-6"
  role: string; // e.g. "primary author", "research", "verification"
}

export interface GeneratorInfo {
  pipeline_version: string;
  model_id: string;
  research_model?: string;
  verify_model?: string;
  generated_at: string;
  generation_duration_ms: number;
}

// ─── Document Structure ──────────────────────────────────

export interface Section {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  content: ContentBlock[];
}

export type ContentBlock =
  | { type: "paragraph"; text: string; claim_refs: string[] }
  | { type: "heading"; text: string; level: 1 | 2 | 3 }
  | { type: "blockquote"; text: string; source_ref?: string }
  | { type: "figure"; src: string; caption: string; alt: string }
  | { type: "table"; headers: string[]; rows: string[][] };

// ─── Claims ──────────────────────────────────────────────

export interface Claim {
  id: string;
  text: string; // The claim as stated in the paper
  section_id: string;
  claim_type: ClaimType;
  confidence: number; // 0.0 - 1.0
  reasoning_chain: string[]; // ordered IDs into reasoning store
  source_refs: string[]; // IDs into source store
  alternatives_considered: Alternative[];
  unsupported: boolean; // true if no source backs this claim
  synthesis: boolean; // true if this is analytical synthesis, not direct citation
}

export type ClaimType =
  | "empirical" // backed by data/observation
  | "definitional" // defining a term or concept
  | "analytical" // logical inference from other claims
  | "synthesis" // combining multiple sources into a new insight
  | "methodological" // about process or approach
  | "normative"; // value judgment (flagged as such)

export interface Alternative {
  text: string;
  reason_rejected: string;
}

// ─── Reasoning Chain ─────────────────────────────────────

export interface ReasoningStep {
  id: string;
  claim_id: string;
  step_number: number;
  type: ReasoningType;
  content: string; // What the AI was thinking
  parent_id: string | null; // Previous step in chain
  source_refs: string[]; // Sources consulted at this step
  captured_at: string; // ISO 8601 — when this step was generated
}

export type ReasoningType =
  | "query" // Searching for information
  | "evaluation" // Assessing a source's relevance/reliability
  | "interpretation" // What a source means in context
  | "inference" // Drawing a conclusion from evidence
  | "synthesis" // Combining multiple pieces
  | "decision" // Choosing between alternatives
  | "caveat"; // Noting a limitation or uncertainty

// ─── Sources ─────────────────────────────────────────────

export interface Source {
  id: string;
  type: SourceType;
  // Citation fields
  authors: string[];
  title: string;
  publication?: string; // Journal, book, website
  year?: number;
  doi?: string;
  url?: string;
  archived_url?: string; // Wayback Machine or similar
  isbn?: string;
  // Verification fields
  content_hash: string; // SHA-256 of source content at verification time
  verified_at: string; // ISO 8601
  verification_method: VerificationMethod;
  verification_status: "verified" | "degraded" | "failed" | "unverified";
  // Content fields
  relevant_excerpt: string; // The specific text that supports the claim
  excerpt_location: string; // Where in the source (page, paragraph, etc.)
  reliability_rating: number; // 0.0 - 1.0 based on source type and quality
}

export type SourceType =
  | "journal_article"
  | "book"
  | "book_chapter"
  | "conference_paper"
  | "preprint"
  | "institutional_report"
  | "government_data"
  | "news_article"
  | "website"
  | "dataset"
  | "personal_communication";

export type VerificationMethod =
  | "doi_resolved"
  | "url_checked"
  | "isbn_confirmed"
  | "content_hash_matched"
  | "manual_verification"
  | "archive_snapshot";

// ─── Validations ─────────────────────────────────────────

export interface ValidationRun {
  run_id: string;
  run_at: string; // ISO 8601
  agent: string; // Which model/agent ran verification
  summary: ValidationSummary;
  checks: ValidationCheck[];
}

export interface ValidationSummary {
  total_claims: number;
  claims_verified: number;
  claims_flagged: number;
  total_sources: number;
  sources_live: number;
  sources_degraded: number; // URL changed but content matches
  sources_dead: number;
  reasoning_chains_audited: number;
  logic_issues_found: number;
}

export interface ValidationCheck {
  check_id: string;
  type: CheckType;
  target_id: string; // claim, source, or reasoning step ID
  result: "pass" | "warn" | "fail";
  detail: string;
  suggestion?: string; // How to fix, if failed
}

export type CheckType =
  | "source_exists" // Does the URL/DOI resolve?
  | "content_matches" // Does content match hash?
  | "excerpt_accurate" // Does excerpt appear in source?
  | "claim_supported" // Do sources actually support claim?
  | "confidence_justified" // Is the confidence level appropriate?
  | "logic_valid" // Is the reasoning chain logically sound?
  | "alternatives_fair" // Were alternatives fairly considered?
  | "normative_flagged"; // Is a value judgment properly marked?
