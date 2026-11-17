# Browser Linux / ZeroMQ runtime

CPython 3.12.16, PyZMQ 27.3.0 and libzmq 4.3.5 run natively inside a browser-hosted x86-64 Linux VM. ZeroMQ uses actual guest-local TCP/inproc sockets; there is no host relay or simulated messaging API.

The unmodified Linux/Bochs base comes from [container2wasm-demo](https://github.com/ktock/container2wasm-demo/tree/8228aaa4a7c9d179cbe266a119e69f58746f1742), built with container2wasm 0.6.3. The exact upstream build recipe is retained in `vendor`. `prepare.py` verifies all three raw VM chunk hashes, publishes gzip transfers and records their hashes. The pinned official Python/Debian image and checksum-locked PyZMQ wheel build a relocatable Python bundle. `build_bundle.py` preserves loader SONAME aliases and package notices and precompiles Python for the virtual filesystem's timestamps. Docker is needed only at build time.

```sh
python runtime/prepare.py
```

Fresh Linux mode creates a new guest and writable overlay per Run. Fast mode uses the isolated session controller described below. The worker verifies transferred bytes and executes the exact editor source through `runner.py`. Only actual result frames become output. A private user/network namespace enables guest loopback. Separate processes use `LAB_PYTHON` to invoke the bundled Python through its compatible loader. Stop terminates the worker/guest. A stalled boot may retry once before editor Python starts; editor code is never automatically retried.

Initial transfers are approximately 71 MiB. The manifest is `assets/linux/manifest.json`; Python/library hashes are `assets/linux/python-manifest.json`. Chromium desktop is tested. Static reading needs no VM; phone execution and other browsers need separate validation. Guest data is temporary, and local success is not distributed durability or production performance evidence.

## Run latency and caching

Fresh Linux mode boots a new guest for each Run; fast mode keeps Linux ready between clean process executions. Prepared assets stay in the page worker between runs. The browser can additionally keep verified, decompressed VM/Python asset bytes in IndexedDB across chapter navigation; compiled WebAssembly modules are not persisted. The cache holds one current manifest version, can occupy a few hundred MiB, contains no editor code, guest memory or results, and is disposable. Missing, denied or quota-limited storage falls back to normal verified downloads. Clearing this site's browser data removes it. Reading starts no VM and populates no runtime cache.

The tar is indexed once per worker and only read-only file bytes are shared. Fresh Linux mode creates new inodes, file positions, WebAssembly instance and writable guest overlay. Fast mode starts new isolated processes with private writable files. Python starts with its explicit bundled import paths and `-S`; the runner avoids loading unrelated metadata/platform/process modules. Runtime identification reads the installed distribution metadata. Source programs are never automatically retried.

Run exports include preparation, guest startup, execution and total milliseconds plus the asset source (`download`, `browser-cache` or `page-memory`). These include local emulation and do not measure native or distributed service throughput.

Guest startup spans WebAssembly instantiation, Linux boot and runner initialization. Execution spans the running marker through result collection, including program imports, serialization and result collection. It is not an isolated operator timer.

## Warm Linux with isolated Python processes

`warm-session.mjs` uses feature-detected JSPI (`WebAssembly.Suspending` and `WebAssembly.promising`) to suspend the VM while it waits for the next editor command. No SharedArrayBuffer, cross-origin-isolation headers, service worker or execution backend is required. The worker stays local to the current lesson page. Navigation, Stop and Reset Linux discard it. Browsers without JSPI use the existing fresh-guest path. Prepared asset caching remains separate and never stores source, guest memory or results.

`session_runner.py` preloads only whitelisted, authored helper modules. It verifies that the controller has one native thread before forking and never creates a socket or runs a dataflow in the controller. Every experiment uses a fresh process in new user, PID, network, mount, IPC and UTS namespaces. The experiment is PID 1 in its namespace; exiting it also terminates its descendants. A private tmpfs root supplies scratch files, with read-only binds for installed code and selected device files. The writable root is limited to 32 MiB, with separate temporary shared memory.

The base container locks nested procfs mounts, so fast mode leaves `/proc` unavailable; no synthetic proc data is supplied. Fresh Linux provides the original guest filesystem for system inspection. Fast runs share the Linux kernel and immutable installed runtime, not experiment globals, environment changes, scratch files or sockets. These are local experiment boundaries rather than a multi-tenant VM isolation claim.

A capability failure before student source starts can fall back to fresh Linux. A running marker is emitted only after process/filesystem/network initialization. Source is never automatically retried after that marker. Python errors leave the controller ready for another clean process; Stop or Reset terminates the whole worker/VM.

Exports report `mode`, `session_run` for warm runs, `elapsed_ms` from click through result (including retries), and per-attempt phase times. Warm reruns have zero guest-startup time; their process-startup phase includes namespace/filesystem preparation. Execution includes the actual program, any imports not preloaded and result collection. Cold starts, deliberate protocol waits and recovery subprocesses can still take longer. These are emulation timings, not native service throughput measurements.
