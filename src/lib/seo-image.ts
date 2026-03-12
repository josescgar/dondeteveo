import { readFile } from "node:fs/promises";

import sharp from "sharp";

import { SEO_IMAGE_HEIGHT, SEO_IMAGE_WIDTH, type Locale } from "./config";

const LOGO_IMAGE_URL = new URL("../../public/logo.png", import.meta.url);
const logoOverlayPromise = readFile(LOGO_IMAGE_URL).then((buffer) =>
  sharp(buffer)
    .resize({ width: 136, height: 136, fit: "contain" })
    .png()
    .toBuffer(),
);

type SeoImageInput = {
  locale: Locale;
  eyebrow: string;
  title: string;
  description: string;
  footer: string[];
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const wrapText = (
  value: string,
  maxCharsPerLine: number,
  maxLines: number,
): string[] => {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(word.slice(0, maxCharsPerLine - 3) + "...");
      currentLine = "";
    }

    if (lines.length === maxLines) {
      return lines;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (words.join(" ") !== lines.join(" ") && lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(
      /\.{0,3}$/,
      "...",
    );
  }

  return lines;
};

const renderTextLines = ({
  lines,
  x,
  y,
  lineHeight,
  fontSize,
  fontWeight,
  fill,
}: {
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  fontSize: number;
  fontWeight: number;
  fill: string;
}): string =>
  lines
    .map(
      (line, index) => `
  <text
    x="${x}"
    y="${y + lineHeight * index}"
    fill="${fill}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
  >${escapeXml(line)}</text>`,
    )
    .join("");

export const renderSeoImage = ({
  locale,
  eyebrow,
  title,
  description,
  footer,
}: SeoImageInput): string => {
  const titleLines = wrapText(title, 24, 3);
  const descriptionLines = wrapText(description, 56, 3);
  const footerLine = wrapText(footer.filter(Boolean).join(" / "), 74, 1);
  const descriptionStartY = 276 + titleLines.length * 78;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SEO_IMAGE_WIDTH}" height="${SEO_IMAGE_HEIGHT}" viewBox="0 0 ${SEO_IMAGE_WIDTH} ${SEO_IMAGE_HEIGHT}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <defs>
    <pattern id="dot-grid" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#1e6fa0" opacity="0.08" />
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#f4f7fb" />
  <rect width="1200" height="630" fill="url(#dot-grid)" />
  <rect x="56" y="56" width="1088" height="518" fill="#ffffff" stroke="#ccd8e4" stroke-width="2" />
  <rect x="56" y="56" width="1088" height="14" fill="#1e6fa0" />
  <rect x="884" y="88" width="220" height="180" fill="#e6eff7" stroke="#ccd8e4" stroke-width="2" />
  <rect x="884" y="248" width="220" height="20" fill="#f26419" />
  <rect x="900" y="300" width="188" height="96" fill="#f4f7fb" stroke="#ccd8e4" stroke-width="2" />
  <rect x="96" y="188" width="8" height="238" fill="#f26419" />
  <rect x="96" y="470" width="688" height="2" fill="#ccd8e4" />
  <text x="96" y="118" fill="#6b7e8c" font-family="IBM Plex Mono, Courier New, monospace" font-size="18" font-weight="500" letter-spacing="3">// ${escapeXml(
    eyebrow.toUpperCase(),
  )}</text>
  <text x="96" y="166" fill="#1e6fa0" font-family="Barlow Condensed, Arial Narrow, Arial, sans-serif" font-size="54" font-weight="800" letter-spacing="1.5">DONDETEVEO</text>
  <text x="1088" y="120" text-anchor="end" fill="#6b7e8c" font-family="IBM Plex Mono, Courier New, monospace" font-size="18" font-weight="500" letter-spacing="4">${escapeXml(
    locale.toUpperCase(),
  )}</text>
  <rect x="920" y="326" width="92" height="10" fill="#1e6fa0" />
  <rect x="920" y="350" width="136" height="6" fill="#ccd8e4" />
  <rect x="920" y="370" width="120" height="6" fill="#f26419" opacity="0.7" />${renderTextLines(
    {
      lines: titleLines,
      x: 132,
      y: 276,
      lineHeight: 78,
      fontSize: 72,
      fontWeight: 800,
      fill: "#1a2e3b",
    },
  )}${renderTextLines({
    lines: descriptionLines,
    x: 132,
    y: descriptionStartY,
    lineHeight: 40,
    fontSize: 28,
    fontWeight: 500,
    fill: "#6b7e8c",
  })}
  <rect x="132" y="518" width="956" height="2" fill="#ccd8e4" />${renderTextLines(
    {
      lines: footerLine,
      x: 132,
      y: 560,
      lineHeight: 30,
      fontSize: 22,
      fontWeight: 500,
      fill: "#1e6fa0",
    },
  )}
</svg>`;
};

export const renderSeoImagePng = async (
  input: SeoImageInput,
): Promise<ArrayBuffer> => {
  const logoOverlay = await logoOverlayPromise;
  const buffer = await sharp(Buffer.from(renderSeoImage(input)))
    .composite([{ input: logoOverlay, left: 926, top: 106 }])
    .png()
    .toBuffer();

  return Uint8Array.from(buffer).buffer;
};

export const buildSeoImageResponse = (
  body: BodyInit,
  contentType: string,
): Response =>
  new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
