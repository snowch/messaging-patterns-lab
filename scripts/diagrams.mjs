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
'request-and-reply':sequence('Follow a message from the client to the peer and back',[
 ['Client (REQ)','Client sends hello to the peer →','Peer process (REP)'],['Client waits','← Peer returns ACK and hello','Peer sends the reply','back'],['Client sends BYE','Client asks the peer to close →','Peer receives BYE'],['Client receives closed','← Peer replies closed','Peer exits','back']
],'The program starts the peer process. A separate channel tells the client the peer is ready. The request and reply travel over a TCP connection inside the Linux guest. ACK shows the peer replied.'),
'preserve-message-frames':frames('Frame boundaries survive the exchange',[
 ['Topic bytes','orders'],['Binary bytes · hex','00 ff'],['Empty frame','0 bytes']
],'Three frames form one ZeroMQ message. Two PAIR sockets pass it through an address on the guest’s filesystem.'),
'respect-the-req-state-machine':flow('A REQ socket waits for its reply before sending again',[
 ['Ready','Send request','The socket now expects a reply.'],['Waiting','Receive reply','Sending again while waiting raises EFSM.'],['Ready again','Send next request','Receiving the reply lets the socket send again.']
],'This diagram shows the default REQ sequence with no special options enabled.'),
'send-work-down-a-pipeline':flow('Moving work is not completing work',[
 ['Producer','PUSH','Queue numbered jobs.'],['Transport','One-way pipe','Pass complete messages in one direction.'],['Worker','PULL','Receive each job’s number and value.'],['Result','Sum the received values','The producer gets no completion reply.']
],'The sender and receiver use PUSH and PULL. The printed total comes from the receiver’s inputs.'),
'filter-a-publication':branch('Prefixes select different publications',
 ['Publisher','XPUB','First-frame topics: prices, pricey, orders'],
 [['SUB · prefix price','prices and pricey','Both begin with the same byte prefix.'],['SUB · prefix orders','orders','Only orders starts with this prefix.']],
 'The diagram compares two filter settings. Each run creates one subscriber and waits for its subscription to reach the publisher.'),
'meet-the-late-subscriber':sequence('A late subscriber does not acquire old history',[
 ['Publisher (XPUB)','Publisher sends old →','No subscriber yet'],['Publisher sees subscription','← Subscriber asks for price','Subscriber (SUB) connects','back'],['Publisher sends new','Publisher sends new to the subscriber →','Subscriber receives new']
],'The old publication is deliberately sent before a subscriber exists. No log or replay store retains it.'),
'detect-a-sequence-gap':flow('A jump in the sequence reveals a missing number',[
 ['Publisher','1 → 2 → 4','The fixture deliberately omits 3.'],['Consumer state','Expect next = 3','Compare the received sequence 4.'],['Detector','Sequence 3 missing','Find the value in retained history if available.']
],'The example’s own code assigns and checks these numbers. A gap gives the missing number. Finding the cause requires other evidence.'),
'receive-without-blocking':flow('An empty queue and an empty message are different',[
 ['First receive','DONTWAIT','No message is ready.'],['Socket result','EAGAIN','No receive completed.'],['Later send','work','A message becomes available.'],['Next receive','work received','A successful receive returns its bytes.']
],'EAGAIN reports that no message was ready when the receive ran.'),
'bound-a-socket-queue':flow('Count accepted messages before the receiver starts reading',[
 ['Source','PUSH · SNDHWM=2','DONTWAIT returns an error if the send would have to wait.'],['Pinned inproc fixture','4 accepted messages','In this inproc run, both socket limits affect the count.'],['Next admission','EAGAIN','The receiver has not drained yet.'],['Receiver','PULL · RCVHWM=2','Read every accepted message.']
],'Starter settings are illustrated. This observed inproc capacity is not a universal TCP, byte or process-memory formula.'),
'route-an-envelope':frames('ROUTER separates the route from the body',[
 ['ROUTER addressing frame','alpha'],['Application frame','job'],['Application frame','alpha']
],'ROUTER uses the first alpha to choose the connected peer. DEALER receives the application frames that follow. Authenticating a sender needs a separate policy.'),
'reject-an-unknown-route':branch('An option changes unknown-route handling',
 ['Application','Send to unknown','No connected peer owns this route.'],
 [['ROUTER_MANDATORY=1','EHOSTUNREACH','The send reports that the route is missing.'],['Default behavior','May discard silently','API acceptance is not delivery evidence.']],
 'These are alternative settings for the actual ROUTER experiment. Neither proves application completion on an existing route.'),
