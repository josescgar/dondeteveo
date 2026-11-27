/**
 * Minimal, dependency-free XML reader for GPX and KML route files.
 *
 * It builds a plain element tree and is deliberately small: no DTD or external
 * entity support (so no XXE surface), no namespace resolution beyond dropping
 * prefixes, and no validation. GPX and KML files only need elements,
 * attributes and text, which is all this supports.
 */

export type XmlElement = {
  /** Local name with any namespace prefix removed (`gx:Track` -> `Track`). */
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  /** Concatenated character data directly inside this element. */
  text: string;
};

export class XmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlParseError";
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const MAX_CODE_POINT = 0x10ffff;
const HEX_RADIX = 16;
const DECIMAL_RADIX = 10;

const decodeCharacterReference = (reference: string): string => {
  const hex = reference.startsWith("#x") || reference.startsWith("#X");
  const codePoint = Number.parseInt(
    reference.slice(hex ? 2 : 1),
    hex ? HEX_RADIX : DECIMAL_RADIX,
  );
  if (!Number.isSafeInteger(codePoint) || codePoint > MAX_CODE_POINT) {
    throw new XmlParseError(`Invalid character reference &${reference};.`);
  }
  return String.fromCodePoint(codePoint);
};

const decodeEntities = (value: string): string =>
  value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) =>
    entity.startsWith("#")
      ? decodeCharacterReference(entity)
      : (NAMED_ENTITIES[entity] ?? match),
  );

const localName = (qualifiedName: string): string => {
  const separator = qualifiedName.indexOf(":");
  return separator === -1 ? qualifiedName : qualifiedName.slice(separator + 1);
};

const ATTRIBUTE_PATTERN = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

const parseAttributes = (source: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[localName(match[1])] = decodeEntities(match[2] ?? match[3]);
  }
  return attributes;
};

const findEnd = (xml: string, token: string, from: number): number => {
  const end = xml.indexOf(token, from);
  if (end === -1) {
    throw new XmlParseError(`Unterminated markup starting at offset ${from}.`);
  }
  return end;
};

/** Index of the `>` closing a start tag, skipping quoted attribute values. */
const findTagEnd = (xml: string, from: number): number => {
  let quote: string | undefined;
  for (let index = from; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote) {
      if (character === quote) {
        quote = undefined;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  throw new XmlParseError(`Unterminated tag starting at offset ${from}.`);
};

/** Parses an XML document and returns its root element. */
export const parseXml = (xml: string): XmlElement => {
  const documentNode: XmlElement = {
    name: "#document",
    attributes: {},
    children: [],
    text: "",
  };
  const stack: XmlElement[] = [documentNode];
  let cursor = 0;

  while (cursor < xml.length) {
    const tagStart = xml.indexOf("<", cursor);
    const current = stack[stack.length - 1];
    if (tagStart === -1) {
      current.text += decodeEntities(xml.slice(cursor));
      break;
    }
    if (tagStart > cursor) {
      current.text += decodeEntities(xml.slice(cursor, tagStart));
    }

    if (xml.startsWith("<!--", tagStart)) {
      cursor = findEnd(xml, "-->", tagStart) + "-->".length;
    } else if (xml.startsWith("<![CDATA[", tagStart)) {
      const end = findEnd(xml, "]]>", tagStart);
      current.text += xml.slice(tagStart + "<![CDATA[".length, end);
      cursor = end + "]]>".length;
    } else if (xml.startsWith("<?", tagStart)) {
      cursor = findEnd(xml, "?>", tagStart) + "?>".length;
    } else if (xml.startsWith("<!", tagStart)) {
      if (xml.slice(tagStart, tagStart + 60).includes("[")) {
        throw new XmlParseError("Inline DTDs are not supported.");
      }
      cursor = findEnd(xml, ">", tagStart) + 1;
    } else if (xml.startsWith("</", tagStart)) {
      const end = findEnd(xml, ">", tagStart);
      const name = localName(xml.slice(tagStart + 2, end).trim());
      if (stack.length === 1 || current.name !== name) {
        throw new XmlParseError(
          `Unexpected closing tag </${name}> at offset ${tagStart}.`,
        );
      }
      stack.pop();
      cursor = end + 1;
    } else {
      const end = findTagEnd(xml, tagStart);
      const body = xml.slice(tagStart + 1, end);
      const selfClosing = body.endsWith("/");
      const content = selfClosing ? body.slice(0, -1) : body;
      const nameMatch = /^[^\s/>]+/.exec(content);
      if (!nameMatch) {
        throw new XmlParseError(`Invalid tag at offset ${tagStart}.`);
      }
      const element: XmlElement = {
        name: localName(nameMatch[0]),
        attributes: parseAttributes(content.slice(nameMatch[0].length)),
        children: [],
        text: "",
      };
      current.children.push(element);
      if (!selfClosing) {
        stack.push(element);
      }
      cursor = end + 1;
    }
  }

  if (stack.length !== 1) {
    throw new XmlParseError(
      `Unclosed element <${stack[stack.length - 1].name}>.`,
    );
  }
  const [root, ...extraRoots] = documentNode.children;
  if (!root || extraRoots.length > 0) {
    throw new XmlParseError("Expected exactly one root element.");
  }
  return root;
};

/** All descendants (depth-first, document order) with the given local name. */
export const findDescendants = (
  element: XmlElement,
  name: string,
): XmlElement[] =>
  element.children.flatMap((child) => [
    ...(child.name === name ? [child] : []),
    ...findDescendants(child, name),
  ]);

export const findChild = (
  element: XmlElement,
  name: string,
): XmlElement | undefined =>
  element.children.find((child) => child.name === name);

export const findChildren = (element: XmlElement, name: string): XmlElement[] =>
  element.children.filter((child) => child.name === name);
