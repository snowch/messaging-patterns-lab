const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const branch=(title,source,targets,note)=>({title,source,targets,note,type:'branch'});
const flow=(title,nodes,note)=>({title,nodes,note,type:'flow'});
const sequence=(title,rows,note)=>({title,rows,note,type:'sequence'});
const frames=(title,items,note)=>({title,items,note,type:'frames'});
export function renderDiagram(id){
 const diagram=diagrams[id];if(!diagram)return '';
 let body='';
 if(diagram.type==='flow')body=`<ol class="diagram-flow" style="--columns:${diagram.nodes.length}">${diagram.nodes.map(([role,title,detail])=>`<li><small>${esc(role)}</small><strong>${esc(title)}</strong><span>${esc(detail)}</span></li>`).join('')}</ol>`;
 if(diagram.type==='sequence')body=`<ol class="diagram-sequence">${diagram.rows.map(([left,label,right,direction])=>`<li><span>${esc(left)}</span><span class="diagram-message ${direction==='back'?'is-return':direction==='lost'?'is-lost':''}"><small>${esc(label.replace(/[←→]/g,'').trim())}</small><svg aria-hidden="true" viewBox="0 0 80 18" width="80" height="18"><path d="M2 9h70m-7-6 8 6-8 6"/></svg></span><span>${esc(right)}</span></li>`).join('')}</ol>`;
 if(diagram.type==='branch'){
  const node=([role,title,detail])=>`<small>${esc(role)}</small><strong>${esc(title)}</strong><span>${esc(detail)}</span>`;
  body=`<div class="diagram-tree"><div class="diagram-root">${node(diagram.source)}</div><ol class="diagram-branches" style="--columns:${diagram.targets.length}">${diagram.targets.map(target=>`<li>${node(target)}</li>`).join('')}</ol></div>`;
 }
 if(diagram.type==='frames')body=`<div class="diagram-frames"><span class="message-label">One multipart message</span><ol>${diagram.items.map(([label,value])=>`<li><small>${esc(label.replace(/[←→]/g,'').trim())}</small><code>${esc(value)}</code></li>`).join('')}</ol></div>`;
 return `<figure class="concept-diagram" data-concept="${esc(id)}"><figcaption>${esc(diagram.title)}</figcaption>${body}<p class="diagram-caption"><span>Conceptual diagram.</span> ${esc(diagram.note)}</p></figure>`;
}

