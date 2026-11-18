import {schedulePreparation} from './runtime-preparation.mjs';
import {lessons} from './lessons.mjs';
const appUrl=new URL(import.meta.url);
const lessonSource=path=>new URL(path+appUrl.search,appUrl);
const $=s=>document.querySelector(s);
const read=k=>{try{return localStorage.getItem('mpl:'+k)}catch{return null}};
const save=(k,v)=>{try{localStorage.setItem('mpl:'+k,v);return true}catch{return false}};
function progress(){document.querySelectorAll('[data-progress]').forEach(el=>{el.textContent=read('done:'+el.dataset.progress)==='true'?'Read ✓':el.dataset.kind==='reading'?'Reading':el.closest('.lesson-card')?'Lab':''})}
progress();addEventListener('storage',progress);
function themeLabel(){const dark=document.documentElement.dataset.theme==='dark';$('#theme').textContent=dark?'Light theme':'Dark theme';$('#theme').setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme')}
$('#theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;save('theme',theme);themeLabel()};themeLabel();
const courseMenu=document.querySelector('.course-switcher');
if(courseMenu){
 courseMenu.dataset.enhanced='true';
 document.addEventListener('pointerdown',event=>{if(!courseMenu.contains(event.target))courseMenu.open=false});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&courseMenu.open){courseMenu.open=false;courseMenu.querySelector('summary').focus()}});
}
const main=$('[data-lesson]');
if(main){
 const lesson=lessons[Number(main.dataset.lesson)], editor=$('#code');let worker,timer,runRecord,busy=false,runGeneration=0,attemptSerial=0,runStarted=0;
 const resetRuntime=$('#reset-runtime');
 const mode=new URL(location.href).searchParams.get('runtime')==='fresh'?'fresh':'warm';
 const preload=[...new Set([...lesson.code.matchAll(/^(?:from|import) (course|patterns|kafka_lab|live_kafka|recovery_drill)\b/gm)].map(match=>match[1]))];
 let preparationTimer;
 resetRuntime.onclick=()=>{
  if(busy)return;
  discardWorker();finish('Environment cleared. Select Run when ready.');
  $('#run').focus({preventScroll:true});
 };
 const draftKey='draft-state:'+lesson.slug;
 const oldDraft=read('draft:'+lesson.slug);
 const oldIsPython=read('draft-runtime:'+lesson.slug)==='pyzmq-v1';
 const previous=read('legacy-draft:'+lesson.slug)??(oldIsPython?null:oldDraft);
 let draft={code:(oldIsPython?oldDraft:null)??lesson.code,recovery:null};
 try{
  const saved=JSON.parse(read(draftKey));
  if(typeof saved?.code==='string')draft={code:saved.code,recovery:typeof saved.recovery==='string'?saved.recovery:null};
 }catch{}
 editor.value=draft.code;
 if(previous!==null){
  const button=document.createElement('button');
  button.type='button';button.textContent='Download previous draft';
  button.onclick=()=>download('# Saved before the ZeroMQ migration; source only.\n'+previous,lesson.slug+'-previous.py','text/x-python');
  $('#download').parentElement.append(button);
 }
 $('#done').checked=read('done:'+lesson.slug)==='true';
 $('#done').onchange=()=>{const ok=save('done:'+lesson.slug,String($('#done').checked));$('#save-status').textContent=ok?'Reading mark saved in this browser.':'Could not save. Reading mark lasts for this visit.';progress()};
 function describeResult(){
  if(!runRecord)return;
  const source=runRecord.source===lesson.code?'the original code':'an edited version';
  const changed=editor.value!==runRecord.source?' The editor has changed since this run.':'';
  $('#execution-note').textContent='Last successful run used '+source+'.'+changed;
 }
 function updateDraftControls(){
  $('#restore').hidden=editor.value===lesson.code;
  $('#recover').hidden=draft.recovery===null||draft.recovery===editor.value;
 }
 editor.oninput=()=>{
  draft={...draft,code:editor.value};
  $('#draft-status').textContent=save(draftKey,JSON.stringify(draft))?'':'Browser storage is unavailable. Download your code to keep a copy.';
  updateDraftControls();
  describeResult();
 };
 function switchDraft(code,message){
  const next={code,recovery:editor.value===lesson.code?null:editor.value};
  if(!save(draftKey,JSON.stringify(next))){
   $('#draft-status').textContent='Browser storage is unavailable. Your current edit is still in the editor.';
   return;
  }
  draft=next;
  editor.value=code;
  updateDraftControls();
  describeResult();
  $('#draft-status').textContent=message;
  editor.focus();
 }
 $('#restore').onclick=()=>switchDraft(lesson.code,'Original code restored. Use Recover saved edit to get your edit back.');
 $('#recover').onclick=()=>switchDraft(draft.recovery,'Saved edit recovered.');
 updateDraftControls();
 const runButton=$('#run'),stopButton=$('#stop');
 function discardWorker(){cancelPreparation();clearTimeout(preparationTimer);main.dataset.preparation='deferred';runGeneration++;attemptSerial++;worker?.terminate();worker=null}
 function state(active,text){
  resetRuntime.disabled=active;
  busy=active;
  const moveFocus=document.activeElement===(active?runButton:stopButton);
  runButton.disabled=active;
  stopButton.hidden=stopButton.disabled=!active;
  $('#status').textContent=text;
  if(moveFocus)(active?stopButton:runButton).focus();
 }
 function finish(message){clearTimeout(timer);$('#runtime-progress').hidden=true;state(false,message)}
 function stop(message){discardWorker();finish(message)}
 function showError(message,summary){
  const details=String(message).trim();
  summary??=details.split('\n').at(-1);
  $('#error-summary').textContent=summary||'The experiment stopped before it returned a result.';
  $('#error-output').textContent=details;
  $('#error-more').hidden=details===summary;
  $('#error-more').open=false;
  $('#run-error').hidden=false;
 }
 $('#stop').onclick=()=>stop('Stopped. Select Run to start again.');
 function startAttempt(source,generation,retries){
  const attempt=++attemptSerial;let begun=false;
  clearTimeout(timer);
  timer=setTimeout(()=>stop('Loading timed out. Check your connection and run again.'),300000);
  try{worker ||= new Worker(lessonSource('./worker.js'),{type:'module'})}
  catch(error){stop('Python could not start. Select Run to try again.');showError(error.message);return}
  const current=()=>busy&&generation===runGeneration&&attempt===attemptSerial;
  worker.onerror=e=>{
   if(!current())return;
   stop('The Linux environment stopped. Click Run to try again.');
   showError(e.message,e.message);
  };
  worker.onmessage=({data})=>{
   if(!current())return;
   if(preparationMessage(data))return;
   if(data.type==='loading'){
    $('#status').textContent=data.message;const bar=$('#runtime-progress');
    if(bar){bar.hidden=!data.total;if(data.total){bar.max=data.total;bar.value=data.downloaded}}
    if(data.stage==='boot'){
     clearTimeout(timer);timer=setTimeout(()=>{
      if(!current()||begun)return;
      if(retries===0){worker.terminate();worker=null;$('#status').textContent='Guest startup stalled · retrying once before Python starts…';startAttempt(source,generation,1)}
      else stop('Guest startup stalled twice. Run again to restart the VM.');
     },60000);
    }
    return;
   }
   if(data.type==='running'){
    begun=true;clearTimeout(timer);$('#runtime-progress')?.setAttribute('hidden','');
    timer=setTimeout(()=>stop('Stopped after 180 seconds. Shorten the experiment and try again.'),180000);
    $('#status').textContent='Running your Python…';return;
   }
   if(data.type==='error'){
    if(data.origin==='runtime')discardWorker();
    finish(data.origin==='runtime'?'Runtime reported an error. Click Run to try again.':'Python reported an error. Check the message below, then edit and run again.');
    showError(data.message,data.origin==='runtime'?data.summary:undefined);
    return;
   }
   const elapsed=Math.round(performance.now()-runStarted);
   runRecord={lesson:lesson.slug,source,result:data.value.result,stdout:data.value.stdout,runtime:{...data.runtime,initialization_retries:retries,elapsed_ms:elapsed}};
   $('#output').textContent=(data.value.stdout?data.value.stdout+'\n':'')+JSON.stringify(data.value.result,null,2);
   $('#completed-run').hidden=false;
   finish(Number.isFinite(elapsed)?`Completed in ${(elapsed/1000).toFixed(1)} seconds`:'Completed');
   $('#export').disabled=false;
   describeResult();
   visualize(data.value.result);
  };
  worker.postMessage({source,mode,preload,requestedAt:performance.timeOrigin+runStarted});
 }
 $('#run').onclick=()=>{
  if(busy)return;
  cancelPreparation();clearTimeout(preparationTimer);
  runStarted=performance.now();
  $('#run-error').hidden=true;
  state(true,'Preparing Linux…');
  startAttempt(editor.value,++runGeneration,0);
 };
 editor.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#run').click()}});
 function download(contents,name,type){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 $('#download').onclick=async()=>{try{
 const names=['messaging.py','peer.py'];
 const modules=Object.fromEntries(await Promise.all(names.map(async name=>{const r=await fetch(lessonSource('./python/'+name));if(!r.ok)throw Error('Helper download failed');return [name,await r.text()]})));
 const setup='# Install: python -m pip install pyzmq==27.3.0\nimport tempfile, pathlib, sys, json\n_lab = tempfile.TemporaryDirectory(prefix="messaging-lab-")\n_modules = '+JSON.stringify(modules)+'\nfor _name, _text in _modules.items():\n    pathlib.Path(_lab.name, _name).write_text(_text)\nsys.path.insert(0, _lab.name)\n\n# Your experiment\n';
 download(setup+editor.value+'\nprint(json.dumps(result, indent=2))\n',lesson.slug+'.py','text/x-python');
 }catch(e){$('#status').textContent=e.message}};
 $('#export').onclick=()=>{if(runRecord)download(JSON.stringify(runRecord,null,2),lesson.slug+'-run.json','application/json')};
 function visualize(result){
 const panel=$('#visual');panel.replaceChildren();if(!result?.trace?.length)return;
 let position=0;const head=document.createElement('div');head.className='trace-head';const title=document.createElement('h3');title.textContent='Follow the evidence';const controls=document.createElement('div');const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.textContent='←';prev.setAttribute('aria-label','Previous trace step');next.textContent='→';next.setAttribute('aria-label','Next trace step');controls.append(prev,label,next);head.append(title,controls);panel.append(head);const view=document.createElement('div');view.className='trace-view';panel.append(view);
 const draw=()=>{const row=result.trace[position];label.textContent=`${position+1} / ${result.trace.length}`;prev.disabled=!position;next.disabled=position===result.trace.length-1;view.replaceChildren();const oldLine=panel.querySelector('.watermark-line');oldLine?.remove();if(Number.isFinite(row.watermark)){const line=document.createElement('div');line.className='watermark-line';const marker=document.createElement('span');marker.className='watermark-marker';const upper=Math.max(30,row.maximum||0),lower=Math.min(-10,row.watermark);marker.style.left=((row.watermark-lower)/(upper-lower)*100)+'%';const symbol=document.createElement('b');symbol.textContent='|';marker.append(symbol,document.createTextNode('watermark '+row.watermark+'s'));line.append(marker);line.setAttribute('aria-label','Watermark at '+row.watermark+' seconds on a '+lower+' to '+upper+' second scale');panel.insertBefore(line,view)}for(const [key,value]of Object.entries(row)){const block=document.createElement('div'),caption=document.createElement('span'),text=document.createElement('strong');caption.textContent=key;text.textContent=typeof value==='object'?JSON.stringify(value):String(value);block.append(caption,text);view.append(block)}};
 prev.onclick=()=>{position--;draw()};next.onclick=()=>{position++;draw()};draw();
 }
 function preparationMessage(data){
  if(data.type==='prepared'){
   clearTimeout(preparationTimer);main.dataset.preparation='ready';
   if(!busy)$('#status').textContent='Ready';
   return true;
  }
  if(data.type==='preparation-error'){
   clearTimeout(preparationTimer);
   if(!busy){discardWorker();$('#status').textContent='Python will prepare when you select Run.'}
   return true;
  }
  return false;
 }
 function prepareInBackground(){
  if(busy||worker||mode==='fresh')return;
  try{
   const instance=worker=new Worker(lessonSource('./worker.js'),{type:'module'});
   main.dataset.preparation='loading';
   $('#status').textContent='Preparing Python in the background…';
   const failed=()=>{
    if(worker!==instance||busy)return;
    discardWorker();$('#status').textContent='Python will prepare when you select Run.';
   };
   preparationTimer=setTimeout(failed,300000);
   instance.onerror=failed;
   instance.onmessage=({data})=>{
    if(worker!==instance||busy)return;
    if(preparationMessage(data))return;
    if(data.type==='loading'&&data.stage==='boot'){
     clearTimeout(preparationTimer);preparationTimer=setTimeout(failed,60000);
    }
   };
   instance.postMessage({type:'prepare',preload});
  }catch{
   worker?.terminate();worker=null;main.dataset.preparation='deferred';
  }
 }
 const cancelPreparation=schedulePreparation(prepareInBackground);
 addEventListener('pagehide',()=>{cancelPreparation();clearTimeout(preparationTimer);runGeneration++;attemptSerial++;clearTimeout(timer);worker?.terminate();worker=null;busy=false});
}

const reading=document.querySelector('[data-reading]');
if(reading){
 const key='done:'+reading.dataset.reading,box=document.querySelector('#reading-done');box.checked=read(key)==='true';
 box.onchange=()=>{const ok=save(key,String(box.checked));document.querySelector('#reading-save').textContent=ok?'Reading mark saved in this browser.':'Storage unavailable. This mark lasts for this visit.';progress()};
 addEventListener('storage',()=>{box.checked=read(key)==='true'});
}
