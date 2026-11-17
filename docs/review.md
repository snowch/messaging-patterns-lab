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

The shared bottleneck was a full x86 Linux/Python startup on every Run. Preserve that fresh-guest contract, while removing eager runner imports, using the explicit import path with Python `-S`, disabling WASI pathname debug logging, indexing the bundle once and sharing only immutable archive bytes. IndexedDB stores verified prepared asset bytes across chapters, keyed by every manifest asset's filename/hash/size. Large binary blobs avoid Chromium’s serialized-record size limit, verified with the full-sized runtime across chapter navigation. It never stores the editor, guest memory or results. Unsupported/denied/quota-limited storage is optional and falls back to normal downloads. Helpers still load freshly. A compiled WebAssembly module cannot be stored in Chromium IndexedDB; this cache deliberately stores bytes instead.

An exploratory memory/Asyncify startup snapshot did not resume correctly with the pinned VM; it was not included. The shipped path still creates a new WebAssembly instance and Linux guest for every source execution. Stop and the one pre-Python boot retry retain their existing semantics.

Before/after local Chromium checks ran the exact first published source three times per course, with both courses active concurrently. The two repeat runs had median totals of 23.55 → 20.14 seconds for streaming and 19.07 → 16.10 seconds for messaging (about 14–16% less time). This small desktop sample is illustrative, not a mobile, network or production benchmark. The measured totals, phase boundaries and method are recorded in [runtime-startup-check.json](runtime-startup-check.json); full records are retained in the workspace runtime-baseline.json and runtime-optimized.json. The completion status and exports now expose measured time.

Validation covers native examples, all real browser investigations, cache persistence across chapter navigation, manifest mismatch and storage denial, Stop/errors/draft behavior, and repeated code that asserts prior Python globals and a /tmp marker do not exist. Static reading and phone layouts remain available without runtime loading.

## Course-entry layout review — 17 November 2026

The old home repeated a large conceptual poster, technical version details and a second slogan before the course map. Replace it with a short practical introduction, one starting action, prerequisite/lesson counts and a compact chapter list. Runtime versions and VM details remain in Field notes and beside Run. Keep the full conceptual diagrams in the relevant lessons. Part summaries now use concrete actions rather than abstract contract terminology.

At 390px and 834px widths the first chapter is visible in the initial viewport, with no horizontal overflow. Chapter numbers, titles, descriptions, lab/reading labels and explicit read marks remain available; the course still has the same 30 chapters. Keyboard focus, dark mode, static reading and all lesson layouts are checked through the existing interface pass.

## Sentence and interface audit

The pass covered every heading, prompt, setup, worked observation, variation, scope statement, hint, transfer answer and cost row in the [20 investigations](../src/lessons.mjs). Basic Python is the starting prerequisite. The first lesson now explains the sockets, the request and reply, and the meaning of ACK before asking the reader to recognize it. Optional source inspection defines the ZeroMQ context and explains which information travels through the readiness pipe.

| Investigations | What changed |
| --- | --- |
| Request and reply, frames, REQ state | Separate what the page starts from what the learner does. Identify the reply frames, the byte and frame counts, and what happens when REQ receives its first reply. |
| Pipeline, publication filter, late subscriber, sequence gaps | Identify which jobs arrived, which topic prefixes match, and which publication values and sequence numbers were observed. Explain what the sender or publisher prepared before each comparison. |
| Nonblocking receive, socket queues, routing, unknown routes | Define the relevant socket flags and limits. Distinguish a zero-byte message from an empty receive, messages admitted from bytes held, and the routing key from an application frame. |
| Reply correlation, proxy, retry, worker credit | Separate arrival order from matching, forwarding from handling, and repeated attempts from repeated effects. Name the assignment that waits when the broker has no credit. |
| Latest-value replay, monitor, connection and close, CURVE, capstone | Name the evidence for a cached value, a completed application reply, queue admission, and server-key verification. Identify the capstone's repeated charge and state what survives the example. |

