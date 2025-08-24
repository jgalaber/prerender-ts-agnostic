import http from "k6/http";
import { check } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

/* ====== CONFIG ====== */
const SERVICE_A_BASE = __ENV.SERVICE_A_BASE || "http://localhost:8000"; // Express Prerender
const SERVICE_B_BASE = __ENV.SERVICE_B_BASE || "http://localhost:8001"; // TS Express v4
const SERVICE_C_BASE = __ENV.SERVICE_C_BASE || "http://localhost:8002"; // TS Express v5
const SERVICE_D_BASE = __ENV.SERVICE_D_BASE || "http://localhost:8003"; // Bun.sh

const A_PATHS = (__ENV.SERVICE_A_PATHS || "/").split(",").map((s) => s.trim());
const B_PATHS = (__ENV.SERVICE_B_PATHS || "/").split(",").map((s) => s.trim());
const C_PATHS = (__ENV.SERVICE_C_PATHS || "/").split(",").map((s) => s.trim());
const D_PATHS = (__ENV.SERVICE_D_PATHS || "/").split(",").map((s) => s.trim());

const PRERENDER_QUERY = __ENV.PRERENDER_QUERY || "";

/* ====== METRICS ====== */
const dur_A_human = new Trend("dur_A_human", true);
const dur_B_human = new Trend("dur_B_human", true);
const dur_C_human = new Trend("dur_C_human", true);
const dur_D_human = new Trend("dur_D_human", true);

const dur_A_bot = new Trend("dur_A_bot", true);
const dur_B_bot = new Trend("dur_B_bot", true);
const dur_C_bot = new Trend("dur_C_bot", true);
const dur_D_bot = new Trend("dur_D_bot", true);

const fail_A_human = new Rate("fail_A_human");
const fail_B_human = new Rate("fail_B_human");
const fail_C_human = new Rate("fail_C_human");
const fail_D_human = new Rate("fail_D_human");

const fail_A_bot = new Rate("fail_A_bot");
const fail_B_bot = new Rate("fail_B_bot");
const fail_C_bot = new Rate("fail_C_bot");
const fail_D_bot = new Rate("fail_D_bot");

const req_A_human = new Counter("req_A_human");
const req_B_human = new Counter("req_B_human");
const req_C_human = new Counter("req_C_human");
const req_D_human = new Counter("req_D_human");

const req_A_bot = new Counter("req_A_bot");
const req_B_bot = new Counter("req_B_bot");
const req_C_bot = new Counter("req_C_bot");
const req_D_bot = new Counter("req_D_bot");

/* ====== SCENARIOS ====== */
const GAP = "20s";

