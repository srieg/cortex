# Preview Workflow

**Mode:** Open existing Cortex paper in browser | **Estimated time:** Instant

## When to Use

- User says "preview cortex", "open cortex paper"
- User wants to view a previously generated paper

## Workflow

### Step 1: Locate the Paper

If user provides a file path, use it directly.
Otherwise, check `Projects/cortex/output/` for recent papers:

```bash
ls -t ~/PAIv3/Projects/cortex/output/*.html 2>/dev/null | head -5
```

### Step 2: Open in Browser

```bash
open {file_path}
```

### Step 3: Report

```markdown
  Opened: {file_path}
  Size: {file_size}
  Generated: {date from meta}
  Claims: {N} | Sources: {N}
```
