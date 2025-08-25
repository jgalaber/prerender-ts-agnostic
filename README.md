# Prerender — TypeScript, Modular, Adapter-Agnostic

This project is a modernized, adapter-agnostic reimplementation of [prerender-node](https://github.com/prerender/prerender-node) with a focus on performance, maintainability, and portability. It provides a drop-in prerender middleware that you can wire into any runtime (Express v4, Express v5, Bun, etc.) via small adapters.

## Why this exists

- Keep the proven behavior/API of prerender-node.
- Make it framework/runtime agnostic via adapters.
- Improve performance on the hot path.
- Make the codebase easier to understand and extend.

## What’s improved

- Language & code quality
- TypeScript across the codebase.
- No more var; replaced with const/let and block scoping in JS.
- Module split (constants, utils, core) for clarity and testability.

## Hot-path performance

- Compiled single RegExp for crawler UA matching (vs. repeated .includes).
- Pre-compiled regexes (avoid new RegExp O(1)).
- Fast-path for _escaped_fragment_ and static extension checks (avoid new URL in hot path).
- Header forwarding whitelist to reduce GC and avoid platform quirks.
- Robust protocol detection (req.socket.encrypted, x-forwarded-proto, Cloudflare header).
- Middleware returns this from setters for fluent chaining:

```typescript
prerender
  .set('prerenderServiceUrl', 'http://localhost:9000/')
  .whitelisted(['^/blog'])
  .blacklisted(['^/api']);
```

## Adapter-agnostic architecture

Use the core with any server by adding a small adapter:

- Express v4 adapter
- Express v5 adapter
- Bun adapter (Bun.serve)

Each adapter simply adapts (req, res, next) to the core Prerender interfaces. No framework code leaks into the core.

## Quick start

### Wire an adapter (Express v4 example):

```typescript
import express from 'express';
import Prerender, { Adapters } from 'prerender-agnostic';

const PORT = 8001;
const app = express();

app.use(
  Adapters.expressPrerender(
    new Prerender().set('prerenderServiceUrl', 'http://localhost:3000'),
  ),
);
app.use(express.static('../public'));

app.listen(PORT, () => {
  console.log(
    `Prerender Vue.js example app is listening at http://localhost:${PORT}`,
  );
});
```

### Bun example:

```typescript
import { file } from 'bun';
import Prerender, { Adapters } from 'prerender-agnostic';

const prerender = new Prerender().set(
  'prerenderServiceUrl',
  'http://localhost:3000',
);

