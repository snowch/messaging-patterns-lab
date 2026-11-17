export const parts=[
{title:'Messages and conversations',outcome:'Distinguish transport admission, message framing, pattern state and application completion.',items:['request-and-reply','preserve-message-frames','respect-the-req-state-machine','send-work-down-a-pipeline','advanced/message-completion-and-durability','advanced/socket-ownership-and-transports']},
{title:'Publications and state',outcome:'Handle subscription boundaries, missing history, sequences and current-state replay.',items:['filter-a-publication','meet-the-late-subscriber','detect-a-sequence-gap','replay-a-cached-value','advanced/repair-a-live-feed']},
{title:'Capacity and lifecycle',outcome:'Choose admission, readiness, deadlines and shutdown policy.',items:['receive-without-blocking','bound-a-socket-queue','choose-connect-and-close-policy','advanced/measure-and-limit-a-service','advanced/deadlines-heartbeats-and-retries']},
{title:'Routing and worker patterns',outcome:'Separate connection routes, correlation identities and worker ownership.',items:['route-an-envelope','reject-an-unknown-route','match-out-of-order-replies','forward-through-a-proxy','dispatch-with-worker-credit','advanced/workers-and-routing-lifecycles']},
{title:'Reliability and security',outcome:'Bound retries and define identities, effects, keys and permissions.',items:['retry-with-stable-identity','advanced/protocols-and-compatibility','encrypt-a-connection','advanced/secure-and-govern-a-service']},
{title:'Operations and integration',outcome:'Connect observability and durable recovery to the actual system boundary.',items:['observe-a-connection','advanced/integration-with-a-durable-log']},
{title:'Design review and capstone',outcome:'Defend a complete protocol and test its failure cuts.',items:['advanced/production-design-review','diagnose-the-missing-receipt']}
];
export const order=parts.flatMap((part,i)=>part.items.map(id=>({id,part:i+1,partTitle:part.title})));
export const href=id=>id.startsWith('advanced/')?id+'.html':'lessons/'+id+'.html';
