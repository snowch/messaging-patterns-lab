# Browser Linux / ZeroMQ runtime

CPython 3.12.16, PyZMQ 27.3.0 and libzmq 4.3.5 run natively inside a browser-hosted x86-64 Linux VM. ZeroMQ uses actual guest-local TCP/inproc sockets; there is no host relay or simulated messaging API.

The unmodified Linux/Bochs base comes from [container2wasm-demo](https://github.com/ktock/container2wasm-demo/tree/8228aaa4a7c9d179cbe266a119e69f58746f1742), built with container2wasm 0.6.3. The exact upstream build recipe is retained in `vendor`. `prepare.py` verifies all three raw VM chunk hashes, publishes gzip transfers and records their hashes. The pinned official Python/Debian image and checksum-locked PyZMQ wheel build a relocatable Python bundle. `build_bundle.py` preserves loader SONAME aliases and package notices and precompiles Python for the virtual filesystem's timestamps. Docker is needed only at build time.

```sh
python runtime/prepare.py
```

Each Run creates a new guest and writable overlay. The worker verifies transferred bytes and executes the exact editor source through `runner.py`. Only actual result frames become output. A private user/network namespace enables guest loopback. Separate processes use `LAB_PYTHON` to invoke the bundled Python through its compatible loader. Stop terminates the worker/guest. A stalled boot may retry once before editor Python starts; editor code is never automatically retried.

Initial transfers are approximately 71 MiB. The manifest is `assets/linux/manifest.json`; Python/library hashes are `assets/linux/python-manifest.json`. Chromium desktop is tested. Static reading needs no VM; phone execution and other browsers need separate validation. Guest data is temporary, and local success is not distributed durability or production performance evidence.
