import {resourceSummary} from './resource-row.mjs';
import {writeHelperReference,renderLessonReferences,renderReadingReferences} from './references.mjs';
import {renderDiagram} from './diagrams.mjs';
import {renderExercise} from './exercise.mjs';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parts,order,href} from '../src/catalog.mjs';
import {lessons as rawLessons} from '../src/lessons.mjs';
import {chapters} from '../src/readings.mjs';
// The editor and native tests use the same lesson array; the catalog defines navigation.
const samples=JSON.parse(execFileSync('python3',['tests/test_course.py','--json'],{encoding:'utf8'}));
const sampleBy=Object.fromEntries(rawLessons.map((l,i)=>[l.slug,samples[i]]));
execFileSync('python3',['runtime/prepare.py'],{stdio:'inherit'});
const manifest=JSON.parse(await fs.readFile('assets/linux/manifest.json','utf8')),mib=Math.ceil(manifest.assets.reduce((n,a)=>n+a.bytes,0)/1048576);
const functions=JSON.parse(execFileSync('python3',['-c',"import ast,json; source=open('python/messaging.py').read(); print(json.dumps({n.name:ast.get_source_segment(source,n) for n in ast.parse(source).body if isinstance(n,ast.FunctionDef)}))"],{encoding:'utf8'}));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
await fs.rm('dist',{recursive:true,force:true});await fs.mkdir('dist/lessons',{recursive:true});await fs.mkdir('dist/advanced',{recursive:true});
for(const name of ['style.css','book.css','app.js','wasi-poll.mjs','runtime-cache.mjs','warm-session.mjs','lessons.mjs','catalog.mjs'])await fs.copyFile('src/'+name,'dist/'+name);
await fs.copyFile('src/linux-worker.js','dist/worker.js');
await fs.cp('python','dist/python',{recursive:true,filter:p=>!p.includes('__pycache__')});await fs.cp('assets/fonts','dist/assets/fonts',{recursive:true});
await fs.cp('assets/linux','dist/assets/linux',{recursive:true,filter:p=>!p.endsWith('.wasm')});
await fs.cp('node_modules/@bjorn3/browser_wasi_shim/dist','dist/engine/wasi',{recursive:true});await fs.copyFile('node_modules/fflate/esm/browser.js','dist/engine/fflate.mjs');await fs.copyFile('node_modules/fflate/LICENSE','dist/engine/FFLATE-LICENSE');
for(const name of ['LICENSE-MIT','LICENSE-APACHE'])await fs.copyFile('node_modules/@bjorn3/browser_wasi_shim/'+name,'dist/engine/wasi/'+name);
await fs.cp('runtime','dist/runtime',{recursive:true,filter:p=>!p.includes('/wheels')});await fs.cp('harnesses','dist/harnesses',{recursive:true,filter:p=>!p.includes('__pycache__')});
await fs.writeFile('dist/.nojekyll','');await fs.writeFile('dist/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#122824"/><path d="M9 11h22v15H20l-7 5v-5H9z" stroke="#a3ddc2" stroke-width="2" fill="none"/><path d="M14 16h12M14 21h8" stroke="#a3ddc2" stroke-width="2"/></svg>');
const pageSources=['src/runtime-preparation.mjs','src/catalog.mjs','src/app.js', 'src/book.css', 'src/lessons.mjs', 'src/linux-worker.js', 'src/warm-session.mjs', 'src/wasi-poll.mjs', 'src/runtime-cache.mjs', 'python/messaging.py', 'python/peer.py', 'python/runner.py', 'python/session_runner.py'];
const revisionHash=createHash('sha256');
for(const file of pageSources)revisionHash.update(await fs.readFile(file));
const revision=revisionHash.digest('hex').slice(0,12);
// Keep the page, worker bridge and helpers on the same published build.
await fs.copyFile('src/runtime-preparation.mjs','dist/runtime-preparation.mjs');
for(const file of ['app.js','worker.js','warm-session.mjs','lessons.mjs']){
 let source=await fs.readFile('dist/'+file,'utf8');
 for(const dependency of ['runtime-preparation.mjs','lessons.mjs','catalog.mjs','patterns.mjs','wasi-poll.mjs','warm-session.mjs','runtime-cache.mjs']){
  source=source.replaceAll("'./"+dependency+"'", "'./"+dependency+'?v='+revision+"'");
 }
 await fs.writeFile('dist/'+file,source);
}