'match-out-of-order-replies':sequence('Correlate by ID, not by arrival position',[
 ['Client sends a, b and c','Client sends all three requests →','Handler reads all three'],['Client matches c to C','← Handler replies c and C','Handler starts with the last request','back'],['Client matches b to B','← Handler replies b and B','Handler replies to the second request','back'],['Client matches a to A','← Handler replies a and A','Handler replies to the first request','back']
],'The example sends replies in reverse order. The client still matches each response to its ID, giving A for a, B for b and C for c.'),
'forward-through-a-proxy':flow('The proxy forwards; the worker replies',[
 ['Parent process','REQ client','Send the business request.'],['Separate child','ROUTER ↔ DEALER','zmq.proxy forwards the message and its addressing frames.'],['Parent process','REP worker','Handle the body and construct the reply.']
],'The client and the worker share one process. The proxy runs in another process and forwards messages between them.'),
'retry-with-stable-identity':sequence('A missing receipt can follow a completed effect',[
 ['REQ attempt 1','charge-a →','Handler applies 12'],['Client times out','Reply deliberately withheld','Effect already exists','lost'],['New REQ · attempt 2','same charge-a →','Authored duplicate guard'],['Client receives the reply','← Handler replies ACK charge-a','The same ID prevents a second effect in the starter','back']
],'The example keeps processed IDs and applied charges in memory. The run shows both attempts and the entries in the charge list.'),
'dispatch-with-worker-credit':flow('A credit represents application readiness',[
 ['Worker','READY','Tell the dispatcher the worker can accept one job.'],['Broker policy','Assign one job','Remove that worker’s credit.'],['Worker','DONE + assignment','Tell the dispatcher that the assigned job finished.'],['Broker policy','Credit returned','The worker becomes eligible again.']
],'The lab uses worker sockets one at a time in a single process. Its dispatcher decides when to return a worker’s permission to take another job.'),
'replay-a-cached-value':flow('A new subscriber can receive the last stored value',[
 ['Dictionary in the example','price = 12','Store the latest price in memory.'],['XPUB','Subscription arrives','The publisher sees the subscription request.'],['Publisher policy','Cached 12, then live 15','Send both values to the subscriber.'],['Late SUB','Current view','This is not complete audit history.']
],'The example sends one stored price before the live update. With concurrent updates, use versions to decide which value comes next and how to apply deletes.'),
'observe-a-connection':flow('Three observations establish different things',[
 ['Transport','CONNECTED','A TCP connection exists.'],['Protocol','HANDSHAKE_SUCCEEDED','The ZeroMQ handshake completed.'],['Application','pong received','This one handler exchange completed.']
],'The monitor reports the connection and handshake. Receiving pong shows this application exchange finished.'),
'choose-connect-and-close-policy':branch('Decide whether to queue work before a connection is ready',
 ['connect','Asynchronous connection request','There is no listener on the chosen endpoint.'],
 [['IMMEDIATE=1','A send with DONTWAIT raises EAGAIN','Admission requires a completed connection.'],['IMMEDIATE=0','May queue pending work','Acceptance supplies no receiver acknowledgement.']],
 'Closing with LINGER=0 discards any messages still waiting to be sent. The example checks which send is accepted and whether any reply arrives.'),
'encrypt-a-connection':flow('CURVE protects the actual local exchange',[
 ['Client trust','Pin server public key','Use a fresh test key for each run.'],['Real mechanism','CURVE handshake','libzmq establishes the protected connection.'],['Application','Request → ACK','ZeroMQ protects the traffic. The handler reads the received message and sends ACK.']
 ],'The starter exercises encrypted transport. A deployment must separately decide which client keys it trusts and which requests those clients may make.'),
'diagnose-the-missing-receipt':branch('Compare the retry evidence and the response matching evidence',
 ['One run','Two independent experiments','Inspect the charge list and the response map separately.'],
 [['Retry','Two attempts use charge-a','The first handler applies 12 and withholds its reply. The rule for repeated IDs decides whether the next attempt applies another 12.'],['Response matching','Replies for c, b and a','The client uses the request IDs to match them to C, B and A.']],
 'The charge list and processed IDs are kept in memory. A lasting payment record requires a separate storage or service agreement.')
};
