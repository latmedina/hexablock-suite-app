/** Extracts the first JSON object from a model reply (tolerates ```json fences and prose around it). */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new SyntaxError('No JSON object found in the model reply');
  return JSON.parse(candidate.slice(start, end + 1));
}
