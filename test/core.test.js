import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tally, votes, validateOpinion, deliberate } from '../src/core.js';
const opinion = vote => ({ summary:'摘要', evidence:'依据', risks:'风险', condition:'条件', vote });
test('all 27 vote combinations respect both decision rules', () => {
  for (const a of votes) for (const b of votes) for (const c of votes) {
    const list = [a,b,c], yes = list.filter(v=>v==='APPROVE').length, no = list.filter(v=>v==='REJECT').length;
    assert.equal(tally(list.map(opinion)), yes>=2?'APPROVED':no>=2?'REJECTED':'DEFERRED');
    assert.equal(tally(list.map(opinion),'unanimous'), yes===3?'APPROVED':no?'REJECTED':'DEFERRED');
  }
  assert.equal(tally([opinion('APPROVE'),opinion('APPROVE'),null]),'INCOMPLETE');
});
test('invalid structured responses cannot vote', () => {
  assert.throws(()=>validateOpinion({...opinion('APPROVE'),evidence:[]}));
  assert.throws(()=>validateOpinion(opinion('YES')));
});
test('first round is isolated; review only starts after all opinions exist', async()=>{
  const inputs=[],events=[];
  const result=await deliberate({proposal:'测试',rule:'majority',emit:e=>events.push(e),invoke:async(role,proposal,context)=>{inputs.push(context);return opinion('APPROVE');}});
  assert.equal(inputs.length,6);assert.ok(inputs.slice(0,3).every(c=>c===null));
  assert.ok(inputs.slice(3).every(c=>c.length===3));assert.equal(result.verdict,'APPROVED');
  assert.equal(events.filter(e=>e.type==='agent.completed').length,6);
});
test('failed first round never fabricates final votes',async()=>{
  let calls=0;
  const result=await deliberate({proposal:'测试',rule:'majority',emit:()=>{},invoke:async role=>{calls++;if(role.id==='CASPER')throw new Error('timeout');return opinion('APPROVE');}});
  assert.equal(calls,3);assert.equal(result.verdict,'INCOMPLETE');assert.deepEqual(result.opinions,[null,null,null]);
});
test('cancellation stops completion',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>deliberate({proposal:'测试',rule:'majority',emit:()=>{},signal:controller.signal,invoke:async()=>opinion('APPROVE')}));
});
