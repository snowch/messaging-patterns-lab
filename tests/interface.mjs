import {renderDiagram} from '../scripts/diagrams.mjs';
import {chromium} from 'playwright';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {lessons} from '../src/lessons.mjs';import {chapters} from '../src/readings.mjs';import {order,href} from '../src/catalog.mjs';
assert.equal(lessons.length,20);assert.equal(chapters.length,10);assert.equal(new Set(order.map(x=>x.id)).size,30);
assert.deepEqual(new Set(order.map(x=>x.id)),new Set([...lessons.map(l=>l.slug),...chapters.map(c=>'advanced/'+c.slug)]));
for(const l of lessons){assert.equal(l.costs.length,5);for(const f of ['goal','intro','concept','fixture','predict','observe','change','question','answer','limit'])assert.ok(l[f].length>25,l.slug+f)}
const server=spawn('python3',['-m','http.server','5286','--bind','127.0.0.1','--directory','.preview'],{stdio:'ignore'});let browser;
try{
 await new Promise(r=>setTimeout(r,500));browser=await chromium.launch({executablePath:process.env.CI?undefined:'/usr/bin/chromium',args:['--no-sandbox']});
 const base='http://127.0.0.1:5286/messaging-patterns-lab/';const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'lessons/request-and-reply.html');await page.evaluate(()=>document.fonts.ready);
 const menu=page.locator('.course-switcher'),toggle=menu.locator(':scope>summary');
 await toggle.focus();await page.keyboard.press('Enter');assert.equal(await menu.evaluate(e=>e.open),true);assert.equal(await menu.locator('.course-group li>a').count(),30);
 await page.keyboard.press('Escape');assert.equal(await menu.evaluate(e=>e.open),false);assert.ok(await toggle.evaluate(e=>e===document.activeElement));
 await toggle.click();await page.mouse.click(1350,200);assert.equal(await menu.evaluate(e=>e.open),false);
 await page.locator('.exercise-hints>summary').click();
 assert.equal(await page.locator('.exercise-hints').evaluate(e=>e.open),true);
 assert.equal(await page.locator('.exercise-answer').evaluate(e=>e.open),false,'Hints do not reveal the answer');
 await page.locator('.hint-list details').first().locator('summary').click();
 assert.equal(await page.locator('.hint-list details').first().evaluate(e=>e.open),true);
 await page.locator('.exercise-hints>summary').click();
 await page.locator('.exercise-answer>summary').click();
 assert.equal(await page.locator('.exercise-answer').evaluate(e=>e.open),true);
 await page.locator('.exercise-answer>summary').click();
 await page.locator('#code').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'run');await page.evaluate(()=>scrollTo(0,0));await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/course-desktop.png',fullPage:true});
 await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.screenshot({path:'test-results/course-dark.png',fullPage:true});
 const staticPage=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});const requested=[];staticPage.on('request',r=>requested.push(r.url()));
 for(const path of [...order.map(x=>href(x.id)),'index.html','about.html','performance.html','advanced/index.html']){
  assert.equal((await staticPage.goto(base+path)).status(),200);
  if(path.startsWith('lessons/'))assert.equal(await staticPage.locator('.concept-diagram').count(),1,path+' diagram missing');assert.ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' overflows');
 }
 for(const c of chapters){await staticPage.goto(base+'advanced/'+c.slug+'.html');assert.ok((await staticPage.locator('main').innerText()).length>3000,c.slug+' too light')}
 await staticPage.goto(base+'lessons/retry-with-stable-identity.html');await staticPage.locator('.operator-source>summary').click();assert.match(await staticPage.locator('.operator-source code').textContent(),/client\.poll/);assert.ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await staticPage.screenshot({path:'test-results/course-mobile.png',fullPage:true});
 await staticPage.locator('.course-switcher>summary').click();assert.ok(await staticPage.locator('.course-switcher').evaluate(e=>e.open));assert.ok(!requested.some(url=>/\/(engine|assets\/linux)\//.test(url)));
  // Prepared runtime bytes persist across chapters, while a changed manifest
 // and denied storage both fall back to normal runtime preparation.
 const cachePage=await browser.newPage();await cachePage.goto(base);
 assert.equal(await cachePage.evaluate(async()=>{
  const cache=await import('./runtime-cache.mjs');
  return cache.writePreparedRuntime('interface-probe',new Uint8Array([0,97,115,109,1,0,0,0]),new Uint8Array([12,34,56]));
 }),true);
 await cachePage.goto(base+'lessons/'+lessons[0].slug+'.html');
 assert.deepEqual(await cachePage.evaluate(async()=>{
  const cache=await import('../runtime-cache.mjs'),saved=await cache.readPreparedRuntime('interface-probe');
  await WebAssembly.compile(saved.engineBytes);
  const changed=await cache.readPreparedRuntime('changed-manifest');
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
  let denied,writeDenied;
  try{
   Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}});
   denied=await cache.readPreparedRuntime('interface-probe');
   writeDenied=await cache.writePreparedRuntime('other',new Uint8Array(),new Uint8Array());
  }finally{if(descriptor)Object.defineProperty(globalThis,'indexedDB',descriptor);else delete globalThis.indexedDB}
  return {archive:[...saved.archive],changed,denied,writeDenied};
 }),{archive:[12,34,56],changed:null,denied:null,writeDenied:false});
 await cachePage.close();
assert.deepEqual(errors,[]);console.log('PASS 30-chapter catalog; keyboard/menu/theme; all 34 static phone pages; substantial readings, implementation inspection and no VM before Run.');
}finally{await browser?.close();server.kill()}
