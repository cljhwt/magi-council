import { deliberate, roles } from './core.js';
import { createInvoker } from './provider.js';

// Keep the shared core independent of the optional Harness SDK.
export function magiToolOptions({ invokeFactory, disposeSignal }) {
  return {
    name: 'magi_deliberate',
    description: 'Evaluate a user-confirmed binary proposal from three independent perspectives, then review and vote. Up to six paid model calls. Does not execute actions or browse the web. Explain dissent as well as the verdict.',
    parameters: {
      proposal: { type: 'string', required: true, description: 'A concrete proposal explicitly confirmed by the user, 1–6000 characters.' },
      rule: { type: 'string', enum: ['majority', 'unanimous'], description: 'Voting rule, majority by default.' },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(args, exec) {
      if (!args.proposal.trim() || args.proposal.length > 6000) throw new Error('提案需要 1–6000 个字符');
      const signals = [AbortSignal.timeout(180000)];
      if (exec?.signal) signals.push(exec.signal);
      if (disposeSignal) signals.push(disposeSignal);
      const signal = AbortSignal.any(signals);
      const usage = [];
      const result = await deliberate({ proposal: args.proposal.trim(), rule: args.rule || 'majority', invoke: invokeFactory(usage), emit: () => {}, signal });
      return JSON.stringify({ ...result, mode: 'live', promptVersion: '1', usage });
    },
  };
}
export function envInvokeFactory(usage) {
  const configs = Object.fromEntries(roles.map(role => [role.id, {
    baseUrl: process.env[`MAGI_${role.id}_BASE_URL`] || process.env.MODEL_BASE_URL || 'https://api.deepseek.com',
    model: process.env[`MAGI_${role.id}_MODEL`] || process.env.MODEL_ID || 'deepseek-chat',
    key: process.env[`MAGI_${role.id}_API_KEY`] || process.env.MODEL_API_KEY || '',
  }]));
  if (roles.some(role => !configs[role.id].key)) throw new Error('请在 Harness 进程环境中配置 MAGI 模型密钥');
  return createInvoker(configs, data => usage.push(data));
}
