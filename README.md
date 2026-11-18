# Messaging Patterns Lab

[Open the course](https://snowch.github.io/messaging-patterns-lab/)

A companion to [Event Streaming Lab](https://snowch.github.io/event-streaming-lab/): **30 chapters across seven parts, with 20 executable investigations and 10 deeper readings**. Real PyZMQ 27.3.0 / libzmq 4.3.5 runs inside browser Linux. TCP, IPC and inproc are actual ZeroMQ transports; the request/reply and proxy investigations use separate processes.

Learn framing, REQ/REP state, pipelines, subscriptions, missing history, sequence gaps, nonblocking operations, HWM, ROUTER/DEALER, mandatory routing, correlation, a real proxy, lost-ACK retries, worker credit, latest-value replay, monitor events, connection/linger policy, CURVE and an integrated capstone. Design readings cover completion/durability, ownership, snapshot/live repair, deadlines/heartbeats, capacity, worker lifecycles, protocols, security, durable-log integration and production review.

Each investigation provides a prediction, inspectable fixture and actual implementation, generated worked result, controlled change, progressive hints, independent transfer, and work/state/movement/progress/recovery accounts. Application policies remain explicitly labelled. Volatile identity/effect lists do not establish durable exactly-once work. Reading needs no JavaScript or VM. The visual system follows GPU Lab v2 with self-hosted IBM Plex fonts.

## Develop

Linux x86-64, Docker, Node 24 and Python 3.12:

```sh
uv venv --python 3.12 .venv
. .venv/bin/activate
uv pip install -r requirements.txt
npm ci
npm run dev
# http://localhost:5173/messaging-patterns-lab/
```

The pinned container2wasm/Bochs VM and Python/PyZMQ bundle are prepared by `runtime/prepare.py`. First use transfers about 71 MiB. Docker is a build-time dependency; the published site is static. Fast reruns keep Linux ready and start a clean isolated Python process, private files and sockets on every Run. Fresh Linux mode starts a new guest each time. Stop and Reset Linux destroy the guest. Guest state, sockets and files are temporary; drafts and reading marks stay in this browser under `mpl:` keys.

```sh
npx playwright install --with-deps chromium
npm run check
```

`check:core` runs exact native examples and variants, the build, links and complete interface checks. The full check additionally compares every published source with actual Chromium/Linux execution and covers errors, startup retry, Stop/restart, source/result downloads, drafts, reading marks and themes. Pages publication splits those Linux investigations across four jobs and waits for every job. Browser tests block external requests; runtime assets are self-hosted.

See [curriculum](docs/curriculum.md), [learning/interface review](docs/review.md), [runtime source/provenance](runtime/README.md) and [component notices](runtime/THIRD-PARTY-NOTICES.md). Original prose is CC BY-NC 4.0 ([LICENSE](LICENSE)); code is Apache-2.0 ([LICENSE-CODE](LICENSE-CODE)). Third-party components retain their own terms. Pieter Hintjens’s book and the ZeroMQ Guide are referenced, not reproduced.

### Automatic Python preparation

Executable lessons prepare Python after rendering while the reader studies the lesson. The interface has one Run action. No editor source executes until Run; every execution uses clean experiment state. Restart Python is in Troubleshooting and preserves code, the last completed result and reading marks. Browser compatibility fallback is automatic.

Speculative preparation waits for a visible page and is disabled for Save Data, 2G connections and devices reporting at most 2 GiB memory. Static reading and design chapters need no runtime. If setup is incomplete when Run is selected, execution waits for it; preparation never produces a result or marks a lesson read. Guest state is discarded on navigation, Stop or Restart Python. Only verified asset bytes persist across chapters.

The automatic runner shares a warm Linux kernel but gives each source a fresh isolated process, private files and sockets. System directories are read-only, scratch is limited to 32 MiB and /proc is absent. For runtime diagnostics only, append `?runtime=fresh` to a lesson URL to force the original full-guest runner. Exports retain internal mode and phase details; `background_ready_on_click` records whether setup finished before the actual click, and `background_preparation` reports background startup separately from `elapsed_ms`.
