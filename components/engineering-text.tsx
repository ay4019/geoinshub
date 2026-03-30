"use client";

import type { ReactNode } from "react";

const greekMap: Record<string, string> = {
  alpha: "\u03B1",
  beta: "\u03B2",
  gamma: "\u03B3",
  delta: "\u03B4",
  epsilon: "\u03B5",
  lambda: "\u03BB",
  phi: "\u03C6",
  sigma: "\u03C3",
  rho: "\u03C1",
  tau: "\u03C4",
};

function replaceGreekWords(text: string): string {
  return text.replace(/\b(alpha|beta|gamma|delta|epsilon|lambda|phi|sigma|rho|tau)\b/gi, (match) => {
    return greekMap[match.toLowerCase()] ?? match;
  });
}

function formatSubToken(token: string): string {
  return token
    .split(/([(),])/)
    .map((part) => {
      const trimmed = part.trim().toLowerCase();
      return greekMap[trimmed] ?? part;
    })
    .join("");
}

function renderSegment(segment: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const cleaned = replaceGreekWords(segment);
  let working = cleaned;
  let cursorKey = 0;

  const pushWithPattern = (pattern: RegExp, mapper: (match: RegExpExecArray) => ReactNode) => {
    const nextParts: ReactNode[] = [];
    let lastIndex = 0;
    let found = false;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(working)) !== null) {
      found = true;
      const start = match.index;
      if (start > lastIndex) {
        nextParts.push(working.slice(lastIndex, start));
      }
      nextParts.push(mapper(match));
      lastIndex = start + match[0].length;
    }

    if (!found) {
      return false;
    }

    if (lastIndex < working.length) {
      nextParts.push(working.slice(lastIndex));
    }

    working = "";
    nextParts.forEach((part) => {
      if (typeof part === "string") {
        working += part;
      } else {
        parts.push(part);
      }
    });

    return true;
  };

  const renderedSpecial = pushWithPattern(/\(([^)]+)\)([A-Za-z0-9]+),([A-Za-z0-9]+)/g, (match) => {
    const [, base, firstSub, secondSub] = match;
    return (
      <span key={`${keyBase}-paren-${cursorKey++}`} className="inline">
        ({base})
        <sub className="text-[0.72em] align-sub">{firstSub}</sub>,
        <sub className="text-[0.72em] align-sub">{secondSub}</sub>
      </span>
    );
  });

  if (renderedSpecial) {
    if (working) {
      parts.push(working);
    }
    return parts;
  }

  const genericParts: ReactNode[] = [];
  const pattern = /([A-Za-z\u0370-\u03FF]+)'?_([A-Za-z0-9.]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    const [fullMatch, base, sub] = match;
    const start = match.index;
    const hasPrime = fullMatch.includes("'");

    if (start > lastIndex) {
      genericParts.push(cleaned.slice(lastIndex, start));
    }

    genericParts.push(
      <span key={`${keyBase}-${cursorKey++}`} className="inline">
        {base}
        {hasPrime ? "′" : ""}
        <sub className="text-[0.72em] align-sub">{formatSubToken(sub)}</sub>
      </span>,
    );

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < cleaned.length) {
    genericParts.push(cleaned.slice(lastIndex));
  }

  return genericParts;
}

export function EngineeringText({ text }: { text: string }) {
  const segments = text.split(/(<sub>.*?<\/sub>|<sup>.*?<\/sup>)/g);
  const output: ReactNode[] = [];

  segments.forEach((segment, index) => {
    if (!segment) {
      return;
    }

    const subMatch = segment.match(/^<sub>(.*?)<\/sub>$/);
    if (subMatch) {
      output.push(
        <sub key={`sub-${index}`} className="text-[0.72em] align-sub">
          {replaceGreekWords(subMatch[1])}
        </sub>,
      );
      return;
    }

    const supMatch = segment.match(/^<sup>(.*?)<\/sup>$/);
    if (supMatch) {
      output.push(
        <sup key={`sup-${index}`} className="text-[0.72em] align-super">
          {replaceGreekWords(supMatch[1])}
        </sup>,
      );
      return;
    }

    output.push(...renderSegment(segment, `seg-${index}`));
  });

  return <>{output.length ? output : replaceGreekWords(text)}</>;
}
