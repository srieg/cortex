# Verify Workflow

**Mode:** Re-verification of existing Cortex paper | **Estimated time:** 30-60 seconds

## When to Use

- User says "verify cortex", "re-verify sources", "check cortex paper"
- User wants to confirm sources are still live after time has passed
- User wants to re-run adversarial verification on a paper

## Workflow

### Step 1: Read the Paper

Read the target HTML file and extract the evidence store JSON from the `<script id="evidence-store">` tag.

### Step 2: Re-Verify Sources

For each source in the evidence store:
- **DOI sources**: HEAD request to `https://doi.org/{doi}` — check it resolves
- **URL sources**: HEAD request — check for 200 response
- **ISBN sources**: Note as "requires manual verification"
- **Archive URLs**: Check if archive.org snapshot is still accessible

### Step 3: Re-Run Adversarial Review

Launch a verification agent to re-assess claims against sources:

```typescript
Agent({
  subagent_type: "general-purpose",
  description: "Re-verify Cortex claims",
  prompt: `Adversarial review of Cortex paper claims.
  [full claims + sources + reasoning JSON]
  Find any issues with claim-source alignment, confidence, logic, or fairness.`
})
```

### Step 4: Update Evidence Store

Add a new validation run to the `validations[]` array in the evidence store.
Re-embed the updated JSON into the HTML file.

### Step 5: Report

```markdown
  CORTEX RE-VERIFICATION COMPLETE
  ═══════════════════════════════════
  Sources: {live}/{total} live | {degraded} degraded | {dead} dead
  Claims:  {verified}/{total} verified | {flagged} flagged
  Logic:   {issues} issues found

  Changes since last verification:
  - {list of sources that changed status}
  - {list of claims with new issues}
```
