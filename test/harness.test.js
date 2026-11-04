import { test } from 'node:test';
import assert from 'node:assert/strict';
import { magiToolOptions } from '../src/harness-tool.js';
test('Harness tool reuses core and honors caller cancellation',async()=>{
  let calls=0;
  const tool=magiToolOptions({invokeFactory:()=>async()=>{calls++;return {summary:'摘要',evidence:'依据',risks:'风险',condition:'条件',vote:'ABSTAIN'};}});
  const output=JSON.parse(await tool.execute({proposal:'测试'},{}));
  assert.equal(calls,6);assert.equal(output.verdict,'DEFERRED');assert.equal(output.rule,'majority');
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>tool.execute({proposal:'测试'},{signal:controller.signal}));
  assert.equal(calls,6);
});
