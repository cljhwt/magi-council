import { deliberate, roles } from './core.js';
import { createInvoker } from './provider.js';
import { normalizeContext } from './context.js';

// Keep the shared core independent of the optional Harness SDK.
export function magiToolOptions({ invokeFactory, disposeSignal }) {
  return {
    name: 'magi_deliberate',
    description: 'Evaluate a proposal using the calling agent\'s current conversation context. Before calling, prepare context_json from relevant visible messages and project memories: sourced facts, constraints, prior decisions and unknowns. No automatic access to hidden or other sessions. Up to six paid model calls. Explain dissent and missing information.',
    parameters: {
      proposal: { type: 'string', required: true, description: 'A concrete proposal explicitly confirmed by the user, 1–6000 characters.' },
      context_json: { type: 'string', required: true, description: 'JSON context packet: summary, host, sessionId, project, facts [{text,source}], constraints [], decisions [], unknowns []. Use relevant accessible conversation memory; omit credentials and unrelated history. Never fabricate facts or sources.' },
      rule: { type: 'string', enum: ['majority', 'unanimous'], description: 'Voting rule, majority by default.' },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args, exec) {
      if (!args.proposal.trim() || args.proposal.length > 6000) throw new Error('提案需要 1–6000 个字符');
      if (args.rule && !['majority', 'unanimous'].includes(args.rule)) throw new Error('未知表决规则');
      let decisionContext;
      try { decisionContext = normalizeContext(JSON.parse(args.context_json)); }
      catch { throw new Error('请在 context_json 提供有效的任务背景 JSON，事实需注明来源'); }
      if (!decisionContext) throw new Error('缺少任务背景，请主 Agent 先整理当前会话中的事实、约束和已有决定');
      const signals = [AbortSignal.timeout(180000)];
      if (exec?.signal) signals.push(exec.signal);
      if (disposeSignal) signals.push(disposeSignal);
      const signal = AbortSignal.any(signals);
      const usage = [];
      const result = await deliberate({ proposal: args.proposal.trim(), rule: args.rule || 'majority', decisionContext, invoke: invokeFactory(usage), emit: () => {}, signal });
      return JSON.stringify({ ...result, mode: 'live', promptVersion: '2', usage });
    },
  };
}
export function envInvokeFactory(usage) {
  const configs = Object.fromEntries(roles.map(role => [role.id, {
    baseUrl: process.env[`MAGI_${role.id}_BASE_URL`] || process.env.MODEL_BASE_URL || 'https://api.deepseek.com',
    model: process.env[`MAGI_${role.id}_MODEL`] || process.env.MODEL_ID || 'deepseek-flash',
    key: process.env[`MAGI_${role.id}_API_KEY`] || process.env.MODEL_API_KEY || '',
  }]));
  if (roles.some(role => !configs[role.id].key)) throw new Error('请在 Harness 进程环境中配置 MAGI 模型密钥');
  return createInvoker(configs, data => usage.push(data));
}
