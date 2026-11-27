// Extracts the text, links, frames and Google My Maps ids from a saved HTML
// page, for the scout-races skill. The page is untrusted data: it is only
// tokenised here, never executed, and nothing it references is loaded.
// The CLI entry point is `scripts/page-text.ts`.

/**
 * - `visible`: shown when the page loads.
 * - `collapsed`: hidden with an inline `display:none` / `visibility:hidden`
 *   style, which pages commonly use for "show more" sections opened by a
 *   click. Printed with a `[collapsed]` prefix so a quote from it is flagged.
 * - `hidden`: inside an element with the `hidden` attribute or
 *   `aria-hidden="true"`, or in `noscript` / `template`. Never printed as text.
 */
export type Visibility = "visible" | "collapsed" | "hidden";

export type PageLink = {
  text: string;
  url: string;
  /** Possible course file or map (GPX, KML, KMZ, PDF, My Maps, Strava, ...). */
  track: boolean;
  visibility: Visibility;
};

export type PageFrame = { tag: string; url: string; track: boolean };

export type PageLine = {
  text: string;
  visibility: Exclude<Visibility, "hidden">;
};

export type PageText = {
  title: string;
  /** Visible and collapsed text, one entry per block-level line. */
  lines: PageLine[];
  links: PageLink[];
  frames: PageFrame[];
  /** Google My Maps ids found in any link, frame or text on the page. */
  myMapsIds: string[];
};

const NAMED_ENTITIES: Record<string, string> = {
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
const MY_MAPS_ID_PATTERN =
  /google\.[a-z.]+\/maps\/d\/[^\s"'<>]*?[?&]mid=([\w-]+)/gi;

/** Elements whose content is never shown as page text. */
const SKIPPED_ELEMENTS = new Set([
  "head",
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "iframe",
  "object",
  "textarea",
  "select",
]);
/** Elements whose content is raw text: tags inside them are not tags. */
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
/** Inline elements do not separate words in a browser. */
const INLINE_ELEMENTS = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "font",
  "i",
  "kbd",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
  "wbr",
]);
const BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "option",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const codePoint =
        entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) &&
        codePoint > 0 &&
        codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return NAMED_ENTITIES[entity] ?? match;
  });

/**
 * One tag: `<name attributes>` where attribute values may contain `>` inside
 * quotes. Only `<` followed by a letter or `/` starts a tag, as in browsers, so
 * text such as "(<50 minutos)" stays text.
 */
const TAG_PATTERN =
  /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\?[^>]*>/g;
const ATTRIBUTE_PATTERN =
  /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const parseAttributes = (source: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1].toLowerCase();
    if (name in attributes) continue;
    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
};

const elementVisibility = (
  name: string,
  attributes: Record<string, string>,
): Visibility => {
  if (
    name === "noscript" ||
    name === "template" ||
    "hidden" in attributes ||
    attributes["aria-hidden"]?.toLowerCase() === "true"
  ) {
    return "hidden";
  }
  return /(^|;)\s*(display\s*:\s*none|visibility\s*:\s*hidden)/i.test(
    attributes.style ?? "",
  )
    ? "collapsed"
    : "visible";
};

const VISIBILITY_RANK: Record<Visibility, number> = {
  visible: 0,
  collapsed: 1,
  hidden: 2,
};

const toAbsoluteUrl = (value: string, base: string): string => {
  try {
    return new URL(value.trim(), base).href;
  } catch {
    return value.trim();
  }
};

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

type OpenElement = { name: string; visibility: Visibility };

