# Cortex

AI-generated papers where every claim shows its reasoning chain and sources. Transparent academic writing with embedded evidence stores.

## What it does

Cortex produces self-contained HTML papers with an embedded evidence store. Every claim in the paper carries its own provenance chain: the reasoning that led to it, the source excerpts that support it, and independent verification results.

## Structure

- **Pipeline/** -- Agent pipeline (research, outline, writing, verification, assembly)
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
| `verify-agent` | Independently checks claims against sources |
| `assembler` | Combines sections into final HTML with embedded evidence store |
| `orchestrator` | Coordinates the full pipeline |

## License

MIT
