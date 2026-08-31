import { ReadabilityMetrics } from '../types';

/**
 * Accurately counts sentences in Markdown prose using structural & markdown-aware detection.
 * Handles headings, bullet/numbered lists, task lists, table rows, blockquotes, and multi-line paragraphs.
 */
export function countMarkdownSentences(markdown: string): number {
  if (!markdown || !markdown.trim()) return 0;

  // 1. Strip fenced code blocks, display math, and HTML comments
  const textWithoutBlocks = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const lines = textWithoutBlocks.split('\n');
  const structuralBlocks: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const combined = currentParagraphLines.join(' ').trim();
      if (combined) {
        structuralBlocks.push(combined);
      }
      currentParagraphLines = [];
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Check if line is a structural markdown element
    const isHeading = /^#{1,6}\s+/.test(trimmed);
    const isListItem = /^([-*+]|\d+[.)])\s+/.test(trimmed);
    const isBlockquote = /^>\s*/.test(trimmed);
    const isTableRow = /^\|.*\|$/.test(trimmed);
    const isHorizontalRule = /^([-*_]\s*){3,}$/.test(trimmed);

    if (isHorizontalRule) {
      flushParagraph();
      continue;
    }

    if (isHeading || isListItem || isBlockquote || isTableRow) {
      flushParagraph();
      // Clean the structural prefix
      const cleaned = trimmed
        .replace(/^#{1,6}\s+/, '')
        .replace(/^([-*+]|\d+[.)])\s+(\[[ xX]\]\s*)?/, '')
        .replace(/^>\s*/, '')
        .replace(/^\||\|$/g, '')
        .replace(/\|/g, ', ');
      
      if (cleaned.trim()) {
        structuralBlocks.push(cleaned.trim());
      }
    } else {
      // Regular paragraph line - accumulate for soft-wrap handling
      currentParagraphLines.push(trimmed);
    }
  }

  flushParagraph();

  let totalSentences = 0;

  for (const block of structuralBlocks) {
    // Strip inline markdown artifacts: images, links, formatting, math, inline code
    const cleanBlock = block
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/`[^`]+`/g, '')
      .replace(/\$[^\$]+?\$/g, '')
      .replace(/[*_~`]/g, '')
      .trim();

    if (!cleanBlock) continue;

    // Check if block contains any actual letters/numbers
    const hasWords = /[a-zA-Z0-9_\u00C0-\u017F]/.test(cleanBlock);
    if (!hasWords) continue;

    // Split by sentence terminators: . ! ? … and CJK punctuation 。！？
    const segments = cleanBlock
      .split(/[.!?…\u3002\uFF01\uFF1F]+(?:\s+|$|["'”’»])/g)
      .map((s) => s.trim())
      .filter((s) => /[a-zA-Z0-9_\u00C0-\u017F]/.test(s));

    // Each non-empty structural unit counts as at least 1 sentence
    const blockSentences = Math.max(1, segments.length);
    totalSentences += blockSentences;
  }

  return Math.max(1, totalSentences);
}

const readabilityCache = new Map<string, ReadabilityMetrics>();
const MAX_READABILITY_CACHE = 40;

export function clearReadabilityCache() {
  readabilityCache.clear();
}

export function calculateReadability(markdown: string): ReadabilityMetrics {
  if (!markdown || !markdown.trim()) {
    return {
      words: 0,
      rawWords: 0,
      omittedWords: 0,
      characters: 0,
      charactersNoSpaces: 0,
      proseCharacters: 0,
      paragraphs: 0,
      headings: 0,
      codeBlocksCount: 0,
      mathBlocksCount: 0,
      lines: 0,
      readingTimeMinutes: 0,
      speakingTimeMinutes: 0,
      fleschKincaidScore: 100,
      gradeLevelText: 'General',
    };
  }

  if (readabilityCache.has(markdown)) {
    return readabilityCache.get(markdown)!;
  }

  // 1. Raw word count & raw token analysis (includes everything in the source)
  const rawWordsArray = markdown.match(/\b[a-zA-Z0-9_\u00C0-\u017F'-]+\b/g) || [];
  const rawWords = rawWordsArray.length;
  const lines = markdown.split('\n').length;
  const codeBlocksCount = (markdown.match(/```[\s\S]*?```/g) || []).length;
  const mathBlocksCount = (markdown.match(/\$\$[\s\S]*?\$\$/g) || []).length;

  // 2. Filtered Prose Text: strips non-prose elements for authentic reading metrics
  const cleanProse = markdown
    .replace(/^---[\s\S]*?---\s*\n/g, '') // YAML frontmatter
    .replace(/```[\s\S]*?```/g, '') // Fenced code blocks
    .replace(/\$\$[\s\S]*?\$\$/g, '') // Display LaTeX Math
    .replace(/\$[^\$\n]+?\$/g, '') // Inline LaTeX Math
    .replace(/`[^`\n]+`/g, '') // Inline code
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments
    .replace(/<[^>]*>/g, '') // HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // Extract link anchor text only
    .replace(/^(\s*[-*+]|\s*\d+[.)])\s+\[([ xX])\]\s*/gm, '') // Checkboxes
    .replace(/^#{1,6}\s+/gm, '') // Heading markers
    .replace(/^>\s*/gm, '') // Blockquote markers
    .replace(/^([-*_]\s*){3,}$/gm, '') // Horizontal rules
    .replace(/[*_~=`]/g, ' ') // Inline markdown markers
    .replace(/\|/g, ' ') // Table cell borders
    .trim();

  // Filtered prose words
  const wordsArray = cleanProse.match(/\b[a-zA-Z0-9_\u00C0-\u017F'-]+\b/g) || [];
  const words = wordsArray.length;
  const omittedWords = Math.max(0, rawWords - words);

  // Characters
  const characters = markdown.length;
  const charactersNoSpaces = markdown.replace(/\s+/g, '').length;
  const proseCharacters = cleanProse.length;

  // Paragraphs
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0 && !p.trim().startsWith('#')).length;

  // Headings
  const headings = (markdown.match(/^#{1,6}\s+.+$/gm) || []).length;

  // Reading time (approx 200-220 words per minute for silent reading)
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 210));

  // Speaking time (approx 130 words per minute)
  const speakingTimeMinutes = Math.max(1, Math.ceil(words / 130));

  // Markdown-aware structural sentence counting
  const sentences = countMarkdownSentences(markdown);
  
  let totalSyllables = 0;
  for (const word of wordsArray) {
    totalSyllables += countSyllables(word);
  }

  // Flesch Reading Ease score = 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
  let fleschScore = 100;
  let gradeLevel = '5th Grade (Easy)';

  if (words > 0 && sentences > 0) {
    fleschScore = Math.round(
      206.835 - 1.015 * (words / sentences) - 84.6 * (totalSyllables / words)
    );
    fleschScore = Math.max(0, Math.min(100, fleschScore));

    if (fleschScore >= 90) gradeLevel = '5th Grade (Very Easy)';
    else if (fleschScore >= 80) gradeLevel = '6th Grade (Easy)';
    else if (fleschScore >= 70) gradeLevel = '7th Grade (Fairly Easy)';
    else if (fleschScore >= 60) gradeLevel = '8th-9th Grade (Plain English)';
    else if (fleschScore >= 50) gradeLevel = '10th-12th Grade (Fairly Difficult)';
    else if (fleschScore >= 30) gradeLevel = 'College Level (Difficult)';
    else gradeLevel = 'Academic / Graduate (Very Difficult)';
  }

  const result: ReadabilityMetrics = {
    words,
    rawWords,
    omittedWords,
    characters,
    charactersNoSpaces,
    proseCharacters,
    paragraphs: Math.max(1, paragraphs),
    headings,
    codeBlocksCount,
    mathBlocksCount,
    lines,
    readingTimeMinutes: words === 0 ? 0 : readingTimeMinutes,
    speakingTimeMinutes: words === 0 ? 0 : speakingTimeMinutes,
    fleschKincaidScore: fleschScore,
    gradeLevelText: gradeLevel,
  };

  if (readabilityCache.size >= MAX_READABILITY_CACHE) {
    const firstKey = readabilityCache.keys().next().value;
    if (firstKey) readabilityCache.delete(firstKey);
  }
  readabilityCache.set(markdown, result);

  return result;
}

// Word Syllables LRU cache to prevent repeated regex evaluations
const syllableCache = new Map<string, number>();
const MAX_SYLLABLE_CACHE = 4000;

function countSyllables(word: string): number {
  if (!word) return 1;
  const lower = word.toLowerCase();
  
  if (syllableCache.has(lower)) {
    return syllableCache.get(lower)!;
  }

  let count = 1;
  if (lower.length <= 3) {
    count = 1;
  } else {
    const cleaned = lower.replace(/(?:[^laeiouy]|ed|es|e)$/, '').replace(/^y/, '');
    const syl = cleaned.match(/[aeiouy]{1,2}/g);
    count = syl ? Math.max(1, syl.length) : 1;
  }

  if (syllableCache.size >= MAX_SYLLABLE_CACHE) {
    const firstKey = syllableCache.keys().next().value;
    if (firstKey) syllableCache.delete(firstKey);
  }
  syllableCache.set(lower, count);

  return count;
}


