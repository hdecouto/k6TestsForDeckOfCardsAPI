# Deck of Cards API – Performance Test Plan (k6 + TypeScript)

## 1. Goal and Scope

### Goal

Evaluate the performance characteristics of the Deck of Cards API under representative traffic patterns, focusing on:

- **Error rate**
- **Throughput/capacity**
- **Basic stability under sustained load**

### Scope

This work sample is intentionally time-boxed and representative rather than exhaustive.

#### In Scope

- Core API workflows (shuffle → draw)
- Load patterns: baseline, stress, short soak
- Metrics/thresholds and clear pass/fail signals (k6 thresholds)

#### Out of Scope

- Production-like distributed load generation
- Full endurance testing (hours)
- Deep profiling / server-side instrumentation

#### System Under Test

- **Deck of Cards API** (local run)
- [GitHub Repository](https://github.com)

---

## 2. Test Approach

### Method

Risk-based, workflow-oriented performance testing:

1. Identify core user/API workflows
2. Establish a baseline with stable load
3. Increase load to observe saturation and failure modes
4. Run a short soak to look for degradation over time

### Why These Metrics

**Primary metrics:** request rate, failure rate, and duration.

*Source: [Grafana Labs](https://grafana.com)*

---

## 3. Key API Workflows and Endpoints

Primary workflow used in scenarios:

1. **Create + shuffle a new deck**
   - `/api/deck/new/shuffle/`

2. **Draw cards from the deck**
   - `/api/deck/{deck_id}/draw/?count=N`

3. **Optional: reshuffle existing deck**
   - `/api/deck/{deck_id}/shuffle/`

*Source: [deckofcardsapi.com](https://deckofcardsapi.com)*

---

## 4. Performance Scenarios (Scenario Matrix)

| Scenario | Purpose | Pattern | Example Load Shape | Success Criteria |
|----------|---------|---------|-------------------|------------------|
| **Smoke (perf sanity)** | Validate scripts + basic latency/error | Very low load | 1–2 VUs, 1–2 min | 0 unexpected failures; latency reasonable |
| **Baseline (steady state)** | Measure stable performance under expected traffic | Constant arrival/steady VUs | e.g., 10–25 VUs for 5–10 min | Thresholds met |
| **Stress / ramp** | Find saturation point and how it fails | Step or ramp-up | e.g., 10→50→100 VUs | Identify where error/latency inflects |
| **Short soak** | Detect degradation (GC, leaks, resource exhaustion) | Sustained | e.g., baseline load for 10–15 min | No upward latency trend; failures stay bounded |

**Notes:**

"Expected traffic" is unknown, so baseline load is chosen to be moderate and repeatable. With more information I can calibrate the baseline to product expectations.

---

## 5. Measurement and Evaluation

### Metrics to Track

- **Error rate:** `http_req_failed`
- **Latency:** `http_req_duration` (report avg/med and percentiles like p95/p99)
- **Throughput:** `http_reqs` and/or iterations

Start with request, error, and duration metrics.

### Percentiles

Latency (p95) is used because it reflects "most users" experience and catches long-tail slow requests.

*Source: [Better Stack](https://betterstack.com)*

---

## 6. Pass/Fail Thresholds (k6)

k6 supports thresholds as first-class pass/fail checks (including `http_req_failed` and p95 latency on `http_req_duration`).

*Source: [Grafana Labs](https://grafana.com)*

### Suggested Default Thresholds

(Tune during interview if needed)

- `http_req_failed`: rate < 0.01 (<1%)
- `http_req_duration`: p(95) < 500ms (or 750ms if local dev env is slower)
- **Optional:** `http_req_duration`: p(99) < 1000ms

**Rationale:** Conservative, easy-to-explain defaults for a small API; thresholds are intended to be adjusted to SLOs when business targets are known.

---

## 7. Test Data and Realism Assumptions

- Each VU maintains its own `deck_id` to avoid cross-user interference (closer to real usage)
- **Draw sizes:** Mix of count=1, count=5, count=10 to emulate typical usage patterns
- **Think time:** Small randomized sleep between operations to avoid unrealistically tight loops
