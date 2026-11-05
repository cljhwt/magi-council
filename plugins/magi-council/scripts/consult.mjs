import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function consult(packet, { serviceUrl = 'http://127.0.0.1:3088', signal } = {}) {
  const url = new URL(serviceUrl);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('MAGI_SERVICE_URL 必须是本机 HTTP 服务地址');
  if (!packet || typeof packet.proposal !== 'string' || !packet.proposal.trim()) throw new Error('请提供 proposal');
  if (!packet.decisionContext || typeof packet.decisionContext !== 'object' || Array.isArray(packet.decisionContext)) throw new Error('缺少 decisionContext，请主 Agent 先整理当前任务背景');
  const { summary, facts, constraints, decisions } = packet.decisionContext;
  if (!summary && !facts?.length && !constraints?.length && !decisions?.length) throw new Error('任务背景为空，不能无依据调用 MAGI');
  const body = JSON.stringify({ proposal: packet.proposal, rule: packet.rule || 'majority', decisionContext: packet.decisionContext });
  if (Buffer.byteLength(body) > 128000) throw new Error('请求过大，请先压缩背景');
  const response = await fetch(new URL('/api/run', url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(190000)]) });
  if (!response.ok) { const data = await response.json(); throw new Error(data.error || `HTTP ${response.status}`); }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  const failures = [], usage = []; let pending = '', result;
  const consume = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'run.failed') throw new Error(event.error);
    if (event.type === 'agent.failed') failures.push({ role: event.role, phase: event.phase, error: event.error });
    if (event.type === 'usage') usage.push({ role: event.role, usage: event.usage });
    if (event.type === 'run.completed') result = event.result;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let end;
      while ((end = pending.indexOf('\n')) >= 0) { consume(pending.slice(0, end)); pending = pending.slice(end + 1); }
    }
    pending += decoder.decode(); if (pending.trim()) consume(pending);
    if (!result) throw new Error('连接结束但未收到裁决');
    return { ...result, failures, usage };
  } finally { await reader.cancel().catch(() => {}); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--help')) { console.log('node consult.mjs --input request.json [--output result.json]'); }
    else {
      const input = args[args.indexOf('--input') + 1];
      if (!args.includes('--input') || !input || input.startsWith('--')) throw new Error('需要 --input request.json');
      const raw = await readFile(input, 'utf8'); if (Buffer.byteLength(raw) > 128000) throw new Error('背景文件过大');
      const result = await consult(JSON.parse(raw), { serviceUrl: process.env.MAGI_SERVICE_URL });
      const text = JSON.stringify(result, null, 2);
      if (args.includes('--output')) { const output = args[args.indexOf('--output') + 1]; if (!output || output.startsWith('--')) throw new Error('需要有效输出路径'); await writeFile(output, text + '\n', { encoding: 'utf8', mode: 0o600 }); }
      console.log(text);
    }
  } catch (error) { console.error(`MAGI: ${error.message}`); process.exitCode = 1; }
}
