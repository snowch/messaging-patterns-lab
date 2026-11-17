# Learning and interface review

Applied the repository UX and learning-design skills before implementation and again to rendered desktop/phone pages. The course follows GPU Lab v2 typography, palette, centered chapters, course switcher and workbench. Original exercises combine prediction, real execution, controlled change, inspectable helpers and independent transfer. Every lab accounts for work, state, movement, progress and recovery. Reading marks are independent of execution success.

Native validation executes all 20 exact editor examples and meaningful variants, including framing, EFSM, filtering, sequence gaps, HWM conservation, routing, correlation, real proxy traffic, lost-ACK effects, credit ownership, cache replay, monitoring, admission, CURVE and capstone divergence. The native benchmark validates replies before reporting measured time.

A real Chromium/Linux spike verified separate-process TCP, a separate zmq.proxy, CURVE, deliberate lost-ACK retry and bounded inproc queues. The first direct-worker spike stalled before Python; an instrumented fresh guest completed all five cases. The final host retains the proven bounded startup watchdog: one retry before editor Python begins, never automatic retry of learner code. Missing result frames are errors, never worked-output fallbacks.

All 34 course pages pass phone-width inspection without JavaScript. The ten deeper readings exceed 3,000 characters of visible main text each. Keyboard course selection, Escape/outside dismissal, themes, source inspection and no VM-before-Run checks pass. A subsequent user review identified repetitive exercise disclosures and excessive spacing; the shared exercise component groups progressive hints, separates the answer reveal, tightens spacing and makes scope notes quieter in both companion courses.

The complete browser suite and release gate compare every source with its native result. Separate-process exercises are identified; other fixtures deliberately drive socket owners serially. Application policies (credits, duplicate sets, gap detection and latest-value replay) remain separate from libzmq mechanisms. Ephemeral CURVE keys do not configure client authorization. No production throughput, durable recovery, multi-host failover or external TCP access is claimed. Chromium is tested; mobile execution and other browsers require separate validation. This is an implementation review, not a learner study.

The first publication attempt correctly stopped when all Linux jobs received the artifact under the old course’s preview directory. Corrected the workflow destination to `.preview/messaging-patterns-lab` and added an explicit HTTP status assertion before any guest starts. This was release wiring, not a fabricated or failed ZeroMQ result.


## Explanatory diagrams

Added pattern-specific semantic HTML/SVG diagrams before lab execution. Request/reply timelines, multipart frame groups, actual pattern-state relationships, branching policies and recovery paths use distinct layouts. Parallel partitions/readers/keyed histories and alternative socket settings use branch diagrams, so arrows do not imply a false serial pipeline. Every figure is labelled conceptual and describes the starter/example boundary; actual execution evidence remains in the console and run exports. Reading and diagrams require no JavaScript or runtime download. Phone checks cover each figure’s containing page and figures remain selectable/readable text.

The browser completion check now waits for Run to become available again. A status containing “startup stalled · retrying” is a nonterminal initialization state and must not be mistaken for a failed program. Source execution is still never automatically retried.

## Run latency review — 17 November 2026

The shared bottleneck was a full x86 Linux/Python startup on every Run. Preserve that fresh-guest contract, while removing eager runner imports, using the explicit import path with Python `-S`, disabling WASI pathname debug logging, indexing the bundle once and sharing only immutable archive bytes. IndexedDB stores verified prepared asset bytes across chapters, keyed by every manifest asset's filename/hash/size. It never stores the editor, guest memory or results. Unsupported/denied/quota-limited storage is optional and falls back to normal downloads. Helpers still load freshly. A compiled WebAssembly module cannot be stored in Chromium IndexedDB; this cache deliberately stores bytes instead.

An exploratory memory/Asyncify startup snapshot did not resume correctly with the pinned VM; it was not included. The shipped path still creates a new WebAssembly instance and Linux guest for every source execution. Stop and the one pre-Python boot retry retain their existing semantics.

Before/after local Chromium checks ran the exact first published source three times per course, with both courses active concurrently. The two repeat runs had median totals of 23.55 → 20.14 seconds for streaming and 19.07 → 16.10 seconds for messaging (about 14–16% less time). This small desktop sample is illustrative, not a mobile, network or production benchmark. The measured totals, phase boundaries and method are recorded in [runtime-startup-check.json](runtime-startup-check.json); full records are retained in the workspace runtime-baseline.json and runtime-optimized.json. The completion status and exports now expose measured time.

Validation covers native examples, all real browser investigations, cache persistence across chapter navigation, manifest mismatch and storage denial, Stop/errors/draft behavior, and repeated code that asserts prior Python globals and a /tmp marker do not exist. Static reading and phone layouts remain available without runtime loading.
