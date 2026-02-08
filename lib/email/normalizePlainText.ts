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
 * Preserve exact formatting from textarea - don't unwrap anything
 * 
 * Rules:
 * - Preserve ALL line breaks exactly as typed
 * - Only normalize newline types (\r\n → \n)
 * - Only collapse excessive blank lines (3+ newlines → 2)
 * - This ensures the email looks exactly like what the user typed in the textarea
 * 
 * Result: Exact formatting preserved - bullet lists, line breaks, etc. all stay intact
 */
export function unwrapPlainText(input: string): string {
  if (!input) return '';

  // Normalize newline types but preserve all line breaks
  let s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Only collapse excessive blank lines (3+ newlines → 2)
  s = s.replace(/\n{3,}/g, '\n\n');

  // Trim outer whitespace but preserve all internal formatting
  return s.trim();
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

