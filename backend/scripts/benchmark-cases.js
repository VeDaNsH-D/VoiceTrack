/* eslint-disable no-console */
const { performance } = require("perf_hooks");

const BASE_URL = process.env.BASE_URL || "http://localhost:5002";

function randomPhone() {
  const suffix = Math.floor(Math.random() * 900000 + 100000);
  return `+91999${suffix}`;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarizeTimings(timings) {
  const sorted = [...timings].sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + v, 0);
  return {
    count: sorted.length,
    avgMs: sorted.length ? total / sorted.length : 0,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    maxMs: sorted[sorted.length - 1] || 0,
  };
}

async function callJson(path, body) {
  const start = performance.now();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const elapsedMs = performance.now() - start;
  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    status: response.status,
    elapsedMs,
    data: json,
  };
}

async function signupForBenchmark() {
  const phone = randomPhone();
  const payload = {
    name: "Bench User",
    phone,
    password: "secret1",
  };

  const result = await callJson("/api/auth/signup", payload);
  if (result.status !== 201 || !result.data?.user?._id) {
    throw new Error(`Benchmark signup failed: ${result.status} ${JSON.stringify(result.data)}`);
  }

  return {
    userId: String(result.data.user._id),
    phone,
  };
}

const transactionCases = [
  {
    label: "simple_english_sale",
    text: "Sold 10 tea at 20 rupees",
    expectClarification: false,
    expectSales: true,
  },
  {
    label: "simple_hinglish_sale_expense",
    text: "aaj 8 chai 20 ka becha aur 100 transport kharcha",
    expectClarification: false,
    expectSales: true,
  },
  {
    label: "hindi_script",
    text: "आज 5 समोसा 15 का बेचा और 40 रुपये दूध खरीदा",
    expectClarification: false,
    expectSales: true,
  },
  {
    label: "ambiguous_conflicting_units",
    text: "aaj 4 gaadi becha 80000 hazar aur ek ek laptop kharida 50000 ka",
    expectClarification: true,
    expectSales: false,
  },
  {
    label: "noise_fillers",
    text: "uh matlab hmm aaj tea becha",
    expectClarification: true,
    expectSales: false,
  },
  {
    label: "expense_only",
    text: "Paid rent 500 and transport 200",
    expectClarification: false,
    expectSales: false,
  },
  {
    label: "long_mixed_sentence",
    text: "Morning me 12 chai 15 ke beche, dopahar me 4 coffee 30 ke, shaam ko gas cylinder 900 ka liya",
    expectClarification: false,
    expectSales: true,
  },
  {
    label: "empty_like",
    text: "   ",
    expectBadRequest: true,
  },
];

const assistantCases = [
  {
    label: "assistant_total_sales_today",
    message: "aaj kitni ki bikri hui",
    expectClarification: false,
  },
  {
    label: "assistant_top_product",
    message: "sabse zyada kya bika",
    expectClarification: false,
  },
  {
    label: "assistant_sales_count",
    message: "is week kitne transactions hue",
    expectClarification: false,
  },
  {
    label: "assistant_unknown_prompt",
    message: "bhai future ka prediction do",
    expectClarification: true,
  },
  {
    label: "assistant_empty",
    message: "",
    expectBadRequest: true,
  },
];

async function runTransactions(userId) {
  const timings = [];
  const failures = [];

  for (const testCase of transactionCases) {
    const result = await callJson("/api/transactions/process-text", {
      text: testCase.text,
      userId,
    });

    if (!testCase.expectBadRequest) {
      timings.push(result.elapsedMs);
    }

    if (testCase.expectBadRequest) {
      if (result.status !== 400) {
        failures.push({
          case: testCase.label,
          reason: `expected 400, got ${result.status}`,
          data: result.data,
        });
      }
      continue;
    }

    if (result.status !== 200) {
      failures.push({
        case: testCase.label,
        reason: `expected 200, got ${result.status}`,
        data: result.data,
      });
      continue;
    }

    const needsClarification = Boolean(result.data?.meta?.needs_clarification);
    const salesCount = Array.isArray(result.data?.sales) ? result.data.sales.length : 0;

    if (needsClarification !== testCase.expectClarification) {
      failures.push({
        case: testCase.label,
        reason: `clarification mismatch expected=${testCase.expectClarification} got=${needsClarification}`,
        data: result.data,
      });
    }

    if (testCase.expectSales && salesCount < 1) {
      failures.push({
        case: testCase.label,
        reason: "expected at least 1 sale item",
        data: result.data,
      });
    }
  }

  return { timings, failures };
}

async function runAssistant(userId) {
  const timings = [];
  const failures = [];

  for (const testCase of assistantCases) {
    const result = await callJson("/api/assistant/query", {
      userId,
      message: testCase.message,
    });

    if (!testCase.expectBadRequest) {
      timings.push(result.elapsedMs);
    }

    if (testCase.expectBadRequest) {
      if (result.status !== 400) {
        failures.push({
          case: testCase.label,
          reason: `expected 400, got ${result.status}`,
          data: result.data,
        });
      }
      continue;
    }

    if (result.status !== 200) {
      failures.push({
        case: testCase.label,
        reason: `expected 200, got ${result.status}`,
        data: result.data,
      });
      continue;
    }

    const needsClarification = Boolean(result.data?.needsClarification);

    if (needsClarification !== testCase.expectClarification) {
      failures.push({
        case: testCase.label,
        reason: `clarification mismatch expected=${testCase.expectClarification} got=${needsClarification}`,
        data: result.data,
      });
    }

    const reply = String(result.data?.reply || "").trim();
    if (!reply) {
      failures.push({
        case: testCase.label,
        reason: "assistant reply is empty",
        data: result.data,
      });
    }
  }

  return { timings, failures };
}

async function main() {
  console.log(`Running benchmark against ${BASE_URL}`);

  const health = await fetch(`${BASE_URL}/health`).then((r) => r.json()).catch(() => null);
  if (!health || health.status !== "ok") {
    throw new Error("Backend is not healthy. Start backend before running benchmark.");
  }

  const { userId, phone } = await signupForBenchmark();
  console.log(`Created benchmark user ${userId} (${phone})`);

  const transaction = await runTransactions(userId);
  const assistant = await runAssistant(userId);

  const transactionSummary = summarizeTimings(transaction.timings);
  const assistantSummary = summarizeTimings(assistant.timings);

  console.log("\n=== Benchmark Summary ===");
  console.log("Transactions:", transactionSummary);
  console.log("Assistant:", assistantSummary);

  const allFailures = [...transaction.failures, ...assistant.failures];

  if (allFailures.length) {
    console.log("\n=== Failures ===");
    for (const failure of allFailures) {
      console.log(`- ${failure.case}: ${failure.reason}`);
    }
    process.exit(1);
  }

  console.log("\nAll benchmark cases passed.");
}

main().catch((error) => {
  console.error("Benchmark run failed:", error.message);
  process.exit(1);
});
