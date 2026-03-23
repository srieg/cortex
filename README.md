# Cortex

**Transparent academic papers where every claim shows its work.**

Cortex generates self-contained HTML papers with embedded reasoning chains, verifiable sources, and adversarial verification. Click any claim to see exactly why the author believes it, what sources support it, and whether an independent reviewer agreed.

AI can write convincingly -- that's the problem. Cortex makes reasoning transparent without breaking the narrative. The reader never has to trust the author.

## How It Works

Cortex runs a six-phase pipeline that captures reasoning as it happens, not after:

1. **Research** -- Find real sources (DOIs, academic papers) before writing a single word
2. **Outline** -- Map every claim to its sources before prose exists
3. **Write** -- Generate prose while capturing the reasoning chain live
4. **Ground** -- Fetch sources, hash content, verify excerpts mechanically
5. **Verify** -- A separate agent tries to break every claim adversarially
6. **Assemble** -- Package into a single self-contained HTML file

> "Mechanical facts terminate the verification recursion. A DOI resolves or it doesn't."

Evidence is classified into tiers based on how each claim is grounded:

- **Primary** -- Verified against source text with exact or fuzzy excerpt match
- **Secondary** -- Supported by a credible secondary source
- **Synthesis** -- Combines multiple verified sources into a novel point
- **Analytical** -- Logical derivation from verified premises
- **Speculative** -- Explicitly flagged as conjecture

## Usage

```bash
git clone https://github.com/srieg/cortex
cd cortex
export ANTHROPIC_API_KEY=your-key-here
npx tsx Pipeline/orchestrator.ts "Your topic here"
```

Requires Node.js 18+ and an Anthropic API key. Uses claude-sonnet-4-6 by default.

### Options

| Flag | Values | Description |
|------|--------|-------------|
| `--style` | `academic` (default), `accessible`, `technical` | Writing style |
| `--depth` | `brief`, `standard` (default), `thorough` | Research depth and source count |

### Examples

```bash
# Academic paper on consciousness
npx tsx Pipeline/orchestrator.ts "The metabolic cost of consciousness"

# Accessible explainer with deep research
npx tsx Pipeline/orchestrator.ts "Why do antibiotics stop working" --style=accessible --depth=thorough

# Technical paper, brief format
npx tsx Pipeline/orchestrator.ts "Quantum error correction" --style=technical --depth=brief
```

Output is a self-contained HTML file that opens in your browser automatically.

## Sample Paper

See a full Cortex paper in action: [The Metabolic Cost of Consciousness](https://srieg.github.io/cortex/examples/sample-paper.html)

Every underlined claim is clickable. Each click reveals the reasoning chain, source references, confidence level, and independent verification result.

## Demo

View the landing page: [srieg.github.io/cortex/demo](https://srieg.github.io/cortex/demo/)

## Structure

- **Pipeline/** -- Agent pipeline (research, outline, writing, grounding, verification, assembly)
- **Schema/** -- TypeScript schema defining the evidence store format
- **Template/** -- HTML template for rendered papers
- **Workflows/** -- Workflow definitions for generating, verifying, and previewing papers

## Pipeline Agents

| Agent | Role |
|-------|------|
| `research-agent` | Gathers and validates sources |
| `outline-agent` | Structures the paper's argument |
| `writing-agent` | Drafts sections with inline evidence |
| `grounding-agent` | Fetches source content, verifies excerpts, validates CrossRef metadata |
| `verify-agent` | Adversarial review of interpretation and argument quality |
| `assembler` | Combines sections into final HTML with embedded evidence store |
| `orchestrator` | Coordinates the full pipeline |

## What Makes a Cortex Paper Different

- **Reasoning chains** -- Every factual claim carries the steps the author took to arrive at it
- **Source verification** -- Sources are fetched, hashed, and verified mechanically (not just cited)
- **Adversarial review** -- A separate agent tries to break every claim before publication
- **Confidence scoring** -- Each claim has an explicit confidence level and evidence tier
- **Self-contained** -- Output is a single HTML file with no external dependencies

## License

Apache License 2.0. Free to use, modify, and distribute with attribution.

Created by [Sam Riegel](https://github.com/srieg). See [LICENSE](LICENSE) and [NOTICE](NOTICE).
