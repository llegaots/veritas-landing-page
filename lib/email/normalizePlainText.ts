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
 * Unwrap plain text - makes textarea behave like "normal writing"
 * 
 * Rules:
 * - Only blank lines (2+ newlines) create paragraph breaks
 * - Single line breaks inside a paragraph get treated as spaces
 * - This prevents textarea word-wrapping from creating unwanted line breaks
 * 
 * Result: Paragraphs become flowing text (no "cut off" look), intentional blank lines stay
 */
export function unwrapPlainText(input: string): string {
  if (!input) return '';

  let s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Paragraphs are separated by 1+ blank lines
  const paras = s.split(/\n{2,}/);

  const fixed = paras.map(p =>
    p
      .split('\n')                 // lines within a paragraph
      .map(line => line.trim())
      .filter(Boolean)
      .join(' ')                   // join lines into one flowing paragraph
      .replace(/\s+/g, ' ')
      .trim()
  );

  return fixed.join('\n\n').trim(); // keep paragraph spacing
}

/**
 * Unwrap hard-wrapped text (removes line breaks that are from editor wrapping, not user intent)
 * Use this if your editor/textarea is inserting hard breaks every N characters
 * 
 * This joins single newlines within paragraphs while preserving paragraph breaks (double newlines)
 * 
 * @deprecated Use unwrapPlainText instead - it's the same thing but with a clearer name
 */
export function unwrapHardWrappedText(input: string): string {
  return unwrapPlainText(input);
}

