/**
 * Prints the visible text, links, frames and Google My Maps KML export URLs of
 * a saved HTML page, so the scout-races skill can quote facts verbatim and find
 * course files without a model summarising the page.
 *
 * Usage:
 *   node scripts/page-text.ts <page.html> --base <page-url>
 *
 * The page is untrusted data: it is only tokenised, never executed.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import {
  extractPageText,
  formatPageText,
} from "./page-text/page-text.logic.ts";

const USAGE = "Usage: node scripts/page-text.ts <page.html> --base <page-url>";

const run = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { base: { type: "string" } },
  });
  const [file] = positionals;
  if (!file || !values.base || positionals.length > 1) {
    console.error(USAGE);
    return 1;
  }
  const html = await readFile(file, "utf8");
  console.log(formatPageText(extractPageText(html, values.base), values.base));
  return 0;
};

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(
      `page-text failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