const diagrams={
'request-and-reply':sequence('Follow one request and its receipt',[
 ['Client · REQ','Request →','Peer process · REP'],['Client waits','← Application ACK','Peer constructs reply','back'],['Client · BYE','Closing exchange →','Peer exits after handshake']
],'The readiness pipe starts the peer; ZeroMQ carries the request and replies over guest-local TCP. The ACK does not establish durable storage.'),
'preserve-message-frames':frames('Frame boundaries survive the exchange',[
 ['Topic bytes','orders'],['Binary bytes · hex','00 ff'],['Empty frame','0 bytes']
],'Three frames form one message. The PAIR sockets use an IPC path; frame boundaries are different from TCP packet boundaries.'),
'respect-the-req-state-machine':flow('Ordinary REQ has one outstanding conversation',[
 ['Ready','Send request','The socket enters receive state.'],['Waiting','Receive reply','A second send here raises EFSM.'],['Ready again','Send next request','Completing recv permits the next send.']
],'The default REQ state machine is shown. Relaxed REQ options are separate contracts.'),
'send-work-down-a-pipeline':flow('Moving work is not completing work',[
 ['Producer','PUSH','Queue numbered jobs.'],['Transport','One-way pipe','Move complete messages.'],['Worker','PULL','Receive and handle each job.'],['Application','Receipt path','Not configured in this fixture.']
],'PUSH/PULL supplies no business acknowledgement. One source and one sink are exercised here.'),
'filter-a-publication':branch('Prefixes select different publications',
 ['Publisher','XPUB','First-frame topics: prices, pricey, orders'],
 [['SUB · prefix price','prices and pricey','Both begin with the same byte prefix.'],['SUB · prefix orders','orders','A different filter selects a different population.']],
 'Alternative filter settings are illustrated. The lab creates one SUB at a time and waits for its subscription to reach XPUB.'),
'meet-the-late-subscriber':sequence('A late subscriber does not acquire old history',[
 ['XPUB publishes old','No peer →','SUB does not exist yet'],['XPUB sees subscription','← Subscribe price','SUB connects','back'],['XPUB publishes new','Live publication →','SUB receives new']
],'The old publication is deliberately sent before a subscriber exists. No log or replay store retains it.'),
'detect-a-sequence-gap':flow('A gap identifies an observation to repair',[
 ['Publisher','1 → 2 → 4','The fixture deliberately omits 3.'],['Consumer state','Expect next = 3','Compare the received sequence 4.'],['Application','Gap: 3','Detect missing data; choose a repair source.']
],'Sequence identity and the repair policy are authored. A gap does not diagnose where or why a message disappeared.'),
'receive-without-blocking':flow('An empty queue and an empty message are different',[
 ['First receive','DONTWAIT','No message is ready.'],['Socket result','EAGAIN','No receive completed.'],['Later send','work','A message becomes available.'],['Next receive','work received','A successful receive returns its bytes.']
],'EAGAIN is a readiness observation; it is not proof that the peer has failed.'),
'bound-a-socket-queue':flow('Bound admission, then drain the accepted work',[
 ['Source','PUSH · SNDHWM=2','DONTWAIT makes blocked admission visible.'],['Pinned inproc fixture','4 accepted messages','Both configured queue limits participate here.'],['Next admission','EAGAIN','The receiver has not drained yet.'],['Receiver','PULL · RCVHWM=2','Drain every accepted message.']
],'Starter settings are illustrated. This observed inproc capacity is not a universal TCP, byte or process-memory formula.'),
'route-an-envelope':frames('ROUTER separates the route from the body',[
 ['ROUTER addressing frame','alpha'],['Application frame','job'],['Application frame','alpha']
],'The first alpha selects a connected pipe. DEALER receives the application body; the route label is not authenticated business identity.'),
'reject-an-unknown-route':branch('An option changes unknown-route handling',
 ['Application','Send to unknown','No connected peer owns this route.'],
 [['MANDATORY=1','EHOSTUNREACH','The send exposes the missing route.'],['Default behavior','May discard silently','API acceptance is not delivery evidence.']],
 'These are alternative settings for the actual ROUTER experiment. Neither proves application completion on an existing route.'),
'match-out-of-order-replies':sequence('Correlate by ID, not by arrival position',[
 ['Submit a, b, c','Requests →','Handler holds all three'],['Match ID c to C','← c / C','Handler replies last request first','back'],['Match ID b to B','← b / B','Then b','back'],['Match ID a to A','← a / A','Then a','back']
],'Reverse response order is intentional. The ID map reconstructs a:A, b:B, c:C independently of arrival order.'),
'forward-through-a-proxy':flow('The proxy forwards; the worker replies',[
 ['Parent process','REQ client','Send the business request.'],['Separate child','ROUTER ↔ DEALER','Actual zmq.proxy forwards envelopes.'],['Parent process','REP worker','Handle the body and construct the reply.']
],'Two processes contain these three socket roles. A proxy topology does not create a durable job ledger.'),
'retry-with-stable-identity':sequence('A missing receipt can follow a completed effect',[
 ['REQ attempt 1','charge-a →','Handler applies 12'],['Client times out','Reply deliberately withheld','Effect already exists','lost'],['New REQ · attempt 2','same charge-a →','Authored duplicate guard'],['Client receives receipt','← ACK charge-a','No second effect with the starter policy','back']
],'This is the deliberate starter scenario. The identity set and effect list are volatile application policy; Run shows actual attempts and effects.'),
'dispatch-with-worker-credit':flow('A credit represents application readiness',[
 ['Worker','READY','Advertise one available slot.'],['Broker policy','Assign one job','Remove that worker’s credit.'],['Worker','DONE + assignment','Return completion evidence.'],['Broker policy','Credit returned','The worker becomes eligible again.']
],'The lab drives workers serially in one process. This explicit policy is not a concurrent service benchmark or a durable ownership protocol.'),
'replay-a-cached-value':flow('A current-value service adds retained state',[
 ['Authored dictionary','price = 12','Retain the latest value.'],['XPUB','Subscription arrives','The application reacts to the control.'],['Publisher policy','Cached 12, then live 15','Emit the selected values.'],['Late SUB','Current view','This is not complete audit history.']
],'The snapshot/live case is frozen for teaching. Real concurrent updates need a versioned handoff and delete policy.'),
'observe-a-connection':flow('Three observations establish different things',[
 ['Transport','CONNECTED','A TCP connection exists.'],['Protocol','HANDSHAKE_SUCCEEDED','The ZeroMQ handshake completed.'],['Application','pong received','This one handler exchange completed.']
],'The monitor supplies transport/protocol evidence. The application reply is a separate observation; none guarantees future service health.'),
'choose-connect-and-close-policy':branch('Disconnected admission has an explicit policy',
 ['connect','Asynchronous connection request','There is no listener on the chosen endpoint.'],
 [['IMMEDIATE=1','DONTWAIT returns EAGAIN','Admission requires a completed connection.'],['IMMEDIATE=0','May queue pending work','Acceptance supplies no receiver acknowledgement.']],
 'The lab closes with LINGER=0 and discards pending work. Admission, transport drainage and business completion are separate boundaries.'),
'encrypt-a-connection':flow('CURVE protects the actual local exchange',[
 ['Client trust','Pin server public key','Use ephemeral synthetic keys in the lab.'],['Real mechanism','CURVE handshake','libzmq establishes the protected connection.'],['Application','Request → ACK','The handler exchanges encrypted traffic.']
 ],'The starter does not configure a ZAP allowlist or business permission check. Those are separate production decisions, not an implicit result of encryption.'),
'diagnose-the-missing-receipt':sequence('Keep logical work distinct from physical attempts',[
 ['One logical request','attempt 1 →','Effect 12; receipt omitted'],['Same logical identity','attempt 2 →','Dedup policy decides whether to repeat'],['Client matches receipt','← stable request ID','Correct reply mapping','back'],['Design review','Recovery boundary?','Choose actual persistence and effect contracts']
],'The capstone composes real socket experiments and authored policy. A correct final dictionary does not establish durable exactly-once effects.')
};
