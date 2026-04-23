"use client";

/**
 * Staged migration control panel.
 *
 * Flow (each stage is an explicit user click — nothing chains automatically):
 *
 *   1. Check TopicPage duplicates
 *      → if any found, STOP and show them. User must click Dedupe.
 *   2. Dedupe TopicPages (only enabled once Step 1 surfaced dupes; otherwise skipped)
 *   3. Dry-run: count uppercase wheel tags
 *   4. Backfill wheel tags to lowercase
 *   5. Verify: zero uppercase, zero dupes → READY TO DEPLOY new code
 *
 * Backend: POST /api/admin/migrate-lowercase-tags  { action: "<stage>" }
 */

import { useState } from "react";

const STAGES = [
  {
    key: "check-duplicates",
    label: "1. Check TopicPage duplicates",
    help:
      "Aborts migration if duplicates exist. The new { type, relatedId } unique index would fail to build.",
    danger: false,
  },
  {
    key: "dedupe-topicpages",
    label: "2. Dedupe TopicPages (destructive)",
    help:
      "Keeps the OLDEST document per (type, relatedId) and deletes the rest. Only run if Step 1 found duplicates.",
    danger: true,
    requiresConfirm: true,
  },
  {
    key: "dry-run-wheels",
    label: "3. Dry-run wheel tags",
    help: "Reports how many wheels have at least one uppercase character in their tags array. No writes.",
    danger: false,
  },
  {
    key: "backfill-wheels",
    label: "4. Backfill wheel tags to lowercase (destructive)",
    help:
      "Lowercases + trims every tag on every wheel. Safe against live code because existing queries use case-insensitive regex.",
    danger: true,
    requiresConfirm: true,
  },
  {
    key: "verify",
    label: "5. Verify ready-to-deploy",
    help: "Confirms zero uppercase tags and zero TopicPage duplicates remain.",
    danger: false,
  },
];

