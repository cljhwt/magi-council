const $ = id => document.getElementById(id);
const roles = [ ['MELCHIOR','01','科学家','证据 · 逻辑 · 可行性'], ['BALTHASAR','02','守护者','影响 · 风险 · 长期'], ['CASPER','03','自我','意愿 · 自主 · 价值'] ];
const names = { APPROVE:'赞成', REJECT:'反对', ABSTAIN:'弃权' };
const verdicts = { APPROVED:'提案通过', REJECTED:'提案否决', DEFERRED:'暂缓决定', INCOMPLETE:'讨论不完整' };
let busy = false, controller, lastResult, calls = 0, tokens = 0;
function element(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function resetAgents() {
  $('agents').replaceChildren();
  for (const [id,number,title,focus] of roles) {
    $(`core-${id}`).removeAttribute('data-vote');$(`core-${id}`).removeAttribute('data-state');
    const card = element('article', undefined, 'agent'); card.id = id;
    const top = element('div',undefined,'agent-top'); top.append(element('span',number,'agent-number'), element('span','待机','badge'));
    card.append(top,element('p',id,'agent-id'),element('h3',title),element('p',focus,'focus'),element('div','等待提案。\n独立判断之后，再听听其他人的意见。','empty'));
    $('agents').append(card);
  }
}
function setBusy(value) {
  busy = value; for (const id of ['startBtn','demoBtn','proposal','rule']) $(id).disabled = value;
  $('cancelBtn').hidden = !value;
}
function showOpinion(id, opinion, phase) {
  $(`core-${id}`).dataset.vote=opinion.vote;$(`core-${id}`).dataset.state='done';
  const card = $(id); card.dataset.vote = opinion.vote; card.dataset.state = 'done';
  card.querySelector('.badge').textContent = `${phase === 'review' ? '终票' : '初票'} · ${names[opinion.vote]}`;
  card.querySelector('.empty')?.remove(); card.querySelector('.opinion')?.remove(); card.querySelector('details')?.remove();
  card.append(element('p',opinion.summary,'opinion'));
  const details = element('details'); details.append(element('summary','查看依据与条件'));
  for (const [key,label] of [['evidence','依据与假设'],['risks','风险'],['condition','改变意见的条件']]) details.append(element('b',label),element('div',opinion[key]));
  card.append(details);
}
function handle(event) {
  if(event.type==='agent.started')$(`core-${event.role}`).dataset.state='busy';
  if(event.type==='agent.failed')$(`core-${event.role}`).dataset.state='failed';
  if (event.type === 'agent.started') { const card=$(event.role); card.dataset.state='busy';card.querySelector('.badge').textContent=event.phase==='review'?'互评中…':'独立评估中…';$('phaseLabel').textContent=event.phase==='review'?'ROUND 02 / PEER REVIEW':'ROUND 01 / INDEPENDENT'; }
  if (event.type === 'agent.completed') showOpinion(event.role,event.opinion,event.phase);
  if (event.type === 'agent.failed') { const card=$(event.role);card.dataset.state='failed';card.querySelector('.badge').textContent='故障';card.querySelector('.empty')?.remove();card.append(element('p',event.error,'opinion')); }
  if (event.type === 'usage') { calls++; tokens += event.usage?.total_tokens || 0; $('usage').textContent=`${calls} 次调用${tokens ? ` / ${tokens} tokens` : ''}`; }
  if (event.type === 'run.failed') throw new Error(event.error);
  if (event.type === 'run.completed') renderResult(event.result);
}
function renderResult(result) {
  lastResult=result; $('result').hidden=false;$('verdict').textContent=verdicts[result.verdict];
  $('stamp').dataset.verdict=result.verdict;$('screenVerdict').textContent={APPROVED:'承認',REJECTED:'否決',DEFERRED:'保留',INCOMPLETE:'未完了'}[result.verdict];
  $('resultMeta').textContent=`${result.demo?'预设演示回放':'真实模型会话'} / ${result.rule==='majority'?'多数决':'全票通过'} / 未联网验证`;
  $('resultProposal').textContent=result.proposal;
  const valid=result.opinions.filter(Boolean);$('voteCount').textContent=`${valid.filter(o=>o.vote==='APPROVE').length} / 3`;
  $('minority').replaceChildren(element('p','各方意见与下一步'));
  result.opinions.forEach((o,i)=>$('minority').append(element('p',`${roles[i][0]} · ${o ? `${names[o.vote]}：${o.condition}` : '没有有效终票，请检查配置后重新运行。'}`)));
  $('phaseLabel').textContent='SESSION COMPLETE';$('status').textContent=result.demo?'回放结束。以上是固定脚本，不是对输入问题的实时回答。':'讨论结束。可以展开各方依据，或导出本次结果。';
}
async function api(path, options={}) { const response=await fetch(path,options);const data=await response.json();if(!response.ok)throw new Error(data.error||'请求失败');return data; }
function begin(mode) { $('proposalDialog').close();$('detailsDialog').close();resetAgents();$('screenMode').textContent=mode.includes('DEMO')?'DEMO / 固定脚本回放':'LIVE / 実行中';$('stamp').dataset.verdict='busy';$('screenVerdict').textContent='審議中';$('result').hidden=true;lastResult=null;calls=0;tokens=0;$('usage').textContent='';controller=new AbortController();setBusy(true);$('modeLabel').textContent=mode;$('status').textContent='三个单元正在接收同一提案。'; }
$('startBtn').onclick=async()=>{
  const proposal=$('proposal').value.trim();if(!proposal){$('status').textContent='请先填写明确提案。';return;}
  begin('真实会话 · LIVE');
  try {
    const response=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proposal,rule:$('rule').value}),signal:controller.signal});
    if(!response.ok)throw new Error((await response.json()).error);
    const reader=response.body.getReader(), decoder=new TextDecoder();let pending='';
    while(true){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(line)handle(JSON.parse(line));}}
    if(!lastResult)throw new Error('连接中断，未收到完整裁决。');
  }catch(error){$('status').textContent=error.name==='AbortError'?'运行已取消。已产生的调用可能仍计费。':error.message;$('phaseLabel').textContent='SESSION INTERRUPTED';$('screenVerdict').textContent='中断';roles.forEach(([id])=>{if($(`core-${id}`).dataset.state==='busy')$(`core-${id}`).dataset.state='failed';});}
  finally{setBusy(false);}
};
const demo=[
  {summary:'赞成先缩小范围。先验证三方协作是否有用，再投入语音成本。',evidence:'假设开发资源有限；无语音仍能覆盖输入、讨论、裁决和导出的完整闭环。',risks:'炫酷程度会下降，需靠清晰的意见对比支撑体验。',condition:'先测通 20 道场景题，再评估增强功能。',vote:'APPROVE'},
  {summary:'赞成。把取消、超时和少数意见保留做好，比扩展功能更值得优先。',evidence:'更小的范围有利于降低维护负担，给开发和测试留下余量。',risks:'两周仍可能过紧，应明确哪些功能可以后置。',condition:'保留故障状态，不把异常单元当成反对票。',vote:'APPROVE'},
  {summary:'暂不赞成这个范围。用户想做一个好玩的项目，需要更鲜明的体验钩子。',evidence:'视觉和声音可能是表达项目个性的方式；这里只是价值判断，不是已验证结论。',risks:'MVP 可能过于工具化，无法体现最初的兴趣。',condition:'如果原创三单元视觉和分歧呈现足够有趣，可以改变立场。',vote:'REJECT'},
];
function delay(ms,signal){return new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});});}
$('demoBtn').onclick=async()=>{
  const proposal='未来两周，先开发没有语音功能的 MAGI 最小版本。';$('proposal').value=proposal;$('rule').value='majority';begin('固定脚本回放 · DEMO');
  $('status').textContent='正在播放预设脚本。不会调用模型，也不分析自定义问题。';
  const final=structuredClone(demo);final[2].summary='仍保留反对票：我理解控制范围的必要，但希望先把视觉记忆点写进验收。';
  try {for(const phase of ['independent','review']) {for(const [id] of roles)handle({type:'agent.started',role:id,phase});for(let i=0;i<3;i++){await delay(650,controller.signal);const opinion=phase==='review'?final[i]:demo[i];handle({type:'agent.completed',role:roles[i][0],phase,opinion});}}renderResult({proposal,rule:'majority',first:demo,opinions:final,verdict:'APPROVED',demo:true});}
  catch{$('status').textContent='演示回放已停止。';$('phaseLabel').textContent='REPLAY STOPPED';$('screenVerdict').textContent='中断';roles.forEach(([id])=>{if($(`core-${id}`).dataset.state==='busy')$(`core-${id}`).dataset.state='failed';});}finally{setBusy(false);}
};
$('cancelBtn').onclick=()=>controller?.abort();
document.querySelectorAll('[data-example]').forEach(button=>button.onclick=()=>{if(!busy)$('proposal').value=button.dataset.example;});
$('exportBtn').onclick=()=>{
  if(!lastResult)return;const r=lastResult;
  let text=`# MAGI Council 合议记录\n\n模式：${r.demo?'固定脚本演示回放':'真实模型会话'}\n\n提案：${r.proposal}\n\n规则：${r.rule==='majority'?'多数决':'全票通过'}\n\n结果：${verdicts[r.verdict]}\n\n提示词版本：${r.promptVersion || '1'}\n\n未联网验证；意见一致不等于事实正确。\n`;
  if(r.models)text+=`\n模型：${roles.map(([id])=>`${id}: ${r.models[id]}`).join(' / ')}\n`;
  text+='\n## 首轮独立意见\n';
  r.first?.forEach((o,i)=>{text+=`\n### ${roles[i][0]}\n\n${o?`${names[o.vote]}：${o.summary}\n\n依据：${o.evidence}\n\n风险：${o.risks}\n\n条件：${o.condition}`:'没有有效首轮意见'}\n`;});
  text+='\n## 终轮意见\n';
  r.opinions.forEach((o,i)=>{text+=`\n## ${roles[i][0]}\n\n${o?`投票：${names[o.vote]}\n\n${o.summary}\n\n依据与假设：${o.evidence}\n\n风险：${o.risks}\n\n改变意见的条件：${o.condition}`:'没有有效终票'}\n`;});
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const link=element('a');link.href=url;link.download=`magi-${r.demo?'demo':'live'}-${Date.now()}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('settingsBtn').onclick=async()=>{
  $('settings').showModal();$('configFields').replaceChildren();$('configStatus').textContent='加载配置…';
  try{const config=await api('/api/config');for(const [id,,title] of roles){const field=element('fieldset');field.append(element('legend',`${id} / ${title}`));const grid=element('div',undefined,'config-grid');for(const [key,label,type] of [['baseUrl','Base URL','url'],['model','模型 ID','text'],['key',config[id].hasKey?'API Key · 已配置（留空保留）':'API Key · 未配置','password']]){const wrap=element('label',label),input=element('input');input.type=type;input.name=`${id}.${key}`;input.value=key==='key'?'':config[id][key];input.autocomplete='off';if(key!=='key')input.required=true;wrap.append(input);grid.append(wrap);}field.append(grid);const test=element('button','保存后测试连接');test.type='button';test.onclick=async()=>{test.disabled=true;try{await saveConfig();await api('/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:id})});$('configStatus').textContent=`${id} 连接成功（产生一次真实调用）。`;}catch(e){$('configStatus').textContent=e.message;}finally{test.disabled=false;}};field.append(test);$('configFields').append(field);}$('configStatus').textContent='连接测试会产生一次真实模型调用。';}catch(e){$('configStatus').textContent=e.message;}
};
async function saveConfig(){const form=new FormData($('configForm')),payload={};for(const [id] of roles)payload[id]=Object.fromEntries(['baseUrl','model','key'].map(k=>[k,form.get(`${id}.${k}`)]));await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});document.querySelectorAll('input[type=password]').forEach(input=>{input.value='';});}
$('configForm').onsubmit=async event=>{event.preventDefault();try{await saveConfig();$('configStatus').textContent='已保存到本机服务内存。重启后恢复 .env 设置。';}catch(e){$('configStatus').textContent=e.message;}};
$('closeSettings').onclick=()=>{$('settings').close();document.querySelectorAll('input[type=password]').forEach(input=>{input.value='';});};
const openProposal=()=>$('proposalDialog').showModal();
const openDetails=()=>$('detailsDialog').showModal();
$('proposalBtn').onclick=openProposal;$('proposalTrigger').onclick=openProposal;
$('detailsBtn').onclick=openDetails;$('resolutionTrigger').onclick=openDetails;
for(const id of ['proposalTrigger','resolutionTrigger',...roles.map(([id])=>`core-${id}`)])$(id).addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$(id).dispatchEvent(new Event('click'));}});
roles.forEach(([id])=>$(`core-${id}`).onclick=()=>{openDetails();$(id).scrollIntoView({block:'nearest'});});
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('status').textContent='浏览器不支持全屏，请使用浏览器全屏快捷键。';}};
resetAgents();
