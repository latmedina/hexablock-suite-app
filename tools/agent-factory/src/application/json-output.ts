/**
 * Extracts the first JSON object from a model reply. Tolerates prose or ```json fences around it, and
 * raw newlines/tabs inside string literals (a frequent free-model mistake when a string holds source code).
 */
export function extractJson(raw: string): unknown {
  const candidates: string[] = [];
  const braces = sliceBraces(raw);
  if (braces) candidates.push(braces);
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/im);
  const fencedBraces = fenced?.[1] ? sliceBraces(fenced[1]) : undefined;
  if (fencedBraces) candidates.push(fencedBraces);
  if (candidates.length === 0) throw new SyntaxError('No JSON object found in the model reply');

  let lastError: unknown;
  for (const text of candidates) {
    for (const attempt of [text, escapeControlCharsInStrings(text)]) {
      try {
        return JSON.parse(attempt);
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new SyntaxError('Invalid JSON');
}

function sliceBraces(text: string): string | undefined {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start === -1 || end <= start ? undefined : text.slice(start, end + 1);
}

/** Escapes literal control characters that appear inside JSON string literals. */
export function escapeControlCharsInStrings(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      } else if (ch < ' ') {
        out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
        continue;
      }
    } else if (ch === '"') {
      inString = true;
    }
    out += ch;
  }
  return out;
}
