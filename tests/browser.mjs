import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lessons} from '../src/lessons.mjs';
import {chapters} from '../src/readings.mjs';
import {order} from '../src/catalog.mjs';
const {samples,variants}=JSON.parse(execFileSync('python3',['tests/test_course.py','--browser-samples'],{encoding:'utf8'}));
async function openDownloads(page){
 const downloads=page.locator('.downloads');
 if(await downloads.getAttribute('open')===null)await downloads.locator('summary').click();
}
const shardCount=Number(process.env.ESL_BROWSER_SHARDS||1),shardIndex=Number(process.env.ESL_BROWSER_SHARD||0);
assert.ok(Number.isInteger(shardCount)&&shardCount>=1&&shardCount<=lessons.length);
assert.ok(Number.isInteger(shardIndex)&&shardIndex>=0&&shardIndex<shardCount);
const port=5274+shardIndex*10;
const resultDir=shardCount===1?'test-results':`test-results/shard-${shardIndex}`;
const artifact=name=>resultDir+'/'+name;
await fs.mkdir(resultDir,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','.preview'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${port}/messaging-patterns-lab/`)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.CI ? undefined : process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 page.setDefaultTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const requestedSources=[];
 context.on('request',request=>{
  const url=new URL(request.url());
  if(/\/(app\.js|worker\.js|lessons\.mjs|warm-session\.mjs|wasi-poll\.mjs|runtime-cache\.mjs|python\/(messaging|peer|runner|session_runner)\.py)$/.test(url.pathname))requestedSources.push(url);
 });
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const base=`http://127.0.0.1:${port}/messaging-patterns-lab/`;
 const landing=await page.goto(base);assert.equal(landing.status(),200,'Prepared course missing from the configured preview path');await page.screenshot({path:artifact('overview-desktop.png'),fullPage:true});
 assert.equal(await page.locator('.lesson-card').count(),order.length);
 for(let i=0;i<lessons.length;i++){
  if(i%shardCount!==shardIndex)continue;
  await page.goto(base+'lessons/'+lessons[i].slug+'.html');
  assert.equal(await page.locator('.underhood tbody tr').count(),5);
  if(lessons[i].slug==='diagnose-the-missing-receipt'){await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  let workerRequests=0;
  if(i===0){
   // Stall initialization only. The successful retry still runs real Linux/ZeroMQ.
   await page.route(/\/worker\.js\?v=/,route=>{
    workerRequests++;
    return workerRequests<=3?route.fulfill({contentType:'text/javascript',body:"onmessage=()=>postMessage({type:'loading',stage:'boot',message:'Test guest startup pending…'})"}):route.continue();
   });
   await page.evaluate(()=>{
    const original=window.setTimeout;let bootTimers=0;
    window.setTimeout=(fn,delay,...args)=>original(fn,delay===60000&&++bootTimers<=3?800:delay,...args);
   });
   await page.locator('#run').click();
   await page.waitForFunction(()=>document.querySelector('#status').textContent==='Test guest startup pending…');
   await page.locator('#stop').click();await page.waitForTimeout(1100);
   assert.equal(workerRequests,1,'Stop must cancel the startup watchdog');
   assert.match(await page.locator('#status').textContent(),/Stopped/);
   // Isolate the host watchdog from real guest boot variability. No result is fabricated.
   await page.locator('#run').click();
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('stalled twice'));
   assert.equal(workerRequests,3,'Initialization is bounded to one retry');
   assert.equal(await page.locator('#export').isDisabled(),true);
   await page.unroute(/\/worker\.js\?v=/);
  }
  await page.locator('#run').click();
  try{await page.waitForFunction(()=>!document.querySelector('#run').disabled,undefined,{timeout:240000})}
  catch(error){await page.screenshot({path:artifact('failure-')+lessons[i].slug+'.png',fullPage:true});await fs.writeFile(artifact('failure-')+lessons[i].slug+'.json',JSON.stringify({status:await page.locator('#status').textContent(),output:await page.locator('#output').textContent(),source:await page.locator('#code').inputValue()},null,2));throw error}
  const status=await page.locator('#status').textContent();
  if(!status.includes('Completed')){await page.screenshot({path:artifact('failure-')+lessons[i].slug+'.png',fullPage:true});await fs.writeFile(artifact('failure-')+lessons[i].slug+'.json',JSON.stringify({status,output:await page.locator('#output').textContent()},null,2))}
  assert.match(status,/Completed/);
  assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),samples[i],lessons[i].slug);
  if(i===shardIndex+shardCount){
   await openDownloads(page);
   const cachedDownload=page.waitForEvent('download');await page.locator('#export').click();
   await (await cachedDownload).saveAs(artifact('cached-runtime.json'));
   const cached=JSON.parse(await fs.readFile(artifact('cached-runtime.json'),'utf8'));
   assert.equal(cached.runtime.timing.asset_source,'browser-cache','Chapter navigation reuses prepared assets');
   assert.ok(cached.runtime.timing.guest_startup_ms>0,'A cached runtime still starts a new guest');
   assert.ok(cached.runtime.timing.total_ms>=cached.runtime.timing.guest_startup_ms);
  }
  if(i===0){
   assert.equal(workerRequests,3,'A stalled guest gets exactly one initialization retry');
   await openDownloads(page);
   const retryExport=page.waitForEvent('download');await page.locator('#export').click();
   await (await retryExport).saveAs(artifact('initialization-retry.json'));
   const retried=JSON.parse(await fs.readFile(artifact('initialization-retry.json'),'utf8'));
   assert.ok([0,1].includes(retried.runtime.initialization_retries));
   assert.deepEqual(retried.result,samples[0]);
   await page.unroute(/\/worker\.js\?v=/);
   console.log('PASS startup watchdog: Stop cancels; boot retries are bounded; fresh actual Linux execution matches native.');
  }
  console.log('PASS Linux lesson:',lessons[i].slug);
  const {code,slug}=lessons[i];
  const edits=await page.locator('.change code').allTextContents();
  const requested=edits.filter(text=>text.startsWith('result = '));
  assert.deepEqual(requested,(variants[slug]??[]).map(value=>value.edit),slug);
  for(const variant of variants[slug]??[]){
   await page.locator('#code').fill(code.slice(0,code.lastIndexOf('\n')+1)+variant.edit);
   await page.locator('#run').click();
   await page.waitForFunction(()=>!document.querySelector('#run').disabled);
   assert.match(await page.locator('#status').textContent(),/Completed/,slug);
   assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),variant.result,slug);
   console.log('PASS Linux follow-up edit:',slug,variant.edit);
  }
  if(requested.length)await page.locator('#restore').click();
  await page.locator('#done').check();
 }
 if(shardIndex===0){
 await page.goto(base+'lessons/'+lessons[0].slug+'.html');
 const edited=lessons[0].code.replace("round_trip()","round_trip('order-42')");
 await page.locator('#code').fill(edited);await page.locator('#run').click();
 await page.waitForFunction(()=>!document.querySelector('#run').disabled);
 assert.match(await page.locator('#status').textContent(),/Completed/);
 const retainedOutput=await page.locator('#output').textContent();
 assert.deepEqual(JSON.parse(retainedOutput).reply,['ACK','order-42']);
 assert.ok(!(await page.locator('#stop').isVisible()));
 await page.locator('#code').fill("raise ValueError('test failure')");await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('reported an error'),undefined,{timeout:240000});
 assert.match(await page.locator('#error-summary').textContent(),/test failure/);
 assert.equal(await page.locator('#output').textContent(),retainedOutput);
 assert.match(await page.locator('#execution-note').textContent(),/edited version.*changed/);
 await openDownloads(page);
 const retainedDownload=page.waitForEvent('download');await page.locator('#export').click();
 const retained=JSON.parse(await fs.readFile(await (await retainedDownload).path(),'utf8'));
 assert.equal(retained.source,edited);
 assert.deepEqual(retained.result,JSON.parse(retainedOutput));
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'));
 await page.locator('#code').fill('while True: pass');await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Running your Python…');await page.waitForTimeout(500);await page.locator('#stop').click();
 assert.match(await page.locator('#status').textContent(),/Stopped/);
 assert.ok(!(await page.locator('#stop').isVisible()));
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'),undefined,{timeout:240000});
 const downloaded=page.waitForEvent('download');await page.locator('#download').click();const file=await downloaded;await file.saveAs(artifact('downloaded.py'));assert.deepEqual(JSON.parse(execFileSync('python3',[artifact('downloaded.py')],{encoding:'utf8'})),samples[0]);
 const exported=page.waitForEvent('download');await page.locator('#export').click();const record=await exported;await record.saveAs(artifact('run.json'));const savedRun=JSON.parse(await fs.readFile(artifact('run.json'),'utf8'));assert.deepEqual(savedRun.result,samples[0]);assert.equal(savedRun.runtime.pyzmq,'27.3.0');assert.match(savedRun.runtime.transport,/libzmq/);
 await page.locator('#code').fill(lessons[0].code+'\n# saved edit');assert.match(await page.locator('#execution-note').textContent(),/editor has changed/);await page.reload();assert.match(await page.locator('#code').inputValue(),/saved edit/);assert.equal(await page.locator('#done').isChecked(),true);
 await page.locator('#restore').click();await page.reload();
 assert.equal(await page.locator('#code').inputValue(),lessons[0].code);
 await page.locator('#recover').click();await page.reload();
 assert.match(await page.locator('#code').inputValue(),/saved edit/);
 // Existing drafts are preserved and download separately; reading marks survive.
 await page.evaluate(()=>{
  localStorage.removeItem('mpl:draft-state:request-and-reply');
  localStorage.setItem('mpl:draft:request-and-reply','# Existing PyZMQ draft');
  localStorage.setItem('mpl:draft-runtime:request-and-reply','pyzmq-v1');
 });
 await page.reload();assert.equal(await page.locator('#code').inputValue(),'# Existing PyZMQ draft');
 await page.locator('#restore').click();await page.reload();await page.locator('#recover').click();
 assert.equal(await page.locator('#code').inputValue(),'# Existing PyZMQ draft');
 await page.evaluate(()=>{
  localStorage.removeItem('mpl:draft-state:request-and-reply');
  localStorage.setItem('mpl:draft:request-and-reply','import reactivex as rx\n# previous draft');
  localStorage.removeItem('mpl:draft-runtime:request-and-reply');
 });
 await page.reload();assert.equal(await page.locator('#code').inputValue(),lessons[0].code);
 await openDownloads(page);
 const previous=page.waitForEvent('download');await page.getByRole('button',{name:'Download previous draft'}).click();
 assert.match(await fs.readFile(await (await previous).path(),'utf8'),/reactivex/);
 assert.equal(await page.locator('#done').isChecked(),true);
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.screenshot({path:artifact('lesson-dark.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:artifact('lesson-mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile lesson overflow');
 await page.goto(base);await page.screenshot({path:artifact('overview-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overview overflow');
 // Advanced reading remains readable without JavaScript or any Python downloads.
 const readingContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:1000}});
 const reading=await readingContext.newPage();const requested=[];reading.on('request',r=>requested.push(r.url()));
 for(const c of chapters){
  const r=await reading.goto(base+'advanced/'+c.slug+'.html');assert.equal(r.status(),200);
  assert.equal(await reading.locator('h1').textContent(),c.title);
  assert.ok(await reading.locator('tbody tr').count()>=3);
  assert.ok((await reading.locator('main').innerText()).length>3000);
 }
 assert.equal(requested.some(url=>/\/(engine|assets\/linux)\//.test(url)),false);
 await reading.close();await readingContext.close();
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'advanced/message-completion-and-durability.html');
 await page.screenshot({path:artifact('advanced-desktop.png'),fullPage:true});
 await page.locator('#reading-done').check();await page.reload();assert.equal(await page.locator('#reading-done').isChecked(),true);
 await page.getByText('Show explanation',{exact:true}).click();assert.ok(await page.locator('.practice details').last().getAttribute('open')!==null);
 await page.setViewportSize({width:390,height:844});
 for(const c of chapters){await page.goto(base+'advanced/'+c.slug+'.html');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),c.slug+' overflows');}
 await page.goto(base+'advanced/message-completion-and-durability.html');await page.screenshot({path:artifact('advanced-mobile.png'),fullPage:true});
 await page.goto(base+'advanced/index.html');assert.equal(await page.locator('.reading-card').count(),chapters.length);
 await page.goto(base+'performance.html');assert.match(await page.locator('main').innerText(),/native-benchmark.py/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Fast mode reuses Linux, but resets Python, files, environment and native sockets.
 await page.goto(base+'lessons/'+lessons[0].slug+'.html');
 assert.equal(await page.locator('#run-mode').inputValue(),'warm');
 const isolation=`import os, socket, time
from pathlib import Path
import messaging as lesson_module
assert os.getpid()==1
assert 'previous_run_value' not in globals()
assert 'LESSON_ENV_PROOF' not in os.environ
assert not hasattr(lesson_module,'learner_proof')
for name in ['/isolation-proof','/tmp/isolation-proof','/var/tmp/isolation-proof']:
    assert not Path(name).exists()
    Path(name).write_text('temporary')
previous_run_value=1
os.environ['LESSON_ENV_PROOF']='temporary'
lesson_module.learner_proof=True
background=os.fork()
if background==0:
    time.sleep(600)
    os._exit(0)
probe_socket=socket.socket()
probe_socket.bind(('127.0.0.1',50555))
try:
    Path('/etc/isolation-proof').write_text('must fail')
    raise AssertionError('Shared runtime must be read-only')
except OSError as error:
    assert error.errno==30
`+lessons[0].code;
 async function completedRun(){
  await page.locator('#run').click();
  await page.waitForFunction(()=>!document.querySelector('#run').disabled,undefined,{timeout:240000});
  assert.match(await page.locator('#status').textContent(),/Completed in/);
  assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),samples[0]);
 }
 async function runtimeExport(name){
  await openDownloads(page);
  const pending=page.waitForEvent('download');await page.locator('#export').click();
  await(await pending).saveAs(artifact(name));
  return JSON.parse(await fs.readFile(artifact(name),'utf8'));
 }
 await page.locator('#code').fill(isolation);
 for(let repeat=0;repeat<2;repeat++){
  await completedRun();
  const saved=await runtimeExport('warm-isolation-'+repeat+'.json');
  assert.equal(saved.runtime.mode,'warm');assert.equal(saved.runtime.session_run,repeat+1);
  assert.equal(saved.runtime.process_pid,1);assert.equal(saved.runtime.procfs,false);
  assert.ok(saved.runtime.elapsed_ms>0);
  if(repeat===1)assert.equal(saved.runtime.timing.guest_startup_ms,0,'Reruns must not boot another guest');
 }
 const beforeReset=await page.locator('#output').textContent();
 await page.locator('#reset-runtime').click();
 assert.match(await page.locator('#status').textContent(),/Linux reset/);
 assert.equal(await page.locator('#output').textContent(),beforeReset);
 assert.equal(await page.locator('#code').inputValue(),isolation);
 await completedRun();
 assert.equal((await runtimeExport('after-linux-reset.json')).runtime.session_run,1);
 await page.locator('#restore').click();
 await page.locator('#code').fill(lessons[0].code+'\nimport os\nassert os.path.isdir("/proc/self")\n');
 await page.locator('#run-mode').selectOption('fresh');
 await completedRun();
 const fresh=await runtimeExport('explicit-fresh-linux.json');
 assert.equal(fresh.runtime.mode,'fresh');assert.equal(fresh.runtime.procfs,true);
 await page.locator('#run-mode').selectOption('warm');
 // Disable JSPI in the worker only, then execute the real fresh-guest fallback.
 await page.route(/\/worker\.js\?v=/,async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:'WebAssembly.Suspending=undefined;\n'+await response.text()});
 });
 await completedRun();
 const fallback=await runtimeExport('unsupported-fast-fallback.json');
 assert.equal(fallback.runtime.mode,'fresh');assert.match(fallback.runtime.warm_fallback,/unavailable/);
 assert.equal(await page.locator('#run-mode').inputValue(),'fresh');
 await page.unroute(/\/worker\.js\?v=/);await page.locator('#restore').click();
 console.log('PASS warm session isolation, no reboot on rerun, reset, explicit fresh Linux and real JSPI fallback.');
 assert.deepEqual(errors,[]);console.log('PASS: all published Linux/ZeroMQ sources match native results; error/retry, Stop/restart, drafts, completion, themes, mobile and subpath hosting; all static design readings and saved marks.');
 }else console.log(`PASS Linux shard ${shardIndex+1}/${shardCount}: all assigned published sources match native results.`);
 const app=requestedSources.find(url=>url.pathname.endsWith('/app.js'));
 const revision=app?.searchParams.get('v');
 assert.ok(revision,'The page identifies its build');
 assert.ok(requestedSources.some(url=>url.pathname.endsWith('/worker.js')),'The experiment requests a worker');
 assert.ok(requestedSources.some(url=>url.pathname.endsWith('/python/messaging.py')),'The experiment requests the Python helper');
 assert.ok(requestedSources.every(url=>url.searchParams.get('v')===revision),'The page, worker and Python helpers use the same build');
}finally{await browser?.close();server.kill()}
