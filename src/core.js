export const roles = [
  { id: 'MELCHIOR', number: '01', title: '科学家', focus: '证据 · 逻辑 · 可行性', prompt: '从科学家的视角检查证据、可行性与资源约束。指出可证伪假设，提出最低成本的验证步骤。不要把个人偏好当事实。' },
  { id: 'BALTHASAR', number: '02', title: '守护者', focus: '影响 · 风险 · 长期', prompt: '从照顾相关人的视角检查长期影响、失败代价、可逆性和恢复路径。不要为了谨慎一律反对。' },
  { id: 'CASPER', number: '03', title: '自我', focus: '意愿 · 自主 · 价值', prompt: '从个人自主性的视角检查用户意愿、情感和价值取向。不擅自定义用户的幸福，不推断未提供的隐私。' },
];
export const votes = ['APPROVE', 'REJECT', 'ABSTAIN'];
export function validateOpinion(value) {
  if (!value || typeof value !== 'object' || !votes.includes(value.vote)) throw new Error('模型返回了无效投票');
  for (const field of ['summary', 'evidence', 'risks', 'condition']) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 6000) throw new Error(`模型返回缺少有效 ${field}`);
  }
  return Object.fromEntries(['summary', 'evidence', 'risks', 'condition', 'vote'].map(k => [k, value[k]]));
}
export function tally(opinions, rule = 'majority') {
  if (opinions.length !== 3 || opinions.some(o => !o || !votes.includes(o.vote))) return 'INCOMPLETE';
  const yes = opinions.filter(o => o.vote === 'APPROVE').length;
  const no = opinions.filter(o => o.vote === 'REJECT').length;
  if (rule === 'unanimous') return yes === 3 ? 'APPROVED' : no > 0 ? 'REJECTED' : 'DEFERRED';
  return yes >= 2 ? 'APPROVED' : no >= 2 ? 'REJECTED' : 'DEFERRED';
}
export async function deliberate({ proposal, rule, invoke, emit, signal, decisionContext = null }) {
  const first = new Array(3).fill(null), final = new Array(3).fill(null);
  const check = () => signal?.throwIfAborted();
  const round = async (phase, target, context) => {
    await Promise.all(roles.map(async (role, index) => {
      check(); emit({ type: 'agent.started', role: role.id, phase });
      try {
        const opinion = validateOpinion(await invoke(role, proposal, context, signal, decisionContext));
        check(); target[index] = opinion;
        emit({ type: 'agent.completed', role: role.id, phase, opinion });
      } catch (error) {
        check(); emit({ type: 'agent.failed', role: role.id, phase, error: error.message });
      }
    }));
  };
  await round('independent', first, null);
  check();
  if (first.every(Boolean)) await round('review', final, first.map((opinion, i) => ({ role: roles[i].id, ...opinion })));
  const result = { proposal, rule, first, opinions: final, verdict: tally(final, rule), verified: false, decisionContext, contextStatus: decisionContext ? 'provided' : 'missing' };
  check(); emit({ type: 'run.completed', result }); return result;
}
