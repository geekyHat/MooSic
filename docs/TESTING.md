# Testing

Run commands from the repository root with Node.js 24 or newer.

```sh
npm ci --include=dev
npx playwright install chromium firefox webkit
npm run quality
npm run check:gates
npm run test:browser
MM_BROWSERS=chromium,firefox,webkit npm run test:browser
npm run test:production
npm run test:pwa
npm run check:offline
```

`quality` checks TypeScript, lint, architecture boundaries, unit tests, the production build and bundle budgets. `check:gates` injects temporary negative controls and removes them afterwards. Production tests require a prior build. PWA tests create two isolated builds under `.qa/pwa/` and exercise the real worker under a subdirectory, including cold offline launches, recognition assets, updates and first-install pairing.

Local Chromium can use `/usr/bin/chromium` or `CHROMIUM_PATH`; CI uses Playwright browser binaries. Linux WebKit may require the native libraries supplied by the official Playwright container. Automated browser tests do not substitute for testing on physical phones or Safari/iOS.

Test output is written to `test-results/`, `playwright-report/`, `.qa/` or an explicitly selected output directory. These generated files are ignored. Visual reference images under `tests/visual/__screenshots__/` are versioned fixtures and must remain in the repository.

## Visual baselines and Linux audio

Visual baselines use the same pinned environment as CI: `mcr.microsoft.com/playwright:v1.64.1-noble`. In that environment run:

```sh
npm run test:visual
npm run check:visual-gate
npm run test:visual
```

Update reference images only after reviewing the intended visual change. The negative control changes fonts and colors in an isolated page and must detect a pixel difference.

Firefox tests that exercise Web Audio need a working audio backend. The QA container supplies PulseAudio with a private null sink, without mounting the host microphone, audio socket or home directory. To reproduce the visual environment on Linux:

```sh
docker build -t moosic-qa:pw1.64.1-audio scripts/qa
npm run dev -- --host 127.0.0.1 --port 5197 --strictPort
```

From a second terminal:

```sh
MM_ARTIFACTS=$(mktemp -d)
MM_RUNTIME=$(mktemp -d)
mkdir -p "$MM_ARTIFACTS/tmp"
docker run --rm --init --network=host --shm-size=1g \
  --user "$(id -u):$(id -g)" \
  -e CI=true -e MM_BROWSERS=chromium,firefox,webkit \
  -e MM_TARGET_URL=http://127.0.0.1:5197 \
  -e MM_VISUAL_OUTPUT=/artifacts/visual \
  -e PLAYWRIGHT_JSON_OUTPUT_FILE=/artifacts/visual.json \
  -e HOME=/run/mm-qa/home -e TMPDIR=/artifacts/tmp \
  -e XDG_RUNTIME_DIR=/run/mm-qa \
  -e PULSE_SERVER=unix:/run/mm-qa/pulse/native \
  -v "$PWD:/work:ro" -v "$MM_ARTIFACTS:/artifacts" \
  -v "$MM_RUNTIME:/run/mm-qa" -w /work \
  moosic-qa:pw1.64.1-audio sh -c '
    mkdir -p "$HOME"
    env -u PULSE_SERVER pulseaudio --start --exit-idle-time=-1 --load="module-null-sink sink_name=moosic"
    npm run check:visual-gate && npm run test:visual -- --update-snapshots=none --reporter=list,json
  '
```

Use fresh artifact and runtime directories for each run. `--network=host` is specific to this local Linux setup. Test commands verify behavior, geometry, semantics and audio API use; they do not certify perceived musical quality or accessibility on every device.
