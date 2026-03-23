# Cortex

AI-generated papers where every claim shows its reasoning chain and sources. Transparent academic writing with embedded evidence stores.

## What it does

Cortex produces self-contained HTML papers with an embedded evidence store. Every claim in the paper carries its own provenance chain: the reasoning that led to it, the source excerpts that support it, and independent verification results.

## v2: Mechanical grounding layer

v2 adds a grounding phase that fetches primary source content, verifies quoted excerpts actually exist in the source material, and validates citation metadata against CrossRef. This is the termination condition for verification recursion -- once claims are checked against the primary source, there is no further regression to perform.

Evidence is classified into tiers based on how each claim is grounded:

- **Primary** -- Verified against source text with exact or fuzzy excerpt match
- **Secondary** -- Supported by a credible secondary source
- **Synthesis** -- Combines multiple verified sources into a novel point
- **Analytical** -- Logical derivation from verified premises
- **Speculative** -- Explicitly flagged as conjecture

With primary sources as ground truth, the adversarial verification agent's scope narrows to interpretation quality: whether the paper's claims follow from the evidence, not whether the evidence itself is real.

## Structure

- **Pipeline/** -- Agent pipeline (research, outline, writing, grounding, verification, assembly)
- **Schema/** -- TypeScript schema defining the evidence store format
- **Template/** -- HTML template for rendered papers
- **Workflows/** -- Workflow definitions for generating, verifying, and previewing papers
- **SKILL.md** -- Skill definition and configuration

## Pipeline agents

| Agent | Role |
|-------|------|
| `research-agent` | Gathers and validates sources |
| `outline-agent` | Structures the paper's argument |
| `writing-agent` | Drafts sections with inline evidence |
| `grounding-agent` | Fetches source content, verifies excerpts, validates CrossRef metadata |
| `verify-agent` | Adversarial review of interpretation and argument quality |
| `assembler` | Combines sections into final HTML with embedded evidence store |
| `orchestrator` | Coordinates the full pipeline |

## License

MIT