export const extractPageText = (html: string, baseUrl: string): PageText => {
  const stack: OpenElement[] = [];
  const lines: PageLine[] = [];
  const links: PageLink[] = [];
  const frames: PageFrame[] = [];
  const mapIds = new Set<string>();
  let current = "";
  let currentVisibility: Visibility = "visible";
  let title = "";
  let openLink:
    { url: string; text: string; visibility: Visibility } | undefined;

  /** The most hidden state of the open elements; skipped elements count as hidden. */
  const visibility = (): Visibility => {
    let result: Visibility = "visible";
    for (const element of stack) {
      const state = SKIPPED_ELEMENTS.has(element.name)
        ? "hidden"
        : element.visibility;
      if (VISIBILITY_RANK[state] > VISIBILITY_RANK[result]) result = state;
    }
    return result;
  };
  const breakLine = () => {
    const text = collapse(current);
    if (text && currentVisibility !== "hidden") {
      lines.push({ text, visibility: currentVisibility });
    }
    current = "";
  };
  const addText = (raw: string) => {
    const text = decodeEntities(raw);
    if (openLink) openLink.text += text;
    const state = visibility();
    if (state === "hidden") return;
    if (state !== currentVisibility) {
      if (collapse(current)) breakLine();
      current = "";
      currentVisibility = state;
    }
    current += text;
  };
  const separate = (name: string) => {
    if (BLOCK_ELEMENTS.has(name)) breakLine();
    else if (!INLINE_ELEMENTS.has(name)) current += " ";
  };
  const noteMapIds = (value: string) => {
    for (const match of value.matchAll(MY_MAPS_ID_PATTERN))
      mapIds.add(match[1]);
  };
  const finishLink = () => {
    if (!openLink) return;
    links.push({
      text: collapse(openLink.text),
      url: openLink.url,
      track: TRACK_LINK_PATTERN.test(openLink.url),
      visibility: openLink.visibility,
    });
    openLink = undefined;
  };
  const closeElement = (name: string) => {
    const index = stack.findLastIndex((element) => element.name === name);
    if (index !== -1) stack.length = index;
  };

  let position = 0;
  TAG_PATTERN.lastIndex = 0;
  for (;;) {
    const match = TAG_PATTERN.exec(html);
    const end = match ? match.index : html.length;
    if (end > position) addText(html.slice(position, end));
    if (!match) break;
    position = TAG_PATTERN.lastIndex;

    const [, slash, rawName, attributeSource] = match;
    if (!rawName) continue; // comment, doctype or processing instruction
    const name = rawName.toLowerCase();

    if (slash) {
      if (name === "a") finishLink();
      closeElement(name);
      separate(name);
      continue;
    }

    const attributes = parseAttributes(attributeSource);
    const ownVisibility = elementVisibility(name, attributes);

    if (RAW_TEXT_ELEMENTS.has(name)) {
      // Skip to the matching end tag, or to the end of the page if it is
      // never closed, without reading tags inside.
      const closing = new RegExp(`</${name}\\s*>`, "ig");
      closing.lastIndex = position;
      const close = closing.exec(html);
      const content = html.slice(position, close ? close.index : html.length);
      position = close ? closing.lastIndex : html.length;
      TAG_PATTERN.lastIndex = position;
      if (name === "title" && !title) title = collapse(decodeEntities(content));
      continue;
    }

    for (const key of ["href", "src", "data"]) {
      if (attributes[key]) noteMapIds(attributes[key]);
    }

    if (name === "a" && attributes.href !== undefined) {
      finishLink();
      const href = attributes.href.trim();
      if (
        href &&
        !href.startsWith("#") &&
        !/^(javascript|mailto|tel):/i.test(href)
      ) {
        const outer = visibility();
        openLink = {
          url: toAbsoluteUrl(href, baseUrl),
          text: "",
          visibility:
            VISIBILITY_RANK[ownVisibility] > VISIBILITY_RANK[outer]
              ? ownVisibility
              : outer,
        };
      }
    }
    if (name === "iframe" || name === "embed" || name === "object") {
      const source = attributes.src ?? attributes.data;
      if (source) {
        const url = toAbsoluteUrl(source, baseUrl);
        frames.push({ tag: name, url, track: TRACK_LINK_PATTERN.test(url) });
      }
    }

    separate(name);
    const selfClosing = /\/\s*$/.test(attributeSource);
    if (!VOID_ELEMENTS.has(name) && !selfClosing) {
      stack.push({ name, visibility: ownVisibility });
    }
  }
  breakLine();
  finishLink(); // an unclosed link still counts
  noteMapIds(decodeEntities(html));

  const seen = new Set<string>();
  const uniqueLinks = links.filter((link) => {
    const key = `${link.text} ${link.url} ${link.visibility}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    title,
    lines,
    links: uniqueLinks,
    frames,
    myMapsIds: [...mapIds],
  };
};

export const myMapsKmlExportUrl = (id: string): string =>
  `https://www.google.com/maps/d/kml?mid=${id}&forcekml=1`;

const visibilityTag = (visibility: Visibility): string =>
  visibility === "visible" ? "" : `[${visibility}] `;

export const formatPageText = (page: PageText, baseUrl: string): string => {
  const output = [`# Page: ${baseUrl}`];
  if (page.title) output.push(`# Title: ${page.title}`);
  output.push(
    "",
    "## Text ([collapsed] = in a section the page hides until opened; hidden text is left out)",
    "",
  );
  for (const line of page.lines) {
    output.push(`${visibilityTag(line.visibility)}${line.text}`);
  }
  output.push(
    "",
    "## Links (text -> URL; [track] = possible course file or map; [collapsed]/[hidden] = not shown when the page loads)",
    "",
  );
  for (const link of page.links) {
    const tags = `${link.track ? "[track] " : ""}${visibilityTag(link.visibility)}`;
    output.push(`${tags}${link.text || "(no text)"} -> ${link.url}`);
  }
  output.push("", "## Frames and embeds", "");
  for (const frame of page.frames) {
    output.push(`${frame.track ? "[track] " : ""}${frame.tag} -> ${frame.url}`);
  }
  if (page.myMapsIds.length > 0) {
    output.push("", "## Google My Maps found (KML export URLs)", "");
    for (const id of page.myMapsIds) {
      output.push(`mid=${id} -> ${myMapsKmlExportUrl(id)}`);
    }
  }
  return output.join("\n");
};
