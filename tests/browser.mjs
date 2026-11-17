import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lessons} from '../src/lessons.mjs';
import {chapters} from '../src/readings.mjs';
import {order} from '../src/catalog.mjs';
const samples=JSON.parse(execFileSync('python3',['tests/test_course.py','--json'],{encoding:'utf8'}));
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
   await page.route('**/worker.js',route=>{
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
   await page.unroute('**/worker.js');
  }
  await page.locator('#run').click();
  try{await page.waitForFunction(()=>!document.querySelector('#run').disabled,undefined,{timeout:240000})}
  catch(error){await page.screenshot({path:artifact('failure-')+lessons[i].slug+'.png',fullPage:true});await fs.writeFile(artifact('failure-')+lessons[i].slug+'.json',JSON.stringify({status:await page.locator('#status').textContent(),output:await page.locator('#output').textContent(),source:await page.locator('#code').inputValue()},null,2));throw error}
  const status=await page.locator('#status').textContent();
  if(!status.includes('Completed')){await page.screenshot({path:artifact('failure-')+lessons[i].slug+'.png',fullPage:true});await fs.writeFile(artifact('failure-')+lessons[i].slug+'.json',JSON.stringify({status,output:await page.locator('#output').textContent()},null,2))}
  assert.match(status,/Completed/);
  assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),samples[i],lessons[i].slug);
  if(i===shardIndex+shardCount){
   const cachedDownload=page.waitForEvent('download');await page.locator('#export').click();
   await (await cachedDownload).saveAs(artifact('cached-runtime.json'));
   const cached=JSON.parse(await fs.readFile(artifact('cached-runtime.json'),'utf8'));
   assert.equal(cached.runtime.timing.asset_source,'browser-cache','Chapter navigation reuses prepared assets');
   assert.ok(cached.runtime.timing.guest_startup_ms>0,'A cached runtime still starts a new guest');
   assert.ok(cached.runtime.timing.total_ms>=cached.runtime.timing.guest_startup_ms);
  }
  if(i===0){
   assert.equal(workerRequests,3,'A stalled guest gets exactly one initialization retry');
   const retryExport=page.waitForEvent('download');await page.locator('#export').click();
   await (await retryExport).saveAs(artifact('initialization-retry.json'));
   const retried=JSON.parse(await fs.readFile(artifact('initialization-retry.json'),'utf8'));
   assert.ok([0,1].includes(retried.runtime.initialization_retries));
   assert.deepEqual(retried.result,samples[0]);
   await page.unroute('**/worker.js');
   console.log('PASS startup watchdog: Stop cancels; boot retries are bounded; fresh actual Linux execution matches native.');
  }
  console.log('PASS Linux lesson:',lessons[i].slug);
  await page.locator('#done').check();
 }
 if(shardIndex===0){
 await page.goto(base+'lessons/'+lessons[0].slug+'.html');
 await page.locator('#code').fill("raise ValueError('test failure')");await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('reported an error'),undefined,{timeout:240000});
 assert.match(await page.locator('#output').textContent(),/test failure/);
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'));
 await page.locator('#code').fill('while True: pass');await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Running your Python…');await page.waitForTimeout(500);await page.locator('#stop').click();
 assert.match(await page.locator('#status').textContent(),/Stopped/);
 await page.locator('#restore').click();await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Completed'),undefined,{timeout:240000});
 const downloaded=page.waitForEvent('download');await page.locator('#download').click();const file=await downloaded;await file.saveAs(artifact('downloaded.py'));assert.deepEqual(JSON.parse(execFileSync('python3',[artifact('downloaded.py')],{encoding:'utf8'})),samples[0]);
 const exported=page.waitForEvent('download');await page.locator('#export').click();const record=await exported;await record.saveAs(artifact('run.json'));const savedRun=JSON.parse(await fs.readFile(artifact('run.json'),'utf8'));assert.deepEqual(savedRun.result,samples[0]);assert.equal(savedRun.runtime.pyzmq,'27.3.0');assert.match(savedRun.runtime.transport,/libzmq/);
 await page.locator('#code').fill(lessons[0].code+'\n# saved edit');assert.match(await page.locator('#execution-note').textContent(),/Code changed/);await page.reload();assert.match(await page.locator('#code').inputValue(),/saved edit/);assert.equal(await page.locator('#done').isChecked(),true);
 // Existing drafts are preserved and download separately; reading marks survive.
 await page.evaluate(()=>{localStorage.setItem('mpl:draft:request-and-reply','import reactivex as rx\n# previous draft');localStorage.removeItem('mpl:draft-runtime:request-and-reply')});
 await page.reload();assert.equal(await page.locator('#code').inputValue(),lessons[0].code);
 assert.match(await page.getByRole('button',{name:'Download previous draft'}).textContent(),/previous/);
 assert.equal(await page.locator('#done').isChecked(),true);
 assert.match(await page.evaluate(()=>localStorage.getItem('mpl:legacy-draft:request-and-reply')),/reactivex/);
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
 // Cached asset bytes must not retain editor globals or writable guest files.
 await page.goto(base+'lessons/'+lessons[0].slug+'.html');
 const isolation='from pathlib import Path\nassert not Path("/tmp/isolation-proof").exists()\nassert "previous_run_value" not in globals()\nprevious_run_value=1\nPath("/tmp/isolation-proof").write_text("temporary")\n'+lessons[0].code;
 await page.locator('#code').fill(isolation);
 for(let repeat=0;repeat<2;repeat++){
  await page.locator('#run').click();
  await page.waitForFunction(()=>!document.querySelector('#run').disabled,undefined,{timeout:240000});
  assert.match(await page.locator('#status').textContent(),/Completed in/);
  assert.deepEqual(JSON.parse(await page.locator('#output').textContent()),samples[0]);
 }
 await page.locator('#restore').click();
 console.log('PASS prepared-asset reuse, startup timing, and fresh guest files/globals across repeated real runs.');
 assert.deepEqual(errors,[]);console.log('PASS: all published Linux/ZeroMQ sources match native results; error/retry, Stop/restart, drafts, completion, themes, mobile and subpath hosting; all static design readings and saved marks.');
 }else console.log(`PASS Linux shard ${shardIndex+1}/${shardCount}: all assigned published sources match native results.`);
}finally{await browser?.close();server.kill()}
