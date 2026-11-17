# Curriculum and coverage

30 chapters: 20 real ZeroMQ investigations and 10 substantial design/operations readings. Basic Python is the entry prerequisite.

## 1. Messages and conversations

Distinguish transport admission, message framing, pattern state and application completion.

1. **Send a request to another process** — A socket exchange has several different completion points. (Real sockets)
2. **Preserve message boundaries** — Bytes, frames and messages are different units. (Real sockets)
3. **Respect the REQ state machine** — A socket pattern constrains the next legal operation. (Real sockets)
4. **Send work down a pipeline** — PUSH/PULL moves work without defining a receipt protocol. (Real sockets)
5. **What completed when send returned?** — Trace admission, reception, execution, commitment and acknowledgement. (Reading)
6. **Who owns the socket?** — Choose context, thread/process ownership, transport and shutdown boundaries. (Reading)

## 2. Publications and state

Handle subscription boundaries, missing history, sequences and current-state replay.

7. **Filter a publication** — A subscription is a byte prefix, not a business predicate. (Real sockets)
8. **Meet the late subscriber** — A connected feed is not a historical log. (Real sockets)
9. **Detect a sequence gap** — Detection is the start of a recovery protocol. (Real sockets)
10. **Replay a cached value** — Latest value and complete history answer different questions. (Real sockets)
11. **How does a late reader catch up?** — Design a snapshot/live handoff with versions, gaps and deletes. (Reading)

## 3. Capacity and lifecycle

Choose admission, readiness, deadlines and shutdown policy.

12. **Receive without blocking** — EAGAIN means no operation completed now. (Real sockets)
13. **Bound a socket queue** — A message-count limit is not a memory budget. (Real sockets)
14. **Choose connection and close policy** — Queued before connection does not mean delivered. (Real sockets)
15. **Where is the unfinished work?** — Measure a stated boundary and budget bytes, queues, fan-out and recovery. (Reading)
16. **What does silence tell you?** — Treat deadlines and heartbeats as bounded observations, not proof of remote failure. (Reading)

## 4. Routing and worker patterns

Separate connection routes, correlation identities and worker ownership.

17. **Route an envelope** — A routing identity selects a connection, not a user. (Real sockets)
18. **Reject an unknown route** — A successful send can still lack a destination. (Real sockets)
19. **Match out-of-order replies** — Arrival order is not request identity. (Real sockets)
20. **Forward through a real proxy** — A proxy forwards envelopes; workers define the service. (Real sockets)
21. **Dispatch with worker credit** — Readiness can be an application protocol. (Real sockets)
22. **When does a worker own a job?** — Separate transient routes, readiness, assignment identity and effect ownership. (Reading)

## 5. Reliability and security

Bound retries and define identities, effects, keys and permissions.

23. **Retry with stable identity** — A lost acknowledgement can hide a completed effect. (Real sockets)
24. **What is the wire contract?** — Specify envelopes, schema meaning, identity, limits and version rollout. (Reading)
25. **Encrypt a connection** — Encryption and permission are separate contracts. (Real sockets)
26. **Who may issue the request?** — Connect encrypted transport to identity, authorization, secrets and data lifecycle. (Reading)

## 6. Operations and integration

Connect observability and durable recovery to the actual system boundary.

27. **Observe a connection** — Transport health is one layer of evidence. (Real sockets)
28. **Where does replay come from?** — Compose ZeroMQ messaging with a durable source without inventing atomic commits. (Reading)

## 7. Design review and capstone

Defend a complete protocol and test its failure cuts.

29. **Defend the complete conversation** — Produce a topology, protocol, failure matrix, resource budget and validation plan. (Reading)
30. **Diagnose the missing receipt** — Compose identity, retries, routing and evidence. (Real sockets)

## Deliberate boundaries

The labs execute real local messaging mechanisms. They do not prove storage durability, external-service transactions, multi-host scheduling/failover, authenticated business permissions or production capacity. Those concepts are developed through worked design cases and explicit real-deployment test plans. Retry, credit, sequence, cache and duplicate policies are authored and inspectable.

The final assessment requires a topology, distinct identities, protocol/size limits, timing and ownership rules, effect/recovery boundaries, resource budgets, failure matrix, observability and next deployment tests.