The [ten design readings](../src/readings.mjs) received the same pass on openings, explanations, tables, hints and answers. The readings define admission, commits and replies by what their evidence shows. They explain socket ownership and transport, snapshot positions and publisher sessions, deadlines and heartbeats, queue capacity, dispatch credits, message formats, identity checks, restart positions, and the evidence needed before switching to a recovered view. Each illustrative table has a question tied to its rows. Case-specific limits stay where the claims are made. The [concept diagrams](../scripts/diagrams.mjs) name the sender and receiver, confirm which channel reports readiness and which carries messages, and separate worker replies from transport protection.

The [shared pages](../scripts/build.mjs), [worked explanations and exercise controls](../scripts/exercise.mjs), and [editor and runtime feedback](../src/app.js) were checked in reading, first-run, edited-run, error, cancellation and recovery order. The setup and short original result stay visible without running code. The original console data, helper, and cost details can be opened separately. Stop appears only during a run. Downloads include the code and the last good run. Restore keeps a recoverable copy of the displaced edit across reloads, and a later error leaves the last successful output and its source available. Earlier ZeroMQ drafts still open in the editor and pre-ZeroMQ drafts remain available to download.

The [native checks](../tests/test_course.py) run all 20 original sources and all 21 exact edits from the learner instructions, including each setting in the prefix, sequence and queue comparisons. The [browser checks](../tests/browser.mjs) run those same sources in isolated Python processes inside real browser Linux and compare the observed ZeroMQ results with the native checks. The [interface checks](../tests/interface.mjs) cover all 34 pages at phone width, theme and keyboard controls, and the static reading path with JavaScript off. These checks verify the instructions and interface. They do not measure learning outcomes.

The page gives its worker and Python helpers the same build ID. The code download uses that ID too. A browser that recently ran an older lesson can load these exact edits while keeping its previously downloaded large Linux files.

## Fast reruns with warm Linux — 17 November 2026

Replace repeated VM/Python startup with a feature-detected warm session, retaining explicit Fresh Linux and Reset Linux controls. JSPI suspends the guest between commands. A single-threaded controller preloads whitelisted helpers, then each program runs in a new PID-1 process with new user/network/mount/PID/IPC/UTS namespaces and a private scratch root. Installed directories are read-only. Fast mode intentionally has no /proc because nested proc mounts are locked; Fresh Linux retains system inspection.

Before integration, all 50 exact published sources matched their native worked results in real warm browser Linux. Additional runs wrote files at /, /tmp and /var/tmp, changed globals, module attributes and environment, left a native TCP socket open and forked a sleeping descendant; subsequent runs started clean. Median times after the initial boot across that mixed example sequence were 381 ms for messaging and 707 ms for streaming. These are illustrative desktop workload timings, not interchangeable operator benchmarks or mobile guarantees. Cold starts, live Kafka and recovery drills still take longer.

The integrated production worker/editor smoke checked warm reuse, actual output, reset, fresh-Linux execution and export identities for both courses. Introductory streaming reruns took about 0.6 seconds; the messaging request/reply example took about 5.3 seconds because it still starts a separate interpreter for its peer. Source execution is never automatically retried after the running marker. Completion timing now measures the whole click-to-result wait, rather than only the successful worker attempt.

The final checks cover every published source natively and in real browser Linux, existing errors/Stop/drafts/reading marks, private files/globals/environment and process cleanup, zero guest-startup on warm reruns, full reset, explicit Fresh Linux, and real execution after JSPI fallback. UI mode/reset controls sit beside the editor; runtime details are collapsed. Reading and diagrams still require no VM.

The published app, lesson array, worker, warm bridge, polling shim, runtime cache and Python helpers share a content-derived build ID. This prevents a previously cached polling shim from missing queued session input after an upgrade. The large pinned Linux assets keep their existing cache keys.