async function run(action) {
  const res = await fetch("/api/admin/migrate-lowercase-tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export default function MigrateTagsPage() {
  // results[stageKey] = { startedAt, finishedAt, data | error }
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);

  async function handleRun(stage) {
    if (stage.requiresConfirm) {
      const ok = window.confirm(
        `This is DESTRUCTIVE and will modify production data.\n\nStage: ${stage.label}\n\nProceed?`
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
        [stage.key]: { startedAt, finishedAt: new Date().toISOString(), error: err.message },
      }));
    } finally {
      setRunning(null);
    }
  }

  // Guard rails: stage N+1 is only enabled once stage N ran successfully,
  // with one explicit exception — if Step 1 (check-duplicates) found zero
  // duplicates, Step 2 (dedupe) is unnecessary and we unlock Step 3 directly
  // off Step 1's success.
  function isEnabled(stage, idx) {
    if (running) return false;
    if (idx === 0) return true;

    const prevStage = STAGES[idx - 1];
    const prevResult = results[prevStage.key];
    const prevOk = !!(prevResult && prevResult.data && !prevResult.error);

    // Special case: Step 3 can unlock off Step 1 when Step 2 is unnecessary.
    if (stage.key === "dry-run-wheels") {
      const check = results["check-duplicates"];
      const noDupes =
        check && check.data && !check.error && check.data.duplicateGroups === 0;
      if (noDupes) return true;
    }

    return prevOk;
  }

  // Step 2 itself should be disabled when Step 1 found no duplicates —
  // there is nothing to dedupe and running it is a confusing no-op.
  function isStageSkippable(stage) {
    if (stage.key !== "dedupe-topicpages") return false;
    const check = results["check-duplicates"];
    return !!(
      check &&
      check.data &&
      !check.error &&
      check.data.duplicateGroups === 0
    );
  }

  const checkResult = results["check-duplicates"]?.data;
  const dedupeUnnecessary =
    checkResult && checkResult.duplicateGroups === 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-2xl font-bold">Lowercase Tags Migration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Run each stage in order. Stages are gated — a later stage is only
          unlocked after the previous one returns success.
        </p>
      </header>

      <ol className="space-y-4">
        {STAGES.map((stage, idx) => {
          const result = results[stage.key];
          const skippable = isStageSkippable(stage);
          const enabled = isEnabled(stage, idx) && !skippable;
          const isRunning = running === stage.key;

          // Auto-skip the dedupe stage if Step 1 found zero dupes.
          const showSkipNotice =
            stage.key === "dedupe-topicpages" && dedupeUnnecessary;

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
                      ✓ No duplicates found — this stage is skipped. Step 3 is
                      now unlocked.
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

// Per-stage pretty-printer so results are scannable at a glance instead of
// making the admin read raw JSON every time.
function StageResult({ stageKey, data }) {
  if (stageKey === "check-duplicates") {
    const ok = data.duplicateGroups === 0;
    return (
      <div
        className={`p-3 rounded ${
          ok
            ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
            : "bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300"
        }`}
      >
        <div className="font-medium mb-1">
          {ok
            ? `✓ Scanned ${data.scannedDocs} TopicPage docs — no duplicates. Safe to proceed to Step 3.`
            : `⚠ Scanned ${data.scannedDocs} docs — found ${data.duplicateGroups} duplicate groups (${data.totalExtraDocs} extra docs to delete).`}
        </div>
        {!ok && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">
              Show first {data.samples.length} groups
            </summary>
            <pre className="mt-2 bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
              {JSON.stringify(data.samples, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (stageKey === "dedupe-topicpages") {
    return (
      <div className="p-3 rounded bg-gray-50 dark:bg-gray-900/40">
        {typeof data.totalBefore === "number" && (
          <div>
            TopicPages: <strong>{data.totalBefore}</strong> before →{" "}
            <strong>{data.totalAfter}</strong> after
          </div>
        )}
        <div>
          Groups processed: <strong>{data.groupsProcessed}</strong>
        </div>
        <div>
          Docs deleted: <strong>{data.docsDeleted}</strong>
        </div>
        {data.deletedIds?.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">
              Deleted IDs ({data.deletedIds.length})
            </summary>
            <pre className="mt-2 bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
              {data.deletedIds.join("\n")}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (stageKey === "dry-run-wheels") {
    const pct = data.totalWheels
      ? ((data.wheelsWithUppercase / data.totalWheels) * 100).toFixed(1)
      : "0";
    return (
      <div className="p-3 rounded bg-gray-50 dark:bg-gray-900/40">
        <div>
          Total wheels: <strong>{data.totalWheels}</strong>
        </div>
        <div>
          Wheels with uppercase tags:{" "}
          <strong>{data.wheelsWithUppercase}</strong> ({pct}%)
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs">
            Top {data.sampleUppercaseTags.length} uppercase tags
          </summary>
          <pre className="mt-2 bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
            {JSON.stringify(data.sampleUppercaseTags, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  if (stageKey === "backfill-wheels") {
    const ok = data.wheelsWithUppercaseAfter === 0;
    return (
      <div
        className={`p-3 rounded ${
          ok
            ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
            : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
        }`}
      >
        {typeof data.totalWheels === "number" && (
          <div>
            Total wheels scanned: <strong>{data.totalWheels}</strong>
          </div>
        )}
        <div>
          Matched: <strong>{data.matchedCount}</strong>
          {" · "}
          Modified: <strong>{data.modifiedCount}</strong>
        </div>
        <div>
          Uppercase before: <strong>{data.wheelsWithUppercaseBefore}</strong>
          {" · "}
          After: <strong>{data.wheelsWithUppercaseAfter}</strong>
        </div>
        <div>Duration: {data.durationMs} ms</div>
        {!ok && (
          <div className="mt-1">
            ⚠ Some uppercase tags remain — re-run or investigate.
          </div>
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
        <div className="font-medium">
          {data.ready
            ? "✓ READY TO DEPLOY — all checks pass."
            : "⚠ Not ready yet."}
        </div>
        {typeof data.totalWheelsScanned === "number" && (
          <div className="mt-1">
            Scanned: <strong>{data.totalWheelsScanned}</strong> wheels,{" "}
            <strong>{data.totalTopicPagesScanned}</strong> topicpages
          </div>
        )}
        <div className="mt-1">
          Uppercase wheels remaining:{" "}
          <strong>{data.uppercaseWheelsRemaining}</strong>
        </div>
        <div>
          TopicPage duplicate groups remaining:{" "}
          <strong>{data.topicPageDuplicateGroupsRemaining}</strong>
        </div>
      </div>
    );
  }

  return (
    <pre className="bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
