#!/usr/bin/env node
/**
 * Prints the readable text, links and frames of a saved HTML page, so facts
 * can be quoted verbatim and track files found without a model summarising
 * the page.
 *
 * Usage:
 *   node .claude/skills/scout-races/scripts/page-text.mjs <page.html> --base <page-url>
 *
 * The page is untrusted data: this script only reads it with regular
 * expressions and never executes or loads anything from it.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  agrave: "à",
  egrave: "è",
  ograve: "ò",
  Agrave: "À",
  Egrave: "È",
  Ograve: "Ò",
  ntilde: "ñ",
  Ntilde: "Ñ",
  uuml: "ü",
  Uuml: "Ü",
  ccedil: "ç",
  Ccedil: "Ç",
  middot: "·",
  ordm: "º",
  ordf: "ª",
  iexcl: "¡",
  iquest: "¿",
  laquo: "«",
  raquo: "»",
  euro: "€",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/** Links worth a closer look when searching for a course file. */
const TRACK_LINK_PATTERN =
  /\.(gpx|kml|kmz|pdf)(\?|#|$)|google\.[a-z.]+\/maps\/d\/|strava\.com\/routes\/|wikiloc\.com|loc\.wiki|plotaroute\.com|ridewithgps\.com|garmin\.com\/modern\/course/i;
const MY_MAPS_ID_PATTERN = /google\.[a-z.]+\/maps\/d\/[^"'\s]*[?&]mid=([\w-]+)/i;

const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return NAMED_ENTITIES[entity] ?? match;
  });

const toAbsoluteUrl = (href, base) => {
  try {
    return new URL(decodeEntities(href.trim()), base).href;
  } catch {
    return decodeEntities(href.trim());
  }
};

const readAttribute = (tag, name) => {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match ? (match[2] ?? match[3] ?? match[4] ?? "") : undefined;
};

/** Strips tags; only `<` followed by a letter, `/` or `!` starts a tag, as in browsers. */
const toText = (html) =>
  decodeEntities(
    html
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/td|\/th|\/section|\/article|\/header|\/footer)\b[^>]*>/gi, "\n")
      .replace(/<[a-z/!][^>]*>/gi, " "),
  );

const main = () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { base: { type: "string" } },
  });
  const [file] = positionals;
  if (!file || !values.base) {
    console.error("Usage: node page-text.mjs <page.html> --base <page-url>");
    process.exitCode = 1;
    return;
  }

  const html = readFileSync(file, "utf8");
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ");

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  console.log(`# Page: ${values.base}`);
  if (title) console.log(`# Title: ${toText(title[1]).replace(/\s+/g, " ").trim()}`);

  console.log("\n## Text\n");
  const lines = toText(body)
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter(Boolean);
  for (const line of lines) console.log(line);

  console.log("\n## Links (text -> URL; [track] marks possible course files and maps)\n");
  const seen = new Set();
  for (const match of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = readAttribute(match[1], "href");
    if (!href || href.startsWith("#") || /^(javascript|mailto|tel):/i.test(href)) continue;
    const url = toAbsoluteUrl(href, values.base);
    const text = toText(match[2]).replace(/\s+/g, " ").trim();
    const key = `${text} ${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`${TRACK_LINK_PATTERN.test(url) ? "[track] " : ""}${text || "(no text)"} -> ${url}`);
  }

  console.log("\n## Frames and embeds\n");
  for (const match of body.matchAll(/<(iframe|embed|object)\b([^>]*)>/gi)) {
    const source = readAttribute(match[2], "src") ?? readAttribute(match[2], "data");
    if (!source) continue;
    const url = toAbsoluteUrl(source, values.base);
    console.log(`${TRACK_LINK_PATTERN.test(url) ? "[track] " : ""}${match[1].toLowerCase()} -> ${url}`);
  }

  const mapIds = new Set();
  for (const match of html.matchAll(new RegExp(MY_MAPS_ID_PATTERN, "gi"))) mapIds.add(match[1]);
  if (mapIds.size > 0) {
    console.log("\n## Google My Maps found (KML export URLs)\n");
    for (const id of mapIds) {
      console.log(`mid=${id} -> https://www.google.com/maps/d/kml?mid=${id}&forcekml=1`);
    }
  }
};

main();
