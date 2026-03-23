---
name: Cortex
description: >
  Transparent academic papers with embedded reasoning chains and verifiable sources.
  USE WHEN user says 'cortex', 'transparent paper', 'generate cortex', 'write a cortex paper',
  'verifiable paper', 'paper with reasoning chains', 'academic paper with sources',
  or wants to create documents where every claim carries its own provenance chain.
  Generates self-contained HTML papers with an embedded evidence store (claims, reasoning
  chains, source excerpts, and independent verification results).
implements: Science
science_cycle_time: macro
context: fork
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/PAI/USER/SKILLCUSTOMIZATIONS/Cortex/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the Cortex skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **Cortex** skill to ACTION...
   ```

**Full documentation:** `~/.claude/skills/PAI/THENOTIFICATIONSYSTEM.md`

# Cortex — Transparent Academic Papers

Every claim carries its reasoning chain. Every source is independently verifiable.
The reader never has to trust the author.

## Core Concept

A Cortex paper is a single self-contained HTML file that embeds:
- **The paper** — clean academic prose
- **An evidence store** — a JSON database of claims, reasoning chains, sources, and validation results
- **Interactive UI** — click any claim to see how it was derived and verify the sources

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Generate** | "generate cortex", "write cortex paper", "cortex on [topic]" | `Workflows/Generate.md` |
| **Verify** | "verify cortex", "re-verify sources", "check cortex paper" | `Workflows/Verify.md` |
| **Preview** | "preview cortex", "open cortex paper" | `Workflows/Preview.md` |

## Examples

**Example 1: Generate a paper**
```
User: "Generate a Cortex paper on the metabolic cost of consciousness"
-> Invokes Generate workflow
-> 6-phase pipeline: Research → Outline → Write → Ground → Verify → Assemble
-> Returns self-contained HTML with embedded evidence store
```

**Example 2: Quick accessible paper**
```
User: "Cortex paper on AI alignment, accessible style, brief depth"
-> Invokes Generate workflow with style=accessible, depth=brief
-> Fewer sources, simpler language, same transparency
```

**Example 3: Thorough academic paper**
```
User: "Write a thorough Cortex paper on Buddhist theories of consciousness"
-> Invokes Generate workflow with style=academic, depth=thorough
-> 20+ sources, full reasoning chains, comprehensive verification
```

## Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `style` | academic, accessible, technical | academic | Writing style and tone |
| `depth` | brief, standard, thorough | standard | Research depth (5/10/20+ sources) |
| `model` | any Claude model | claude-opus-4-6 | Model for generation |
| `output` | file path | `Projects/cortex/output/{topic}.html` | Output location |

## Architecture

### The 6-Phase Pipeline

```
Topic/Outline → Research → Outline → Write → Ground → Verify → Assemble → .html
                   │          │         │       │        │         │
              Find real    Map claims  Write + Fetch    Check    Package
              sources      to sources  capture content  claims   into one
              FIRST        BEFORE      reasoning hash   ADVERSA- self-
                           writing     LIVE     verify  RIALLY   contained
                                               excerpts          file
```

### Key Design Decisions

1. **Research before writing** — Sources are gathered BEFORE prose. Prevents hallucinated citations.
2. **Live reasoning capture** — The AI writes and reflects simultaneously. Not reconstructed after.
3. **Adversarial verification** — A separate agent tries to find problems. Scored on what it catches.
4. **Self-contained output** — Single HTML file with embedded JSON evidence store. No server needed.
5. **Grounding terminates recursion** — Mechanical checks (content hashes, excerpt matching, CrossRef validation) provide facts that are verifiable by anyone. The adversarial agent's scope narrows to interpretation quality — the only thing AI judgment is actually needed for.

### Evidence Store Schema

Full TypeScript types: `Schema/cortex-schema.ts`

```
CortexDocument
├── meta (title, authors, generator info, content hash)
├── sections[] (document structure with HTML content)
├── claims{} (every claim with confidence, type, source refs, grounding)
│   └── grounding? { assumptions[], mechanical_facts[] }
├── reasoning{} (step-by-step chains captured during writing)
├── sources{} (citations with excerpts, DOIs, content hashes)
│   ├── excerpt_verification? { found, match_score, context }
│   ├── retrieved_content_hash? (sha256 of fetched content)
│   └── crossref_metadata? { metadata_matches, verified_title, verified_year }
└── validations[] (independent verification results)
```

### Claim Types

| Type | Meaning | Confidence Range |
|------|---------|-----------------|
| empirical | Backed by data/observation | 70-99% |
| definitional | Defining a term or concept | 85-99% |
| analytical | Logical inference | 65-90% |
| synthesis | Combining multiple sources | 55-85% |
| methodological | About process/approach | 70-95% |
| normative | Value judgment (flagged) | 40-70% |

Evidence tiers: primary (direct quote), secondary (paraphrase), synthesis (multi-source), analytical (inference), speculative (unsupported)

## File Organization

| Path | Purpose |
|------|---------|
| `SKILL.md` | This file — skill definition and routing |
| `Workflows/Generate.md` | Full generation pipeline workflow |
| `Workflows/Verify.md` | Re-verification workflow |
| `Workflows/Preview.md` | Open paper in browser |
| `Schema/cortex-schema.ts` | TypeScript type definitions |
| `Template/cortex.html` | HTML/CSS/JS reader template |
| `Pipeline/` | Pipeline agent modules |

## Integration

### Feeds Into
- **PhilosophyAuthor** — Cortex papers can be philosophical
- **Research** — Uses research patterns for source gathering
- **BlogWriter** — A Cortex paper can be adapted into a blog post

### Uses
- **Anthropic SDK** — For research, writing, and verification agents
- **Web fetch** — For DOI/URL verification
- **Browser skill** — For visual verification of output

## Changelog

### 2026-03-23
- Added mechanical grounding phase (Phase 3.5) -- fetches sources, verifies excerpts, validates CrossRef
- Added evidence tiers on claims (primary/secondary/synthesis/analytical/speculative)
- Added "Mechanical Facts" section to HTML reader panel
- Adversarial verification now receives grounding facts, narrows scope to interpretation quality
- Schema v1.1: GroundingFact, GroundingResult, ClaimGrounding types

### 2026-03-10
- Initial skill creation
- 6-phase pipeline: Research → Outline → Write → Verify → Assemble
- Self-contained HTML output with embedded evidence store
- Dark mode, responsive layout, print export
- 7 claim types with confidence scoring
- Adversarial verification agent
