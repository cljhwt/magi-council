import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeContext } from '../src/context.js';
import { deliberate } from '../src/core.js';
import { magiToolOptions } from '../src/harness-tool.js';

test('context is bounded and facts require real source fields',()=>{
  assert.equal(normalizeContext({unknowns:['还不知道预算']}),null);
  assert.throws(()=>normalizeContext({facts:[{text:'预算有限'}]}));
  assert.throws(()=>normalizeContext({summary:'x'.repeat(24001)}));
  const value=normalizeContext({summary:'sk-abcdefghijklmnopqrstuvwxyz',facts:[{text:'用户不做语音',source:'当前对话用户消息'}]});
  assert.ok(!value.summary.includes('sk-'));assert.equal(value.facts[0].source,'当前对话用户消息');
});
test('the same sourced context reaches all independent and review calls',async()=>{
  const packet=normalizeContext({facts:[{text:'本轮不做语音',source:'用户当前消息'}],constraints:['单人开发'],unknowns:['预算未提供']});
  let count=0;
  const result=await deliberate({proposal:'先做无语音版',rule:'majority',decisionContext:packet,emit:()=>{},invoke:async(_role,_proposal,peers,_signal,context)=>{
    assert.deepEqual(context,packet);assert.equal(peers===null,count<3);count++;
    return {summary:'意见',evidence:'用户当前消息',risks:'风险',condition:'条件',vote:'ABSTAIN'};
  }});
  assert.equal(count,6);assert.equal(result.contextStatus,'provided');assert.deepEqual(result.decisionContext,packet);
});
test('Harness rejects missing background before creating a paid invoker',async()=>{
  let invoked=false;const tool=magiToolOptions({invokeFactory:()=>{invoked=true;}});
  await assert.rejects(()=>tool.execute({proposal:'测试',context_json:'{}'},{}),/缺少任务背景/);
  assert.equal(invoked,false);
});
