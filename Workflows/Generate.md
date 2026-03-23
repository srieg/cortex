# Generate Workflow

**Mode:** Full 5-phase pipeline | **Estimated time:** 2-5 minutes depending on depth

## When to Use

- User says "generate cortex", "cortex paper on [topic]", "write a cortex paper"
- Any request for a transparent, verifiable academic paper

## Input Parsing

Extract from user request:
- **topic** (required): The subject of the paper
- **style**: academic (default), accessible, technical
- **depth**: brief (5 sources), standard (10 sources, default), thorough (20+ sources)
- **output**: File path (default: `Projects/cortex/output/{slugified-topic}.html`)
- **outline**: Optional pre-made outline text

## Workflow

### Step 0: Setup

```bash
# Ensure output directory exists
mkdir -p ~/PAIv3/Projects/cortex/output
```

Set the model based on depth:
- brief/standard: `claude-sonnet-4-6` (faster, cheaper)
- thorough: `claude-opus-4-6` (more capable)

User can override with explicit model preference.

### Step 1: Research Sources (Phase 1)

**CRITICAL: Research happens BEFORE any writing. This prevents hallucinated citations.**

Launch a research agent to gather real, verifiable sources:

```typescript
Agent({
  subagent_type: "claude-researcher",
  description: "Research sources for Cortex paper",
  prompt: `Research the topic: "${topic}"

  Find ${depthConfig.targetSources} real, verifiable academic sources.

  For EACH source, provide:
  - authors, title, publication, year
  - DOI (if available — must be real)
  - type: journal_article, book, book_chapter, conference_paper, preprint, etc.
  - relevant_excerpt: the specific text that relates to the topic
  - excerpt_location: where in the source this appears
  - reliability_rating: 0.0-1.0

  CRITICAL: Only cite sources you are CONFIDENT exist. If unsure, say so.

  Return as structured JSON.`
})
```

Depth config:
- brief: 3 sub-questions, 5 target sources
- standard: 6 sub-questions, 10 target sources
- thorough: 10 sub-questions, 20 target sources

### Step 2: Plan Outline (Phase 2)

Using the gathered sources, create an outline where every planned claim maps to supporting sources:

```typescript
Agent({
  subagent_type: "general-purpose",
  description: "Plan Cortex paper outline",
  prompt: `Create an outline for a ${style} paper on "${topic}".

  AVAILABLE SOURCES: ${JSON.stringify(sources)}

  Rules:
  - Every empirical claim MUST map to at least one source
  - Synthesis claims list all source IDs used
  - Unsupported claims are marked unsupported:true
  - Normative claims explicitly typed as "normative"

  Return JSON with: title, subtitle, abstract, keywords, sections with plannedClaims.`
})
```

### Step 3: Write with Live Reasoning (Phase 3)

**This is the core innovation.** For each section, the AI writes prose AND captures reasoning simultaneously:

```typescript
Agent({
  subagent_type: "general-purpose",
  description: "Write Cortex section with reasoning",
  prompt: `Write section "${section.title}" as academic prose.

  For EACH claim, produce:
  1. PROSE with <span class="claim" data-claim="ID" data-confidence="N" data-type="TYPE">text</span>
  2. REASONING CHAIN: step-by-step thought process (honest, not post-hoc)
  3. SOURCE INTERPRETATIONS: what sources literally say vs. what you infer
  4. ALTERNATIVES: what you chose not to say, and why
  5. CONFIDENCE: honest assessment with justification

  Return structured JSON with paragraphs, claims, and reasoning.`
})
```

Run sections sequentially (each may reference prior sections) or in parallel if independent.

### Step 4: Adversarial Verification (Phase 4)

A SEPARATE agent reviews everything the writing agent produced:

```typescript
Agent({
  subagent_type: "general-purpose",
  description: "Adversarial verify Cortex claims",
  prompt: `You are an adversarial reviewer. Find problems.

  CLAIMS: ${JSON.stringify(claims)}
  SOURCES: ${JSON.stringify(sources)}
  REASONING: ${JSON.stringify(reasoning)}

  Check:
  1. Do sources actually support claims? (check excerpts)
  2. Is confidence justified?
  3. Is reasoning logic valid?
  4. Were alternatives fairly considered?
  5. Are normative claims properly flagged?

  Be rigorous. A good review finds at least one issue.`
})
```

Also verify source URLs/DOIs exist:
- DOI: HEAD request to `https://doi.org/{doi}`
- URL: HEAD request to verify 200 response

### Step 5: Assemble Document (Phase 5)

1. Read the template from `~/.claude/skills/Cortex/Template/cortex.html`
2. Build the full CortexDocument JSON (meta + sections + claims + reasoning + sources + validations)
3. Compute SHA-256 paper hash from prose content
4. Replace the evidence store placeholder in the template
5. Write the assembled HTML to the output path

### Step 6: Verify Output

Open the generated file in the browser:
```bash
open {output_path}
```

Report summary:
```markdown
  CORTEX PAPER GENERATED
  ══════════════════════════════════════
  Topic:      {topic}
  Style:      {style} | Depth: {depth}
  Claims:     {N} ({N} verified, {N} flagged)
  Sources:    {N} ({N} live, {N} degraded)
  Reasoning:  {N} steps across {N} chains
  Output:     {output_path}
  Size:       {file_size}

  Click any underlined claim to see its
  reasoning chain and source evidence.
```

## Error Handling

- If research finds fewer sources than target: proceed with what's available, note in output
- If DOI verification fails: mark source as "unverified" (not removed — the citation may still be real)
- If writing agent produces malformed JSON: retry once, then fall back to simpler prompt
- If verification agent finds critical issues: report them but still generate the paper (issues are visible in the UI)

## Output

A single self-contained `.html` file that:
- Renders clean academic prose
- Has clickable claims with reasoning panels
- Contains the full evidence store as embedded JSON
- Works offline, works in 20 years, works with no server
- Supports dark mode, mobile, print export
