"use client";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Bulk wheel creator.
// Runs prompt -> validate -> create for each Excel row (or a single prompt)
// through a concurrency pool so N wheels build in roughly (N / poolSize) time
// instead of N * latency. Each row has its own status so one failure no
// longer aborts the batch, and failed rows can be retried individually.
// ---------------------------------------------------------------------------

const BANNED_WORDS = [
  "nsfw", "porn", "hentai", "nude", "sex", "violence", "drugs",
  "kill", "murder", "terrorist", "weapon", "abuse",
];

const CONCURRENCY = 4;

const cleanTag = (tag) =>
  tag.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase();

// Promise pool — runs `worker(item, index)` with at most `limit` in flight.
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runOne = async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { error: err };
      }
    }
  };
  const runners = Array.from({ length: Math.min(limit, items.length) }, runOne);
  await Promise.all(runners);
  return results;
}

// One row = one wheel to create. Status drives the UI table.
const newRow = (prompt, context) => ({
  prompt,
  context,
  status: "queued", // queued | generating | creating | done | error
  link: null,
  error: null,
});

async function processPrompt(prompt, context) {
  // Stage 1: generate JSON
  const res1 = await fetch("/api/createFromPrompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context }),
  });
  const data1 = await res1.json();
  if (!res1.ok || !data1?.json) {
    throw new Error(data1?.message || "Failed to generate JSON");
  }
  const generatedJson = data1.json;

  // Stage 2: client-side validation (server also validates)
  const topKeys = Object.keys(generatedJson);
  if (topKeys.length !== 1) throw new Error("JSON must have one top-level key");
  const wheelData = generatedJson[topKeys[0]];
  if (
    !wheelData.title ||
    !wheelData.description ||
    !Array.isArray(wheelData.tags) ||
    !Array.isArray(wheelData.content) ||
    !Array.isArray(wheelData.segments)
  ) {
    throw new Error("JSON missing required fields");
  }
  wheelData.tags = Array.from(
    new Set(
      (wheelData.tags || [])
        .map(cleanTag)
        .filter((tag) => tag.length > 0 && !BANNED_WORDS.includes(tag))
    )
  );

  // Stage 3: create wheel + page
  const res2 = await fetch("/api/createFromJSON", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonKey: topKeys[0], jsonData: wheelData }),
  });
  const data2 = await res2.json();
  if (res2.status !== 201) {
    throw new Error(data2?.message || "Failed to create wheel entry");
  }

  // Prefer the slug the server actually used (handles collision suffix like
  // "-2"). Falls back to the requested jsonKey.
  const slug = data2.slug || topKeys[0];
  return `/wheel/${slug}`;
}

