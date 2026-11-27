import { describe, expect, it } from "vitest";

import {
  XmlParseError,
  findChild,
  findChildren,
  findDescendants,
  parseXml,
} from "./xml.ts";

describe("parseXml", () => {
  it("builds an element tree with local names, attributes and text", () => {
    const root = parseXml(`<?xml version="1.0"?>
      <!-- comment with <tags> -->
      <kml:kml xmlns:kml="urn:x" a="1 &amp; 2" b='x>y'>
        <kml:name>Fish &amp; chips &#233;&#x41;</kml:name>
        <empty/>
        <data><![CDATA[<raw> & text]]></data>
      </kml:kml>`);

    expect(root.name).toBe("kml");
    expect(root.attributes).toMatchObject({ a: "1 & 2", b: "x>y" });
    expect(findChild(root, "name")?.text).toBe("Fish & chips éA");
    expect(findChild(root, "empty")?.children).toEqual([]);
    expect(findChild(root, "data")?.text).toBe("<raw> & text");
  });

  it("finds children and descendants in document order", () => {
    const root = parseXml("<a><b id='1'><b id='2'/></b><c><b id='3'/></c></a>");
    expect(findChildren(root, "b").map((b) => b.attributes.id)).toEqual(["1"]);
    expect(findDescendants(root, "b").map((b) => b.attributes.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("rejects malformed documents", () => {
    expect(() => parseXml("<a><b></a>")).toThrow(XmlParseError);
    expect(() => parseXml("<a>")).toThrow(/Unclosed/);
    expect(() => parseXml("<a/><b/>")).toThrow(/one root/);
    expect(() => parseXml("just text")).toThrow(/one root/);
  });

  it("refuses inline DTDs", () => {
    expect(() => parseXml('<!DOCTYPE a [<!ENTITY x "y">]><a>&x;</a>')).toThrow(
      /DTD/,
    );
  });
});
