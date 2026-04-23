"use client";

/**
 * Staged migration control panel: relatedTo (single) → relatedTopics (array).
 *
 * Three explicit clicks:
 *   1. Count — how many wheels still have legacy `relatedTo`.
 *   2. Migrate — copy into `relatedTopics` and $unset `relatedTo`.
 *   3. Verify — confirm zero legacy docs left and no anomalous entries.
 *
 * Backend: POST /api/admin/migrate-related-topics  { action: "<stage>" }
 *
 * Mirrors the UX of /dashboard/admin/migrate-lowercase-tags.
 */

import { useState } from "react";

const STAGES = [
  {
    key: "count",
    label: "1. Count legacy relatedTo docs",
    help:
      "Scans every wheel and reports how many still carry the legacy `relatedTo` field, plus a preview of what would happen (copy / skip-duplicate / unset-only). No writes.",
    danger: false,
  },
  {
    key: "migrate",
    label: "2. Run migration (destructive)",
    help:
      "For each wheel with legacy relatedTo: $push into `relatedTopics` (unless already there) and $unset `relatedTo`. Idempotent — safe to re-run.",
    danger: true,
    requiresConfirm: true,
  },
  {
    key: "verify",
    label: "3. Verify",
    help:
      "Confirms zero docs still have `relatedTo` and that no `relatedTopics` entries are missing `type` or `id`.",
    danger: false,
  },
];

async function run(action) {
  const res = await fetch("/api/admin/migrate-related-topics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export default function MigrateRelatedTopicsPage() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);

  async function handleRun(stage) {
    if (stage.requiresConfirm) {
      const ok = window.confirm(
        `This will modify production data.\n\nStage: ${stage.label}\n\nProceed?`
      );
      if (!ok) return;
    }
    setRunning(stage.key);
    const startedAt = new Date().toISOString();
    try {
      const data = await run(stage.key);
      setResults((prev) => ({
        ...prev,
        [stage.key]: { startedAt, finishedAt: new Date().toISOString(), data },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [stage.key]: {
          startedAt,
          finishedAt: new Date().toISOString(),
          error: err.message,
        },
      }));
    } finally {
      setRunning(null);
    }
  }

  // Stage N+1 unlocks once stage N returns success.
  // Special case: if Stage 1 reports 0 legacy docs, allow jumping directly
  // to Verify (Migrate is a no-op).
  function isEnabled(stage, idx) {
    if (running) return false;
    if (idx === 0) return true;

    const prev = STAGES[idx - 1];
    const prevResult = results[prev.key];
    const prevOk = !!(prevResult && prevResult.data && !prevResult.error);

    if (stage.key === "verify") {
      const count = results["count"];
      const nothingToDo =
        count && count.data && !count.error && count.data.withLegacy === 0;
      if (nothingToDo) return true;
    }

    return prevOk;
  }

  function isStageSkippable(stage) {
    if (stage.key !== "migrate") return false;
    const count = results["count"];
    return !!(
      count &&
      count.data &&
      !count.error &&
      count.data.withLegacy === 0
    );
  }

  const countResult = results["count"]?.data;
  const nothingToDo = countResult && countResult.withLegacy === 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-2xl font-bold">
          relatedTo → relatedTopics Migration
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Run each stage in order. Stages are gated — a later stage only
          unlocks after the previous one returns success.
        </p>
      </header>

      <ol className="space-y-4">
        {STAGES.map((stage, idx) => {
          const result = results[stage.key];
          const skippable = isStageSkippable(stage);
          const enabled = isEnabled(stage, idx) && !skippable;
          const isRunning = running === stage.key;

          const showSkipNotice = stage.key === "migrate" && nothingToDo;

          return (
            <li
              key={stage.key}
              className={`rounded-lg border p-4 ${
                stage.danger
                  ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold">{stage.label}</h2>
                  <p className="text-sm text-gray-500 mt-1">{stage.help}</p>
                  {showSkipNotice && (
                    <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                      ✓ Nothing to migrate — Step 3 (Verify) is unlocked.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRun(stage)}
                  disabled={!enabled}
                  className={`shrink-0 px-4 py-2 rounded-md text-sm font-medium ${
                    stage.danger
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isRunning
                    ? "Running…"
                    : skippable
                    ? "Skipped"
                    : result
                    ? "Re-run"
                    : "Run"}
                </button>
              </div>

              {result && (
                <div className="mt-4 text-xs">
                  <div className="text-gray-500 mb-2">
                    Started: {result.startedAt}
                    {" · "}
                    Finished: {result.finishedAt}
                  </div>
                  {result.error ? (
                    <pre className="bg-red-900/10 text-red-700 dark:text-red-300 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      Error: {result.error}
                    </pre>
                  ) : (
                    <StageResult stageKey={stage.key} data={result.data} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageResult({ stageKey, data }) {
  if (stageKey === "count") {
    const ok = data.withLegacy === 0;
    return (
      <div
        className={`p-3 rounded ${
          ok
            ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
            : "bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300"
        }`}
      >
        <div>
          Total wheels: <strong>{data.totalWheels}</strong>
        </div>
        <div>
          With legacy <code>relatedTo</code>:{" "}
          <strong>{data.withLegacy}</strong>
        </div>
        <div className="mt-2">
          Would copy: <strong>{data.wouldCopy}</strong>
          {" · "}
          Already present: <strong>{data.alreadyPresent}</strong>
          {" · "}
          Empty/invalid (unset only):{" "}
          <strong>{data.emptyOrInvalid}</strong>
        </div>
        {data.samples?.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">
              Show first {data.samples.length} samples
            </summary>
            <pre className="mt-2 bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
              {JSON.stringify(data.samples, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (stageKey === "migrate") {
    const ok = data.failures?.length === 0;
    return (
      <div
        className={`p-3 rounded ${
          ok
            ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
            : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
        }`}
      >
        <div>
          Scanned: <strong>{data.scanned}</strong>
        </div>
        <div>
          Copied into <code>relatedTopics</code>:{" "}
          <strong>{data.copied}</strong>
          {" · "}
          Already had entry: <strong>{data.alreadyHad}</strong>
          {" · "}
          Empty/invalid (unset only): <strong>{data.emptyUnset}</strong>
        </div>
        <div>
          Failures: <strong>{data.failures?.length || 0}</strong>
          {" · "}
          Duration: {data.durationMs} ms
        </div>
        {data.failures?.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">
              Show failures ({data.failures.length})
            </summary>
            <pre className="mt-2 bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
              {JSON.stringify(data.failures, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (stageKey === "verify") {
    return (
      <div
        className={`p-3 rounded ${
          data.ready
            ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
            : "bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300"
        }`}
      >
        <div className="font-medium mb-1">
          {data.ready
            ? "✓ Migration complete — no legacy docs and no anomalies."
            : "⚠ Migration not fully clean — see details below."}
        </div>
        <div>
          Total wheels: <strong>{data.totalWheels}</strong>
        </div>
        <div>
          Remaining legacy <code>relatedTo</code>:{" "}
          <strong>{data.remainingLegacy}</strong>
        </div>
        <div>
          Wheels with populated <code>relatedTopics</code>:{" "}
          <strong>{data.withRelatedTopics}</strong>
        </div>
        <div>
          Anomalous entries: <strong>{data.anomalousCount}</strong>
        </div>
        {data.anomalousSamples?.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">
              Show anomalies ({data.anomalousSamples.length})
            </summary>
            <pre className="mt-2 bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
              {JSON.stringify(data.anomalousSamples, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <pre className="bg-black/5 dark:bg-white/5 p-3 rounded overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