export default function StagedWheelCreator() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [rows, setRows] = useState([]);
  const [useExcel, setUseExcel] = useState(false);
  const [running, setRunning] = useState(false);
  const [topMessage, setTopMessage] = useState("");

  // Ref-mirror so the pool worker can mutate without triggering a
  // setState-storm on every row (we batch via setRows below).
  const rowsRef = useRef([]);

  const summary = useMemo(() => {
    const done = rows.filter((r) => r.status === "done").length;
    const err = rows.filter((r) => r.status === "error").length;
    const active = rows.filter(
      (r) => r.status === "generating" || r.status === "creating"
    ).length;
    return { done, err, active, total: rows.length };
  }, [rows]);

  const patchRow = (i, patch) => {
    rowsRef.current[i] = { ...rowsRef.current[i], ...patch };
    setRows([...rowsRef.current]);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const xlsxRows = XLSX.utils.sheet_to_json(worksheet);

        const hasPrompts = xlsxRows.every((r) => "prompts" in r);
        const hasContext = xlsxRows.every((r) => "context" in r);
        if (!hasPrompts || !hasContext) {
          setTopMessage("❌ Excel must have 'prompts' and 'context' columns");
          return;
        }

        const built = xlsxRows.map((r) => newRow(r.prompts, r.context));
        rowsRef.current = built;
        setRows(built);
        setTopMessage(`Loaded ${built.length} rows. Click Start to begin.`);
      } catch (err) {
        setTopMessage("❌ Failed to parse Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const runBatch = async (indexes) => {
    // Mark selected rows as queued before we start.
    indexes.forEach((i) => patchRow(i, { status: "queued", error: null, link: null }));

    await runPool(indexes, CONCURRENCY, async (rowIndex) => {
      const row = rowsRef.current[rowIndex];
      patchRow(rowIndex, { status: "generating" });
      try {
        // We can't easily split generate vs create for a cleaner status since
        // processPrompt is one call; flip to "creating" just before the server
        // hop by intercepting inside. Keeping it simple: "generating" covers
        // both AI + DB write — fine for an operator view.
        const link = await processPrompt(row.prompt, row.context);
        patchRow(rowIndex, { status: "done", link });
      } catch (err) {
        patchRow(rowIndex, { status: "error", error: err?.message || String(err) });
      }
    });
  };

  const startProcess = async () => {
    setTopMessage("");
    setRunning(true);

    try {
      if (useExcel) {
        if (!rowsRef.current.length) {
          setTopMessage("Upload an Excel file first.");
          return;
        }
        const indexes = rowsRef.current.map((_, i) => i);
        await runBatch(indexes);
      } else {
        if (!prompt) return;
        const built = [newRow(prompt, context)];
        rowsRef.current = built;
        setRows(built);
        await runBatch([0]);
      }
    } finally {
      setRunning(false);
    }
  };

  const retryRow = async (i) => {
    if (running) return;
    setRunning(true);
    try {
      await runBatch([i]);
    } finally {
      setRunning(false);
    }
  };

  const retryAllFailed = async () => {
    if (running) return;
    const failed = rowsRef.current
      .map((r, i) => (r.status === "error" ? i : -1))
      .filter((i) => i >= 0);
    if (!failed.length) return;
    setRunning(true);
    try {
      await runBatch(failed);
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = () => {
    const header = "prompt,context,status,link,error";
    const body = rowsRef.current
      .map((r) => {
        const fields = [r.prompt, r.context, r.status, r.link || "", r.error || ""];
        return fields.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(",");
      })
      .join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wheel-bulk-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Bulk Wheel Creator</h1>

      <div className="flex items-center space-x-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useExcel}
            onChange={(e) => setUseExcel(e.target.checked)}
            disabled={running}
          />
          Use Excel upload
        </label>
        <span className="text-xs text-gray-500">
          Concurrency: {CONCURRENCY} in flight
        </span>
      </div>

      {!useExcel ? (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Prompt</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full border rounded p-2"
              placeholder='e.g. "Dota 2 Challenges Picker Wheel"'
              disabled={running}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Context</label>
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full border rounded p-2"
              placeholder='e.g. "users can pick time for lunch"'
              disabled={running}
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Upload Excel (columns: <code>prompts</code>, <code>context</code>)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            disabled={running}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={startProcess}
          disabled={running || (!useExcel && !prompt)}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? "Running..." : "Start"}
        </button>
        <button
          onClick={retryAllFailed}
          disabled={running || !rows.some((r) => r.status === "error")}
          className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Retry failed ({summary.err})
        </button>
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {topMessage && <p className="text-center text-sm">{topMessage}</p>}

      {rows.length > 0 && (
        <div className="text-sm text-gray-700 text-center">
          {summary.done}/{summary.total} done · {summary.active} in flight ·{" "}
          {summary.err} failed
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 w-10">#</th>
                <th className="text-left p-2">Prompt</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Result</th>
                <th className="text-left p-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 text-gray-500">{i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium truncate max-w-xs" title={r.prompt}>
                      {r.prompt}
                    </div>
                    {r.context && (
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={r.context}>
                        {r.context}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <StatusBadge status={r.status} />
                    {r.error && (
                      <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={r.error}>
                        {r.error}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    {r.link ? (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {r.link}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    {r.status === "error" && !running && (
                      <button
                        onClick={() => retryRow(i)}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    queued: "bg-gray-200 text-gray-700",
    generating: "bg-blue-100 text-blue-700",
    creating: "bg-indigo-100 text-indigo-700",
    done: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${map[status] || ""}`}>
      {status}
    </span>
  );
}
