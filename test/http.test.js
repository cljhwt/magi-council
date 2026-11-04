import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('HTTP pipeline: config secrecy, six calls, isolation, failure and origin protection', async t => {
  const requests=[];let fail=false;
  const provider=http.createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    const data=JSON.parse(body);requests.push(data);
    if(fail){res.writeHead(429);res.end('{}');return;}
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'测试观点',evidence:'测试依据',risks:'测试风险',condition:'测试条件',vote:'APPROVE'})}}],usage:{total_tokens:25}}));
  });
  provider.listen(0,'127.0.0.1');await once(provider,'listening');t.after(()=>provider.close());
  const reservation=http.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const child=spawn(process.execPath,['src/server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),MODEL_API_KEY:'',MODEL_ID:'test-model',MODEL_BASE_URL:`http://127.0.0.1:${provider.address().port}`},stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());await once(child.stdout,'data');
  const base=`http://127.0.0.1:${port}`;
  const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const missing=await post('/api/run',{proposal:'测试',rule:'majority'});assert.equal(missing.status,400);
  const config=Object.fromEntries(['MELCHIOR','BALTHASAR','CASPER'].map(id=>[id,{baseUrl:`http://127.0.0.1:${provider.address().port}`,model:'test-model',key:'fake-test-key'}]));
  assert.equal((await post('/api/config',config)).status,200);
  const visible=await (await fetch(base+'/api/config')).text();assert.ok(!visible.includes('fake-test-key'));assert.ok(visible.includes('hasKey'));
  const response=await post('/api/run',{proposal:'应当先验证核心闭环。',rule:'majority'});
  const events=(await response.text()).trim().split('\n').map(JSON.parse);
  assert.equal(events.at(-1).result.verdict,'APPROVED');assert.equal(requests.length,6);
  assert.ok(requests.slice(0,3).every(r=>JSON.parse(r.messages[1].content).peerOpinions===null));
  assert.ok(requests.slice(3).every(r=>JSON.parse(r.messages[1].content).peerOpinions.length===3));
  assert.ok(!JSON.stringify(events).includes('fake-test-key'));
  fail=true;const failed=await post('/api/run',{proposal:'测试失败',rule:'majority'});
  const failedEvents=(await failed.text()).trim().split('\n').map(JSON.parse);
  assert.equal(failedEvents.at(-1).result.verdict,'INCOMPLETE');assert.equal(requests.length,9);
  assert.equal((await fetch(base+'/api/config',{headers:{Origin:'https://evil.example'}})).status,403);
});
