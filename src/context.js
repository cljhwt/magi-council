const fields = ['summary', 'host', 'sessionId', 'project'];
const lists = ['constraints', 'decisions', 'unknowns'];
function clean(value, max = 3000) {
  if (typeof value !== 'string' || value.length > max) throw new Error('背景字段必须是长度受限的文本');
  return value.replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_KEY]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED_KEY]')
    .replace(/((?:API_KEY|TOKEN|PASSWORD|SECRET)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED_KEY]').trim();
}
export function normalizeContext(input) {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('任务背景必须是结构化对象');
  if (JSON.stringify(input).length > 24000) throw new Error('任务背景超过 24000 字符，请先摘要');
  const result = { schemaVersion: 1 };
  for (const field of fields) if (input[field] !== undefined) result[field] = clean(input[field], field === 'summary' ? 8000 : 500);
  for (const field of lists) {
    if (input[field] !== undefined && (!Array.isArray(input[field]) || input[field].length > 32)) throw new Error(`${field} 必须是最多 32 项的列表`);
    result[field] = (input[field] || []).map(value => clean(value));
  }
  if (input.facts !== undefined && (!Array.isArray(input.facts) || input.facts.length > 32)) throw new Error('facts 必须是最多 32 项的列表');
  result.facts = (input.facts || []).map(fact => {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)) throw new Error('事实必须包含 text 和 source');
    const text = clean(fact.text), source = clean(fact.source, 1000);
    if (!text || !source) throw new Error('每条事实都需要内容与来源');
    return { text, source };
  });
  if (!result.summary && !result.facts.length && !result.constraints.length && !result.decisions.length) return null;
  return result;
}
