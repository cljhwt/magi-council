import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completion } from '../src/provider.js';

test('official DeepSeek short replies disable thinking without leaking vendor options to other providers', async t => {
  const original = globalThis.fetch, requests=[];
  t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async (_url,options)=>{requests.push(JSON.parse(options.body));return Response.json({choices:[{message:{content:'OK'}}]});};
  await completion({baseUrl:'https://api.deepseek.com',model:'deepseek-flash',key:'fake-test-key'},[]);
  await completion({baseUrl:'https://example.invalid/v1',model:'generic-model',key:'fake-test-key'},[]);
  assert.deepEqual(requests[0].thinking,{type:'disabled'});
  assert.equal('thinking' in requests[1],false);
});

test('authentication and model errors include an actionable hint without provider response secrets',async t=>{
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async()=>new Response('do-not-expose-provider-body',{status:401});
  await assert.rejects(()=>completion({baseUrl:'https://example.invalid',model:'test',key:'fake-test-key'},[]),error=>error.message.includes('API Key 无效')&&!error.message.includes('do-not-expose'));
});