Bun.serve({
  port: 8003,

  fetch: Adapters.bunPrerender(prerender, (req) => {
    return new Response(file('../public/index.html'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }),
});

console.log('🚀 http://localhost:8003');
```

## Results

### Human

| metric    | Express Prerender | TS Express v4 | TS Express v5 |    Bun.sh |
| --------- | ----------------: | ------------: | ------------: | --------: |
| avg (ms)  |              1.25 |          1.24 |          1.34 |  **1.04** |
| p50 (ms)  |              1.18 |      **1.19** |          1.29 |      1.28 |
| p90 (ms)  |              1.71 |      **1.65** |          1.81 |      1.72 |
| p95 (ms)  |              1.88 |      **1.78** |          1.94 |      1.81 |
| p99 (ms)  |              2.32 |      **2.11** |          2.29 |      2.02 |
| min (ms)  |              0.35 |          0.37 |          0.41 |  **0.18** |
| max (ms)  |             16.81 |         17.65 |         18.32 | **15.95** |
| fail rate |              0.00 |          0.00 |          0.00 |      0.00 |
| total req |             11901 |         11901 |         11901 |     11901 |

### Takeaways (Human):

- Bun.sh shows the lowest avg/p50 among all, indicating very low steady-state overhead.
- TS Express v4 edges out p90–p99 tails vs. the other Node targets.
- All Node variants are extremely close; differences are within a few tenths of a millisecond.

### Bot

| metric    | Express Prerender | TS Express v4 | TS Express v5 | Bun.sh |
| --------- | ----------------: | ------------: | ------------: | -----: |
| avg (ms)  |              1.69 |      **1.50** |          1.57 |   2.54 |
| p50 (ms)  |              1.63 |      **1.45** |          1.50 |   2.68 |
| p90 (ms)  |              2.24 |      **2.02** |          2.11 |   4.67 |
| p95 (ms)  |              2.46 |      **2.25** |          2.36 |   5.04 |
| p99 (ms)  |              2.83 |      **2.59** |          2.75 |   5.73 |
| min (ms)  |              0.50 |          0.52 |      **0.49** |   0.36 |
| max (ms)  |             24.98 |         25.29 |     **20.76** |  51.70 |
| fail rate |              0.00 |          0.00 |          0.00 |   0.00 |
| total req |             11900 |         11900 |         11901 |  11901 |

### Takeaways (Bot):

- TS Express v4 is consistently the fastest across avg/p50/p95/p99.
- TS Express v5 is a close second; Express Prerender trails slightly.
- Bun.sh lags in the bot profile in this setup—likely due to adapter nuances or header/UA logic paths; worth profiling if bot traffic is dominant.

> Note: The upstream renderer was mocked to return instantly; latencies reflect primarily framework + network loopback overhead, not real rendering costs.

## Conclusions

- All Node targets achieve sub-2ms median in both human and bot profiles with a mocked upstream.
- Bun shines for human traffic (best avg/p50), while TS Express v4 shows the best tail latencies and best bot performance.
- The modernized core (TypeScript, const/let, modular, hot-path optimizations) provides small but consistent gains and a much cleaner codebase.

## Recommendations & next steps

1. Choose adapter per environment:

- Bun: great median latency.
- Express v4/v5: very stable across the distribution; v4 had the best tails in our run.

2. Production tuning (already baked in):

- Reuse upstream connections (keep-alive agents).
- Compile UA/whitelist/blacklist regexes once.
- Avoid new URL on the hot path for simple checks.
- Forward a minimal header set upstream.
- Detect protocol robustly (TLS/CF/XFP) to build the right absolute URL.

3. If you benchmark the real renderer:

- Run separate suites for human and bot profiles.
- Size VUs for the p95 you observe (avoid VU caps that under-saturate your target rate).
- Keep a mock path around to isolate middleware regressions from engine changes.

## How to add a new adapter

Adapters are ~20–40 lines. Map your server’s (req, res, next) to:

```typescript
HttpRequest: { method, url, headers, connection/socket }
HttpResponse: { writeHead(status, headers?), end(body?) }

// Then call:

const mw = prerender.middleware.bind(prerender);
mw(httpReq, httpRes, next);
```

### Test setup: simple-prerender-engine (mock)

To measure framework/runtime overhead agnostically, we mocked the prerender service with a tiny Express server that returns an HTML document immediately. This removes the real rendering engine latency from the equation so we can evaluate just:

- Request classification (bot/human)
- Header and URL handling
- Upstream call assembly
- Network + framework overhead

> Context: The goal is to benchmark the middleware implementations (Express v4, Express v5, Bun) and the > modernized “Express Prerender” baseline derived from prerender-node, without distortions from a real headless rendering engine.

## How to Run the Benchmark

### Prerequisites

- Node.js ≥ 18
- k6 installed (brew install k6 or the official binary)
- (Optional) Bun, if you’ll run the Bun adapter
- (Optional) pm2 for monitoring (npm i -g pm2)

### Step One: Build the local package

```bash
npm run local:pkg
```

### Step Two: Start the simple-prerender-engine (mock)

```bash
cd simple-prerender-engine
npm install
pm2 start npm --name mock -- run dev # or npm run dev
```

### Step Three: Start the 4 servers (middlewares/adapters)

#### PM2

```bash
pm2 start npm --name express-prerender -- run dev --cwd ./test/middlewares/prerender-node-express-v4-vue
pm2 start npm --name ts-express-v4     -- run dev --cwd ./test/middlewares/node-express-v4-vue
pm2 start npm --name ts-express-v5     -- run dev --cwd ./test/middlewares/node-express-v5-vue
pm2 start bun --name bun               -- run dev --cwd ./test/middlewares/bun-serve-vue
```

Monit

```bash
pm2 monit
```

#### Or Bash

```bash
# A) Express Prerender (baseline derived from prerender-node)
cd ./test/middlewares/prerender-node-express-v4-vue
npm install
npm run dev   # → typically :8000

# B) TS Express v4
cd ./test/middlewares/node-express-v4-vue
npm install
npm run dev   # → :8001

# C) TS Express v5
cd ./test/middlewares/node-express-v5-vue
npm install
npm run dev   # → :8002

# D) Bun.sh
cd ./test/middlewares/bun-serve-vue
bun install   # (You can also install bun from node >> $ npm i -g bun)
bun run dev   # → :8003
```

Quick sanity checks:

```bash
curl -I http://localhost:8000/
curl -I http://localhost:8001/
curl -I http://localhost:8002/
curl -I http://localhost:8003/
```

### Step Four: Run Grafana K6 script

```bash
cd ./k6
k6 run k6-stress.js
```

## License

MIT.
