import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { consult } from '../plugins/magi-council/scripts/consult.mjs';

test('Codex plugin client forwards context and reads split Unicode event streams',async t=>{
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;
    const body=JSON.parse(raw);assert.equal(body.decisionContext.summary,'用户已选择无语音');
    res.writeHead(200,{'Content-Type':'application/x-ndjson'});
    const output=Buffer.from(JSON.stringify({type:'run.completed',result:{verdict:'DEFERRED',contextStatus:'provided',summary:'中文判断'}})+'\n');
    for(let i=0;i<output.length;i+=7)res.write(output.subarray(i,i+7));res.end();
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
  const result=await consult({proposal:'测试',decisionContext:{summary:'用户已选择无语音'}},{serviceUrl:`http://127.0.0.1:${server.address().port}`});
  assert.equal(result.summary,'中文判断');assert.equal(result.contextStatus,'provided');
});
test('Codex client refuses empty background and remote endpoints before sending',async()=>{
  await assert.rejects(()=>consult({proposal:'测试',decisionContext:{}}),/背景为空/);
  await assert.rejects(()=>consult({proposal:'测试',decisionContext:{summary:'背景'}},{serviceUrl:'https://example.com'}),/本机/);
});
