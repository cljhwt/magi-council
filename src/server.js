import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deliberate, roles } from './core.js';
import { completion, createInvoker, normalizeBase } from './provider.js';

const port = Number(process.env.PORT || 3088);
const configs = Object.fromEntries(roles.map(r => [r.id, { baseUrl: process.env.MODEL_BASE_URL || 'https://api.deepseek.com', model: process.env.MODEL_ID || 'deepseek-chat', key: process.env.MODEL_API_KEY || '' }]));
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
async function body(req) {
  const chunks = []; let length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > 40000) throw new Error('请求内容过长'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'");
  // Local application: reject cross-origin requests, including DNS-rebinding hosts.
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return json(res, 403, { error: '不允许的主机' });
  if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) return json(res, 403, { error: '不允许的来源' });
  try {
    if (req.url === '/api/config' && req.method === 'GET') return json(res, 200, Object.fromEntries(roles.map(r => [r.id, { baseUrl: configs[r.id].baseUrl, model: configs[r.id].model, hasKey: Boolean(configs[r.id].key) }])));
    if (req.url === '/api/config' && req.method === 'POST') {
      const input = await body(req), next = {};
      for (const role of roles) {
        const c = input[role.id];
        if (!c || typeof c.model !== 'string' || !c.model.trim() || c.model.length > 200) throw new Error('请填写三个单元的模型名称');
        if (c.key !== undefined && (typeof c.key !== 'string' || c.key.length > 2000)) throw new Error('密钥格式错误');
        next[role.id] = { baseUrl: normalizeBase(c.baseUrl), model: c.model.trim(), key: c.clearKey ? '' : c.key || configs[role.id].key };
      }
      Object.assign(configs, next); return json(res, 200, { ok: true });
    }
    if (req.url === '/api/test' && req.method === 'POST') {
      const { role } = await body(req);
      if (!configs[role]) throw new Error('未知单元');
      await completion(configs[role], [{ role: 'user', content: 'Reply with OK.' }]);
      return json(res, 200, { ok: true });
    }
    if (req.url === '/api/run' && req.method === 'POST') {
      const { proposal, rule } = await body(req);
      if (typeof proposal !== 'string' || !proposal.trim() || proposal.length > 6000) throw new Error('提案需要 1–6000 个字符');
      if (!['majority', 'unanimous'].includes(rule)) throw new Error('未知表决规则');
      if (roles.some(r => !configs[r.id].key)) throw new Error('请先为三个单元配置 API Key，或使用演示回放');
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('已达到 180 秒运行时限')), 180000);
      res.on('close', () => controller.abort());
      const emit = event => { if (!res.destroyed) res.write(JSON.stringify({ ...event, at: Date.now() }) + '\n'); };
      emit({ type: 'run.started', id: crypto.randomUUID(), mode: 'live' });
      const snapshot = structuredClone(configs);
      try { await deliberate({ proposal: proposal.trim(), rule, invoke: createInvoker(snapshot, data => emit({ type: 'usage', ...data })), emit: event => emit(event.type === 'run.completed' ? { ...event, result: { ...event.result, mode: 'live', promptVersion: '1', models: Object.fromEntries(roles.map(role => [role.id, snapshot[role.id].model])) } } : event), signal: controller.signal }); }
      catch (error) { emit({ type: 'run.failed', error: controller.signal.aborted ? '运行已取消或超时' : error.message }); }
      finally { clearTimeout(timer); res.end(); }
      return;
    }
    if (req.method === 'GET') {
      const routes = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      const asset = routes[req.url];
      if (asset) { res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8` }); return res.end(await readFile(publicRoot + asset[0])); }
    }
    json(res, 404, { error: '页面不存在' });
  } catch (error) { if (!res.headersSent) json(res, 400, { error: error.message }); else res.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`MAGI Council: http://127.0.0.1:${port}`));
