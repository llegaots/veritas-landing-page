/**
 * Normalize plain text content from textarea/editor
 * This fixes issues where textarea wrapping or copy-paste creates unwanted line breaks
 * 
 * Rules:
 * - Normalize all newline types to \n
 * - Remove trailing whitespace on each line
 * - Collapse excessive blank lines (3+ newlines → 2)
 * - Trim outer whitespace
 */
export function normalizePlainText(input: string): string {
  if (!input) return '';

  // 1) Normalize newlines to \n
  let s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2) Remove trailing whitespace on each line
  s = s.replace(/[ \t]+\n/g, '\n');

  // 3) Collapse "too many" blank lines (keep max 1 blank line)
  // i.e. turn 3+ newlines into 2
  s = s.replace(/\n{3,}/g, '\n\n');

  // 4) Trim outer whitespace
  return s.trim();
}

/**
 * Unwrap hard-wrapped text (removes line breaks that are from editor wrapping, not user intent)
 * Use this if your editor/textarea is inserting hard breaks every N characters
 * 
 * This joins single newlines within paragraphs while preserving paragraph breaks (double newlines)
 */
export function unwrapHardWrappedText(input: string): string {
  if (!input) return '';

  let s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into paragraphs by blank lines (2+ newlines)
  const paragraphs = s.split(/\n{2,}/);

  const fixed = paragraphs.map(p =>
    p
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join(' ')
  );

  return fixed.join('\n\n').trim();
}