const header=p=>`<a class="skip" href="#main">Skip to content</a><header class="header"><a class="brand" href="${p}index.html"><img src="${p}favicon.svg" alt="" width="40" height="40"><span class="brand-copy"><strong>Messaging Patterns Lab</strong><span>Python · ZeroMQ</span></span></a><nav aria-label="Site"><a href="${p}index.html#curriculum">Course</a><a href="${p}about.html">Field notes</a><a href="https://github.com/snowch/messaging-patterns-lab">GitHub</a><button id="theme" aria-label="Switch colour theme">Theme</button></nav></header>`;
const footer=p=>`<footer><a class="brand" href="${p}index.html">Messaging Patterns Lab</a><span>© 2026 Christopher Snow · <a href="https://github.com/snowch/messaging-patterns-lab/blob/main/LICENSE">Content license</a> · <a href="https://github.com/snowch/messaging-patterns-lab/blob/main/LICENSE-CODE">Code license</a> · <a href="${p}runtime/THIRD-PARTY-NOTICES.md">Component notices</a> · <a href="${p}assets/fonts/README.txt">Fonts</a></span></footer>`;
const shell=(title,body,p='')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Learn messaging patterns with real ZeroMQ inside browser Linux."><title>${title} · Messaging Patterns Lab</title><link rel="icon" href="${p}favicon.svg"><link rel="stylesheet" href="${p}style.css"><link rel="stylesheet" href="${p}book.css?v=${revision}"><script>try{document.documentElement.dataset.theme=localStorage.getItem('mpl:theme')||'light'}catch{}</script><script type="module" src="${p}app.js?v=${revision}"></script></head><body>${header(p)}${body}${footer(p)}</body></html>`;
const lookup=id=>id.startsWith('advanced/')?chapters.find(c=>c.slug===id.slice(9)):rawLessons.find(l=>l.slug===id);
const breadcrumb=(id,p='../')=>{const current=order.find(x=>x.id===id);return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><details class="course-switcher"><summary>Course <span aria-hidden="true">⌄</span></summary><nav class="course-panel" aria-label="Course contents"><a class="course-overview" href="${p}index.html#curriculum">Course overview</a>${parts.map((part,i)=>`<details class="course-group" ${i+1===current.part?'open':''}><summary>${i+1} · ${part.title}</summary><ol>${part.items.map(key=>`<li><a href="${p}${href(key)}" ${key===id?'aria-current="page"':''}><span class="course-number">${order.findIndex(x=>x.id===key)+1}</span><span>${lookup(key).title}${key===id?'<small>Current chapter</small>':''}</span></a></li>`).join('')}</ol></details>`).join('')}</nav></details></li><li><span aria-hidden="true">/</span><a href="${p}index.html#part-${current.part}">${current.partTitle}</a></li><li><span aria-hidden="true">/</span><span aria-current="page">${lookup(id).title}</span></li></ol></nav>`};
const sequence=(id,p='../')=>{const n=order.findIndex(x=>x.id===id);return `<nav class="pagination" aria-label="Course sequence"><a href="${n?p+href(order[n-1].id):p+'index.html'}"><span>${n?'Previous chapter':'Course overview'}</span><strong>${n?lookup(order[n-1].id).title:'Choose a chapter'}</strong></a>${n<order.length-1?`<a class="page-next" href="${p}${href(order[n+1].id)}"><span>Next chapter →</span><strong>${lookup(order[n+1].id).title}</strong></a>`:''}</nav>`};
const intro=(id)=>{const item=lookup(id),n=order.findIndex(x=>x.id===id)+1;return `<header class="chapter-intro">${breadcrumb(id)}<p class="eyebrow">Chapter ${n}</p><h1>${item.title}</h1><p class="standfirst">${item.short}</p></header>${id.startsWith("advanced/")?"":`<div class="goal"><b>What you’ll learn</b><p>${item.goal}</p></div>`}<p class="note">Prerequisite: ${n>1?`<a href="../${href(order[n-2].id)}">${lookup(order[n-2].id).title}</a>`:'Basic Python functions, lists and dictionaries'}. <a href="../index.html#curriculum">Course map →</a></p>`};
const practice=renderExercise;
const mark=(id,reading=false)=>`<div class="completion"><label><input id="${reading?'reading-done':'done'}" type="checkbox"> Mark chapter as read</label><span id="${reading?'reading-save':'save-status'}" role="status"></span></div>`;
const cards=parts.map((part,i)=>`<section class="course-part" id="part-${i+1}"><div class="part-heading"><span>Part ${i+1}</span><h3>${part.title}</h3><p>${part.outcome}</p></div><ol class="chapter-list">${part.items.map(id=>`<li><a class="lesson-card chapter-link" href="${href(id)}"><span class="chapter-number">${String(order.findIndex(x=>x.id===id)+1).padStart(2,'0')}</span><span class="chapter-copy"><strong>${lookup(id).title}</strong><span>${lookup(id).short}</span></span><span class="chapter-kind" data-progress="${id}" data-kind="${id.startsWith('advanced/')?'reading':'lab'}">${id.startsWith('advanced/')?'Reading':'Lab'}</span></a></li>`).join('')}</ol></section>`).join('');
await fs.writeFile('dist/index.html',shell('Learn messaging patterns with ZeroMQ',`<main id="main" class="course-home"><header class="home-intro"><p class="eyebrow">Hands-on Python lessons</p><h1>Messaging patterns<br>with ZeroMQ.</h1><p class="home-description">Send requests, publish updates and route work between processes. Learn how queues, timeouts and retries affect delivery and completion.</p><div class="home-actions"><a class="primary" href="lessons/request-and-reply.html">Start lesson 1 →</a><a href="#curriculum">Browse the course</a></div><p class="home-meta">20 runnable lessons <span aria-hidden="true">·</span> 10 design readings <span aria-hidden="true">·</span> Basic Python</p></header><section id="curriculum" class="curriculum"><h2>Course contents</h2>${cards}</section><section class="closing"><h2>Continue with event streaming</h2><p>Explore retained logs, event-time windows and stateful recovery in <a href="https://snowch.github.io/event-streaming-lab/">Event Streaming Lab →</a></p></section></main>`));
await writeHelperReference(shell,['messaging', 'peer']);
for(const [i,l] of rawLessons.entries()){
 const change = l.changeCall ? `Replace the last line in the editor with <code>result = ${esc(l.changeCall)}</code>. ` : '';
 const isFirst = l.slug === 'request-and-reply';
 const body=`<main id="main" class="lesson" data-lesson="${i}">
  ${intro(l.slug)}
  <section>
   <h2>The situation</h2>
   <p>${l.intro}</p><p>${l.concept}</p>
   ${renderDiagram(l.slug)}
  </section>
  <section class="prediction"><h2>Before you run</h2><p>${l.predict}</p></section>
  <section id="experiment">
   <h2>Run the experiment</h2>
   <p class="fixture">${l.fixture}</p>
   <p class="run-instructions">For the original example, click <strong>Restore code</strong> if it is shown, then click <strong>Run</strong>. Compare your output with the worked result.</p>
<p class="note">Python prepares in the background while you read. First use can download about ${mib} MiB. Your code runs only when you select Run; each run starts with clean experiment state.</p>
   <noscript><style>.workbench,.run-instructions{display:none}</style><p class="note">You can follow the worked result below. Running the code uses JavaScript.</p></noscript>
   <div class="workbench">
    <div class="code-cell">
     <div class="cell-head"><label for="code">experiment.py</label><button id="restore" type="button" hidden>Restore code</button><button id="recover" type="button" hidden>Recover saved edit</button></div>

     <textarea id="code" rows="4" spellcheck="false" autocapitalize="off" aria-label="Python experiment">${esc(l.code)}</textarea>
     <div class="cell-tools">
      <button id="run" type="button" class="primary">Run</button>
      <button id="stop" type="button" hidden disabled>Stop</button>
      <span id="status" role="status"></span>
      <progress id="runtime-progress" hidden aria-label="Runtime download"></progress>
     </div>
    </div>
    <p class="note" id="draft-note">Your edits are saved in this browser when storage is available.</p>
    <p id="draft-status" role="status"></p>
    <div class="run-error" id="run-error" hidden>
     <p id="error-summary"></p>
     <details id="error-more" hidden><summary>Full error details</summary><pre id="error-output"></pre></details>
    </div>
    <div id="completed-run" hidden>
     <div class="output-head"><h3>Run output</h3></div>
     <p id="execution-note"></p>
     <pre id="output" tabindex="0"></pre>
     <div id="visual" aria-label="Experiment trace"></div>
    </div>
    <details class="runtime-help resource-row">${resourceSummary('Troubleshooting',{icon:'tools'})}<p>If Python stops responding, restart the environment and try again. Your code and last completed result are kept.</p><button id="reset-runtime" type="button">Restart Python</button></details>
    <details class="downloads resource-row">${resourceSummary('Downloads',{icon:'download'})}
     <div><button id="download" type="button">Download code</button><button id="export" type="button" disabled>Export run</button></div>
    </details>
   </div>
   <h3>Worked result</h3>
   <p>${l.observe}</p>
   <details class="worked resource-row">${resourceSummary('Full output from the original example',{icon:'result'})}<pre>${esc(JSON.stringify(sampleBy[l.slug],null,2))}</pre><p>The build ran the original editor code to produce this output.</p></details>
   <div class="change"><h3>${l.inspectOnly?'Read the implementation':'Try one change'}</h3><p>${change}${l.change}</p></div>
  </section>
  <details class="operator-source resource-row">${resourceSummary('Inspect the socket implementation',{icon:'code'})}
   <p>The editor calls this read-only helper. ${isFirst?'A ZeroMQ context is the object a process uses to create sockets. The program starts the server process. A pipe carries its ready message and port number to the client. The ZeroMQ sockets carry the request and reply. ':''}<a href="../python/messaging.py">Read all socket helpers</a> or <a href="../python/peer.py">read the separate-process code</a>. The code download includes both files.</p>
   <pre><code>${esc(functions[l.fn])}</code></pre>
  </details>
  <details class="underhood resource-row">${resourceSummary('Costs, waiting and recovery',{icon:'cost'})}
   <div class="table-scroll"><table><thead><tr><th scope="col">Aspect</th><th scope="col">What to account for</th></tr></thead><tbody>${l.costs.map((value,j)=>`<tr><th scope="row">${['Work','Stored information','Message path','Waiting','Recovery'][j]}</th><td>${value}</td></tr>`).join('')}</tbody></table></div>
  </details>
  ${practice(l)}
  ${renderLessonReferences(l)}
  <section class="limits"><h3>Experiment scope</h3><p>${l.limit}</p><a href="${l.source}">ZeroMQ reference</a> · <a href="../about.html">Runtime and model boundaries</a></section>
  ${mark(l.slug)}${sequence(l.slug)}
 </main>`;
 await fs.writeFile('dist/lessons/'+l.slug+'.html',shell(l.title,body,'../'));
}
const comparisons = [
 ['Send, commit and reply', 'Compare “Handler commits; ACK lost” and “ACK before commit”. What can the caller see and what must storage confirm?'],
 ['Socket ownership and transport', 'Compare inproc and TCP loopback. Which can carry a message between two processes in this guest?'],
 ['What a late reader can recover', 'Compare a cache with a snapshot plus updates. What must agree before the reader combines the snapshot and updates?'],
 ['Clues after a missed reply', 'Compare a deadline with a heartbeat. After a missed reply and a received heartbeat, what do you still need to check about the first attempt?'],
 ['Measuring a service', 'Compare the send loop with a completed round trip. Which count requires a reply?'],
 ['What the dispatcher knows', 'Which row says a route exists? Which row tells the dispatcher that a worker can take a job?'],
 ['Which changes can break compatibility', 'Which field can change meaning even when multipart and JSON decoding succeed?'],
 ['Protection and permission', 'Compare a successful CURVE exchange with an authorized request. What evidence would show that the caller may issue the request?'],
 ['Crashes between effects and saved positions', 'Compare the first two crash points. Which can skip an effect, and which can repeat a delivery?'],
 ['Evidence for recovery', 'Pick one shop interaction. What evidence would you need before trusting its recovery claim?'],
];

for(const [i,c] of chapters.entries()){
 const id='advanced/'+c.slug;
 const [heading,prompt]=comparisons[i];
 const sections=(items)=>items.map(([title,...paragraphs])=>`<section><h2>${title}</h2>${paragraphs.map(text=>`<p>${text}</p>`).join('')}</section>`).join('');
 const body=`<main id="main" class="lesson advanced-lesson" data-reading="${id}">
  ${intro(id)}
  <section><h2>The situation</h2><p>${c.intro}</p></section>
  ${sections(c.sections.slice(0,2))}
  <section class="worked-trace">
   <h2 id="comparison-heading">${heading}</h2>
   <p class="note">Illustrative case.</p><p>${prompt}</p>
   <div class="table-scroll"><table aria-labelledby="comparison-heading"><thead><tr>${c.headers.map(text=>`<th scope="col">${text}</th>`).join('')}</tr></thead><tbody>${c.rows.map(row=>`<tr><th scope="row">${row[0]}</th>${row.slice(1).map(text=>`<td>${text}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  </section>
  ${sections(c.sections.slice(2))}
  ${practice(c)}
  ${renderReadingReferences(c)}
  ${mark(id,true)}${sequence(id)}
 </main>`;
 await fs.writeFile('dist/advanced/'+c.slug+'.html',shell(c.title,body,'../'));
}

await fs.writeFile('dist/advanced/index.html',shell('Design readings',`<main id="main" class="about">
 <h1>Design readings</h1>
 <p>Work through ten design cases without running code. The full course places these readings alongside the socket experiments.</p>
 ${chapters.map(c=>`<a class="reading-card" href="${c.slug}.html"><div><h2>${c.title}</h2><p>${c.short}</p></div></a>`).join('')}
 <p><a href="../index.html#curriculum">See the full course order</a></p>
</main>`,'../'));

await fs.writeFile('dist/about.html',shell('Field notes',`<main id="main" class="about">
 <h1>Field notes</h1>
 <h2>Before you begin</h2>
 <p>Start with basic Python functions, lists, dictionaries and exceptions. Read the setup and the question before each experiment. Run the original code, then try the suggested change. You can also read the worked result and answer the understanding question without running code.</p>
 <p>Use Mark chapter as read to track your place. Try the question and its explanation to check your understanding.</p>
 <h2 id="runtime">What Run starts</h2>
 <p>Python prepares automatically while you read an executable lesson. It keeps the environment ready for subsequent runs. Each execution starts a fresh Python process with private writable files, sockets and Linux namespaces. The compatibility runner starts a new guest each time when required. Python uses real ZeroMQ sockets inside that environment. The request/reply and proxy lessons start two separate Python processes. Several other examples use more than one socket inside a single process.</p>
 <p>The first run loads about ${mib} MiB. Use a desktop browser with enough available memory. The reading path works without JavaScript or a Linux download. Chromium is tested for execution.</p>
 <p>Stop and Restart Python discard the guest, processes and queued messages. They preserve your editor and the last completed output. A new run starts from the example’s setup. This browser saves edited code, reading marks and your theme when storage is available. Download the code if you want a copy outside the browser. Export run saves the last successful output and the code that produced it.</p>
 <h2>What the experiments show</h2>
 <p>ZeroMQ performs the local socket operations. The Python examples add their own rules for skipping duplicate IDs, giving permission to send work, detecting gaps and sharing the latest value. Those rules keep their data only for the current run. Test storage, recovery and network failures separately when you need production guarantees.</p>
 <h2>Where your code runs</h2>
 <p>Your editor code runs on your device. The browser fetches the course files. Guest sockets can communicate inside the temporary Linux environment. Execution requires no account or remote server.</p>
 <h2>Comparing performance</h2>
 <p>Run shows the elapsed time for this browser, including startup. The export records the full button-to-result wait, including initialization retries, in elapsed_ms. Per-attempt timings list preparation, guest startup, isolated-process startup and execution separately. The <a href="performance.html">native benchmark guide</a> explains how to measure a completed local exchange on your own Linux machine.</p>
 <details>
  <summary>Versions, downloads and time limits</summary>
  <p>The runtime uses CPython 3.12.16, PyZMQ 27.3.0 and libzmq 4.3.5 inside container2wasm/Bochs. The browser checks downloaded assets against their published hashes. When storage is available, the browser can reuse verified assets across chapters. Automatic preparation avoids repeated boots and trusted helper imports. Writable scratch is limited to 32 MiB, installed system directories are read-only, and /proc is unavailable in fast mode. The diagnostic full-guest runner supports system inspection. Browsers without WebAssembly JSPI use the compatible full-guest runner automatically. Navigating to another lesson starts a new session.</p>
  <p>The runtime can spend up to five minutes loading assets. If guest startup takes more than 60 seconds, the runtime tries starting the guest again once before Python runs. Once Python starts, it can run for up to three minutes. After that, the environment stops. You can edit the code and try again.</p>
  <p><a href="runtime/README.md">Runtime source and build</a> · <a href="runtime/THIRD-PARTY-NOTICES.md">Component notices</a> · <a href="assets/linux/manifest.json">Runtime hashes</a> · <a href="assets/fonts/README.txt">Font licenses</a></p>
 </details>
 <h2>Primary sources</h2>
 <ul>
  <li>Pieter Hintjens’s <a href="https://hintjens.wdfiles.com/local--files/main:files/cc1pe.pdf">Code Connected Volume 1: Learning ZeroMQ</a> (2013, CC BY-SA 3.0)</li>
  <li><a href="https://zguide.zeromq.org/">ZeroMQ Guide</a></li>
  <li><a href="https://libzmq.readthedocs.io/en/latest/">libzmq reference</a></li>
  <li><a href="https://pyzmq.readthedocs.io/en/stable/">PyZMQ documentation</a></li>
 </ul>
 <p>Use the documentation for the version your service runs.</p>
</main>`));

await fs.writeFile('dist/performance.html',shell('Measure a completed exchange',`<main id="main" class="about">
 <h1>Measure a completed exchange</h1>
 <p>Download <a href="harnesses/native-benchmark.py">native-benchmark.py</a>. On your Linux machine, install <code>pyzmq==27.3.0</code> and run the script in a terminal.</p>
 <pre>python native-benchmark.py --count 1000 --trials 5</pre>
 <h2>What the timer includes</h2>
 <p>One Python process creates a request socket and a reply socket. They connect inside that process using <code>inproc</code>. The timer starts after setup. Each exchange sends an eight-byte payload, receives it at the server, sends it back and checks that the client receives the same bytes.</p>
 <h2>Read the results</h2>
 <p>Check <code>completed</code> in each entry of <code>trials</code> first. It should equal <code>--count</code>. Use <code>median_seconds</code> to compare the middle trial time with the same exchange count. Record the machine, Python and ZeroMQ versions when you compare results.</p>
 <p>This benchmark measures a local exchange in one process. It runs outside the browser. Timing a production service also requires its network, workload and storage costs.</p>
 <p><a href="advanced/measure-and-limit-a-service.html">Read the service capacity chapter</a></p>
</main>`));
await fs.rm('.preview/messaging-patterns-lab',{recursive:true,force:true});await fs.mkdir('.preview/messaging-patterns-lab',{recursive:true});await fs.cp('dist','.preview/messaging-patterns-lab',{recursive:true});
console.log(`Built ${order.length} chapters: ${rawLessons.length} investigations and ${chapters.length} readings; ${mib} MiB verified runtime.`);
