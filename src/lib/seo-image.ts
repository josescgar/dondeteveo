import sharp from "sharp";

import { SEO_IMAGE_HEIGHT, SEO_IMAGE_WIDTH, type Locale } from "./config";

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
  const descriptionLines = wrapText(description, 58, 3);
  const footerLine = wrapText(footer.filter(Boolean).join(" / "), 80, 1);
  const descriptionStartY = 250 + titleLines.length * 84;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SEO_IMAGE_WIDTH}" height="${SEO_IMAGE_HEIGHT}" viewBox="0 0 ${SEO_IMAGE_WIDTH} ${SEO_IMAGE_HEIGHT}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff7eb" />
      <stop offset="100%" stop-color="#fff1d6" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f26419" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" rx="28" />
  <circle cx="1040" cy="110" r="190" fill="#f8d9b8" opacity="0.75" />
  <circle cx="1120" cy="70" r="72" fill="#f26419" opacity="0.12" />
  <rect x="72" y="72" width="132" height="10" rx="5" fill="#f26419" opacity="0.95" />
  <rect x="72" y="112" width="256" height="2" rx="1" fill="#f4c28b" />
  <text x="72" y="150" fill="#7c2d12" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="3">${escapeXml(
    eyebrow.toUpperCase(),
  )}</text>
  <text x="72" y="96" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="2">DONDETEVEO</text>
  <text x="1110" y="96" text-anchor="end" fill="#9a3412" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="4">${escapeXml(
    locale.toUpperCase(),
  )}</text>${renderTextLines({
    lines: titleLines,
    x: 72,
    y: 250,
    lineHeight: 84,
    fontSize: 76,
    fontWeight: 800,
    fill: "#0f172a",
  })}${renderTextLines({
    lines: descriptionLines,
    x: 72,
    y: descriptionStartY,
    lineHeight: 42,
    fontSize: 30,
    fontWeight: 500,
    fill: "#475569",
  })}
  <rect x="72" y="530" width="1056" height="1" fill="#f4c28b" />${renderTextLines(
    {
      lines: footerLine,
      x: 72,
      y: 572,
      lineHeight: 32,
      fontSize: 24,
      fontWeight: 700,
      fill: "#9a3412",
    },
  )}
</svg>`;
};

export const renderSeoImagePng = async (
  input: SeoImageInput,
): Promise<ArrayBuffer> => {
  const buffer = await sharp(Buffer.from(renderSeoImage(input)))
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
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