export const options = {
  scenarios: {
    A_human: {
      executor: "constant-arrival-rate",
      exec: "scenario_A_human",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "0s",
      gracefulStop: GAP,
    },
    B_human: {
      executor: "constant-arrival-rate",
      exec: "scenario_B_human",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "2m",
      gracefulStop: GAP,
    },
    C_human: {
      executor: "constant-arrival-rate",
      exec: "scenario_C_human",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "4m",
      gracefulStop: GAP,
    },
    D_human: {
      executor: "constant-arrival-rate",
      exec: "scenario_D_human",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "6m",
      gracefulStop: GAP,
    },
    A_bot: {
      executor: "constant-arrival-rate",
      exec: "scenario_A_bot",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "8m",
      gracefulStop: GAP,
    },
    B_bot: {
      executor: "constant-arrival-rate",
      exec: "scenario_B_bot",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "10m",
      gracefulStop: GAP,
    },
    C_bot: {
      executor: "constant-arrival-rate",
      exec: "scenario_C_bot",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "12m",
      gracefulStop: GAP,
    },
    D_bot: {
      executor: "constant-arrival-rate",
      exec: "scenario_D_bot",
      rate: 100,
      timeUnit: "1s",
      duration: "1m59s",
      preAllocatedVUs: 10,
      maxVUs: 2000,
      startTime: "14m",
      gracefulStop: GAP,
    },
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

/* ====== HELPERS ====== */
function r(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function url(base, paths) {
  return `${base}${r(paths)}${PRERENDER_QUERY}`;
}

function hit(u, kind) {
  const headers =
    kind.client === "bot"
      ? {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          Accept: "text/html,application/xhtml+xml",
        }
      : {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
          Accept: "text/html,application/xhtml+xml",
        };
  const res = http.get(u, { headers, tags: kind });
  const ok = check(
    res,
    {
      "status 200": (r) => r.status === 200,
      "es HTML": (r) =>
        String(r.headers["Content-Type"] || "").includes("text/html"),
    },
    kind
  );

  if (kind.client === "human") {
    if (kind.service === "A") {
      dur_A_human.add(res.timings.duration);
      fail_A_human.add(!ok);
      req_A_human.add(1);
    } else if (kind.service === "B") {
      dur_B_human.add(res.timings.duration);
      fail_B_human.add(!ok);
      req_B_human.add(1);
    } else if (kind.service === "C") {
      dur_C_human.add(res.timings.duration);
      fail_C_human.add(!ok);
      req_C_human.add(1);
    } else if (kind.service === "D") {
      dur_D_human.add(res.timings.duration);
      fail_D_human.add(!ok);
      req_D_human.add(1);
    }
  } else {
    if (kind.service === "A") {
      dur_A_bot.add(res.timings.duration);
      fail_A_bot.add(!ok);
      req_A_bot.add(1);
    } else if (kind.service === "B") {
      dur_B_bot.add(res.timings.duration);
      fail_B_bot.add(!ok);
      req_B_bot.add(1);
    } else if (kind.service === "C") {
      dur_C_bot.add(res.timings.duration);
      fail_C_bot.add(!ok);
      req_C_bot.add(1);
    } else if (kind.service === "D") {
      dur_D_bot.add(res.timings.duration);
      fail_D_bot.add(!ok);
      req_D_bot.add(1);
    }
  }
  return res;
}

/* ====== SCENARIOS FUNCS ====== */
export function scenario_A_human() {
  hit(url(SERVICE_A_BASE, A_PATHS), { service: "A", client: "human" });
}
export function scenario_B_human() {
  hit(url(SERVICE_B_BASE, B_PATHS), { service: "B", client: "human" });
}
export function scenario_C_human() {
  hit(url(SERVICE_C_BASE, C_PATHS), { service: "C", client: "human" });
}
export function scenario_D_human() {
  hit(url(SERVICE_D_BASE, D_PATHS), { service: "D", client: "human" });
}
export function scenario_A_bot() {
  hit(url(SERVICE_A_BASE, A_PATHS), { service: "A", client: "bot" });
}
export function scenario_B_bot() {
  hit(url(SERVICE_B_BASE, B_PATHS), { service: "B", client: "bot" });
}
export function scenario_C_bot() {
  hit(url(SERVICE_C_BASE, C_PATHS), { service: "C", client: "bot" });
}
export function scenario_D_bot() {
  hit(url(SERVICE_D_BASE, D_PATHS), { service: "D", client: "bot" });
}

/* ====== SUMMARY ====== */
function v(m, k) {
  return m && m.values && m.values[k] !== undefined ? m.values[k] : null;
}
function n(m, k) {
  const x = v(m, k);
  return x === null ? "-" : x.toFixed(2);
}
function getMetric(M, name) {
  return M[name] || { values: {} };
}

function buildRow(
  M,
  title,
  aKey,
  bKey,
  cKey,
  dKey,
  aFail,
  bFail,
  cFail,
  dFail,
  aReq,
  bReq,
  cReq,
  dReq
) {
  const A = {
    avg: n(getMetric(M, aKey), "avg"),
    p50: n(getMetric(M, aKey), "med"),
    p90: n(getMetric(M, aKey), "p(90)"),
    p95: n(getMetric(M, aKey), "p(95)"),
    p99: n(getMetric(M, aKey), "p(99)"),
    min: n(getMetric(M, aKey), "min"),
    max: n(getMetric(M, aKey), "max"),
    fail: n(getMetric(M, aFail), "rate", 4),
    req: n(getMetric(M, aReq), "count", 0),
  };
  const B = {
    avg: n(getMetric(M, bKey), "avg"),
    p50: n(getMetric(M, bKey), "med"),
    p90: n(getMetric(M, bKey), "p(90)"),
    p95: n(getMetric(M, bKey), "p(95)"),
    p99: n(getMetric(M, bKey), "p(99)"),
    min: n(getMetric(M, bKey), "min"),
    max: n(getMetric(M, bKey), "max"),
    fail: n(getMetric(M, bFail), "rate", 4),
    req: n(getMetric(M, bReq), "count", 0),
  };
  const C = {
    avg: n(getMetric(M, cKey), "avg"),
    p50: n(getMetric(M, cKey), "med"),
    p90: n(getMetric(M, cKey), "p(90)"),
    p95: n(getMetric(M, cKey), "p(95)"),
    p99: n(getMetric(M, cKey), "p(99)"),
    min: n(getMetric(M, cKey), "min"),
    max: n(getMetric(M, cKey), "max"),
    fail: n(getMetric(M, cFail), "rate", 4),
    req: n(getMetric(M, cReq), "count", 0),
  };
  const D = {
    avg: n(getMetric(M, dKey), "avg"),
    p50: n(getMetric(M, dKey), "med"),
    p90: n(getMetric(M, dKey), "p(90)"),
    p95: n(getMetric(M, dKey), "p(95)"),
    p99: n(getMetric(M, dKey), "p(99)"),
    min: n(getMetric(M, dKey), "min"),
    max: n(getMetric(M, dKey), "max"),
    fail: n(getMetric(M, dFail), "rate", 4),
    req: n(getMetric(M, dReq), "count", 0),
  };
  return { title, A, B, C, D };
}

function colorCell(values, lowerIsBetter = true) {
  const nums = values.map((x) => parseFloat(x));
  const valid = nums.map((x, i) => ({ v: x, i })).filter((o) => !isNaN(o.v));
  if (!valid.length) return values.map(() => "");
  const bestVal = lowerIsBetter
    ? Math.min(...valid.map((o) => o.v))
    : Math.max(...valid.map((o) => o.v));
  const worstVal = lowerIsBetter
    ? Math.max(...valid.map((o) => o.v))
    : Math.min(...valid.map((o) => o.v));
  return nums.map((x) =>
    isNaN(x) ? "" : x === bestVal ? "best" : x === worstVal ? "worst" : ""
  );
}

export function handleSummary(data) {
  const M = data.metrics;

  const sections = [
    buildRow(
      M,
      "Human",
      "dur_A_human",
      "dur_B_human",
      "dur_C_human",
      "dur_D_human",
      "fail_A_human",
      "fail_B_human",
      "fail_C_human",
      "fail_D_human",
      "req_A_human",
      "req_B_human",
      "req_C_human",
      "req_D_human"
    ),
    buildRow(
      M,
      "Bot",
      "dur_A_bot",
      "dur_B_bot",
      "dur_C_bot",
      "dur_D_bot",
      "fail_A_bot",
      "fail_B_bot",
      "fail_C_bot",
      "fail_D_bot",
      "req_A_bot",
      "req_B_bot",
      "req_C_bot",
      "req_D_bot"
    ),
  ];

  const NAMES = [
    "Express Prerender",
    "TS Express v4",
    "TS Express v5",
    "Bun.sh",
  ];

  const tablesHtml = sections
    .map((r) => {
      const latMetrics = ["avg", "p50", "p90", "p95", "p99", "min", "max"];
      const frClasses = colorCell(
        [r.A.fail, r.B.fail, r.C.fail, r.D.fail],
        true
      );
      const reqClasses = colorCell([r.A.req, r.B.req, r.C.req, r.D.req], false);
      const rows = latMetrics
        .map((m) => {
          const classes = colorCell([r.A[m], r.B[m], r.C[m], r.D[m]], true);
          return `<tr>
            <td>${m}</td>
            <td class="${classes[0]}">${r.A[m]}</td>
            <td class="${classes[1]}">${r.B[m]}</td>
            <td class="${classes[2]}">${r.C[m]}</td>
            <td class="${classes[3]}">${r.D[m]}</td>
          </tr>`;
        })
        .join("");
      return `
<h2>${r.title}</h2>
<table class="pure-table pure-table-striped">
  <thead><tr><th>metric</th><th>${NAMES[0]}</th><th>${NAMES[1]}</th><th>${NAMES[2]}</th><th>${NAMES[3]}</th></tr></thead>
  <tbody>
    ${rows}
    <tr><td>fail rate</td><td class="${frClasses[0]}">${r.A.fail}</td><td class="${frClasses[1]}">${r.B.fail}</td><td class="${frClasses[2]}">${r.C.fail}</td><td class="${frClasses[3]}">${r.D.fail}</td></tr>
    <tr><td>total req</td><td class="${reqClasses[0]}">${r.A.req}</td><td class="${reqClasses[1]}">${r.B.req}</td><td class="${reqClasses[2]}">${r.C.req}</td><td class="${reqClasses[3]}">${r.D.req}</td></tr>
  </tbody>
</table>`;
    })
    .join("");

  const chartData = {
    labels: NAMES,
    human: {
      avg: [
        parseFloat(v(M["dur_A_human"], "avg") || 0),
        parseFloat(v(M["dur_B_human"], "avg") || 0),
        parseFloat(v(M["dur_C_human"], "avg") || 0),
        parseFloat(v(M["dur_D_human"], "avg") || 0),
      ],
      p50: [
        parseFloat(v(M["dur_A_human"], "med") || 0),
        parseFloat(v(M["dur_B_human"], "med") || 0),
        parseFloat(v(M["dur_C_human"], "med") || 0),
        parseFloat(v(M["dur_D_human"], "med") || 0),
      ],
      p95: [
        parseFloat(v(M["dur_A_human"], "p(95)") || 0),
        parseFloat(v(M["dur_B_human"], "p(95)") || 0),
        parseFloat(v(M["dur_C_human"], "p(95)") || 0),
        parseFloat(v(M["dur_D_human"], "p(95)") || 0),
      ],
      fail: [
        parseFloat(v(M["fail_A_human"], "rate") || 0) * 100,
        parseFloat(v(M["fail_B_human"], "rate") || 0) * 100,
        parseFloat(v(M["fail_C_human"], "rate") || 0) * 100,
        parseFloat(v(M["fail_D_human"], "rate") || 0) * 100,
      ],
      req: [
        parseFloat(v(M["req_A_human"], "count") || 0),
        parseFloat(v(M["req_B_human"], "count") || 0),
        parseFloat(v(M["req_C_human"], "count") || 0),
        parseFloat(v(M["req_D_human"], "count") || 0),
      ],
    },
    bot: {
      avg: [
        parseFloat(v(M["dur_A_bot"], "avg") || 0),
        parseFloat(v(M["dur_B_bot"], "avg") || 0),
        parseFloat(v(M["dur_C_bot"], "avg") || 0),
        parseFloat(v(M["dur_D_bot"], "avg") || 0),
      ],
      p50: [
        parseFloat(v(M["dur_A_bot"], "med") || 0),
        parseFloat(v(M["dur_B_bot"], "med") || 0),
        parseFloat(v(M["dur_C_bot"], "med") || 0),
        parseFloat(v(M["dur_D_bot"], "med") || 0),
      ],
      p95: [
        parseFloat(v(M["dur_A_bot"], "p(95)") || 0),
        parseFloat(v(M["dur_B_bot"], "p(95)") || 0),
        parseFloat(v(M["dur_C_bot"], "p(95)") || 0),
        parseFloat(v(M["dur_D_bot"], "p(95)") || 0),
      ],
      fail: [
        parseFloat(v(M["fail_A_bot"], "rate") || 0) * 100,
        parseFloat(v(M["fail_B_bot"], "rate") || 0) * 100,
        parseFloat(v(M["fail_C_bot"], "rate") || 0) * 100,
        parseFloat(v(M["fail_D_bot"], "rate") || 0) * 100,
      ],
      req: [
        parseFloat(v(M["req_A_bot"], "count") || 0),
        parseFloat(v(M["req_B_bot"], "count") || 0),
        parseFloat(v(M["req_C_bot"], "count") || 0),
        parseFloat(v(M["req_D_bot"], "count") || 0),
      ],
    },
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Express Prerender vs TS Express v4 vs TS Express v5 vs Bun.sh</title>
<link rel="stylesheet" href="https://unpkg.com/purecss@2.0.3/build/pure-min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
body{margin:1rem;font-family:sans-serif}
h1,h2{margin-bottom:0.3rem}
table{width:100%;margin:1rem 0}
th,td{text-align:center}
.best{background:#c8e6c9;font-weight:600}
.worst{background:#ffcdd2;font-weight:600}
.grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:900px){.grid{grid-template-columns:1fr 1fr}}
.card{padding:12px;border:1px solid #e0e0e0;border-radius:8px}
canvas{max-height:360px}
</style>
</head>
<body>
<h1>Express Prerender vs TS Express v4 vs TS Express v5 vs Bun.sh</h1>

<div class="grid">
  <div class="card"><h2>Human – Latency (avg, p50, p95)</h2><canvas id="chartHumanLatency"></canvas></div>
  <div class="card"><h2>Bot – Latency (avg, p50, p95)</h2><canvas id="chartBotLatency"></canvas></div>
  <div class="card"><h2>Human – Fail rate (%)</h2><canvas id="chartHumanFail"></canvas></div>
  <div class="card"><h2>Bot – Fail rate (%)</h2><canvas id="chartBotFail"></canvas></div>
  <div class="card"><h2>Human – Total requests</h2><canvas id="chartHumanReq"></canvas></div>
  <div class="card"><h2>Bot – Total requests</h2><canvas id="chartBotReq"></canvas></div>
</div>

${tablesHtml}

<script>
const labels = ${JSON.stringify(chartData.labels)};
const human = ${JSON.stringify(chartData.human)};
const bot = ${JSON.stringify(chartData.bot)};

function mkBar(id, ds) {
  new Chart(document.getElementById(id), {
    type: 'bar',
    data: { labels, datasets: ds },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
  });
}

mkBar('chartHumanLatency', [
  { label: 'avg (ms)', data: human.avg },
  { label: 'p50 (ms)', data: human.p50 },
  { label: 'p95 (ms)', data: human.p95 },
]);
mkBar('chartBotLatency', [
  { label: 'avg (ms)', data: bot.avg },
  { label: 'p50 (ms)', data: bot.p50 },
  { label: 'p95 (ms)', data: bot.p95 },
]);
mkBar('chartHumanFail', [{ label: 'fail rate (%)', data: human.fail }]);
mkBar('chartBotFail', [{ label: 'fail rate (%)', data: bot.fail }]);
mkBar('chartHumanReq', [{ label: 'total req', data: human.req }]);
mkBar('chartBotReq', [{ label: 'total req', data: bot.req }]);
</script>

</body>
</html>`;

  return { "reports/report.html": html };
}
