export type HeadingEntry = {
  id: string;
  text: string;
  level: number;
};

export const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export const stripMarkdown = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/#+\s*$/g, "")
    .trim();
};

export const extractHeadingsFromMdx = (
  content: string,
  levels: number[] = [2, 3],
): HeadingEntry[] => {
  const headings: HeadingEntry[] = [];
  const lines = content.split(/\r?\n/);
  let inFence = false;
  for (const line of lines) {
    if (/^```|^~~~/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const level = match[1].length;
    if (!levels.includes(level)) continue;
    const rawText = match[2].replace(/\s+#+\s*$/, "");
    const text = stripMarkdown(rawText);
    if (!text) continue;
    headings.push({
      level,
      text,
      id: generateHeadingId(text),
    });
  }
  return headings;
};
