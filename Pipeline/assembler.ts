/**
 * Cortex Assembler
 *
 * Phase 5 of the pipeline. Takes the complete CortexDocument
 * and packages it into a single self-contained HTML file.
 *
 * The HTML template is read, the evidence store is embedded,
 * and a content hash is computed for integrity verification.
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { createHash } from "crypto";
import type { CortexDocument } from "../schema/cortex-schema.ts";

export async function assembleDocument(doc: CortexDocument): Promise<string> {
  // Read the template
  const templatePath = join(dirname(import.meta.dir), "template", "cortex.html");
  const template = await readFile(templatePath, "utf-8");

  // Compute paper hash from prose content
  const proseContent = doc.sections
    .flatMap((s) => s.content)
    .filter((c) => c.type === "paragraph")
    .map((c) => (c as { type: "paragraph"; text: string }).text)
    .join("\n");
  const paperHash = createHash("sha256").update(proseContent).digest("hex");
  doc.meta.paper_hash = `sha256:${paperHash}`;

  // Serialize the evidence store
  const evidenceJSON = JSON.stringify(doc, null, 2);

  // Replace the placeholder evidence store in the template
  const assembled = template.replace(
    /<script type="application\/json" id="evidence-store">[\s\S]*?<\/script>/,
    `<script type="application/json" id="evidence-store">\n${evidenceJSON}\n</script>`,
  );

  return assembled;
}

/**
 * Write the assembled document to a file
 */
export async function writeDocument(html: string, outputPath: string): Promise<void> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { dirname: dirnameFn } = await import("path");
  await mkdir(dirnameFn(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");
}
