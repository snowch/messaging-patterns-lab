export const parts=[
{title:'Messages and conversations',outcome:'Send requests, preserve frames and follow each socket pattern’s rules.',items:['request-and-reply','preserve-message-frames','respect-the-req-state-machine','send-work-down-a-pipeline','advanced/message-completion-and-durability','advanced/socket-ownership-and-transports']},
{title:'Publications and state',outcome:'Subscribe to updates and handle data you missed.',items:['filter-a-publication','meet-the-late-subscriber','detect-a-sequence-gap','replay-a-cached-value','advanced/repair-a-live-feed']},
{title:'Capacity and lifecycle',outcome:'Handle full queues, timeouts and shutdown.',items:['receive-without-blocking','bound-a-socket-queue','choose-connect-and-close-policy','advanced/measure-and-limit-a-service','advanced/deadlines-heartbeats-and-retries']},
{title:'Routing and worker patterns',outcome:'Route replies and distribute work to available workers.',items:['route-an-envelope','reject-an-unknown-route','match-out-of-order-replies','forward-through-a-proxy','dispatch-with-worker-credit','advanced/workers-and-routing-lifecycles']},
{title:'Reliability and security',outcome:'Retry safely and protect connections.',items:['retry-with-stable-identity','advanced/protocols-and-compatibility','encrypt-a-connection','advanced/secure-and-govern-a-service']},
{title:'Operations and integration',outcome:'Observe connections and combine messaging with durable logs.',items:['observe-a-connection','advanced/integration-with-a-durable-log']},
{title:'Design review and capstone',outcome:'Review a design, then diagnose a missing receipt.',items:['advanced/production-design-review','diagnose-the-missing-receipt']}
];
export const order=parts.flatMap((part,i)=>part.items.map(id=>({id,part:i+1,partTitle:part.title})));
export const href=id=>id.startsWith('advanced/')?id+'.html':'lessons/'+id+'.html';
