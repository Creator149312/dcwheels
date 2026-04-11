"use client";
import { useState } from "react";
import * as XLSX from "xlsx"; // install with: npm install xlsx

const bannedWords = [
  "nsfw","porn","hentai","nude","sex","violence","drugs",
  "kill","murder","terrorist","weapon","abuse",
];

const cleanTag = (tag) =>
  tag.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase();

export default function StagedWheelCreator() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState("");
  const [wheelLinks, setWheelLinks] = useState([]); // multiple links
  const [lastRequest, setLastRequest] = useState(0);
  const [useExcel, setUseExcel] = useState(false);
  const [excelRows, setExcelRows] = useState([]);

  const RATE_LIMIT_MS = 10000;

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      // Validate columns
      const hasPrompts = rows.every((r) => "prompts" in r);
      const hasContext = rows.every((r) => "context" in r);
      if (!hasPrompts || !hasContext) {
        setMessage("❌ Excel must have 'prompts' and 'context' columns");
        return;
      }

      setExcelRows(rows);
      setMessage(`✅ Loaded ${rows.length} rows from Excel`);
    };
    reader.readAsArrayBuffer(file);
  };

  const startProcess = async () => {
    const now = Date.now();
    if (now - lastRequest < RATE_LIMIT_MS) {
      setMessage("⏳ Rate limit exceeded. Please wait a few seconds.");
      return;
    }
    setLastRequest(now);

    setMessage("");
    setWheelLinks([]);
    setStage(1);

    try {
      if (useExcel && excelRows.length > 0) {
        const links = [];
        for (const [i, row] of excelRows.entries()) {
          setMessage(`Processing row ${i + 1} of ${excelRows.length}...`);
          const link = await processPrompt(row.prompts, row.context);
          links.push(link);

          // Delay 2–3 seconds between rows
          await new Promise((res) =>
            setTimeout(res, 2000 + Math.random() * 1000)
          );
        }
        setWheelLinks(links);
      } else {
        const link = await processPrompt(prompt, context);
        setWheelLinks([link]);
      }
    } catch (err) {
      setMessage("❌ Error: " + err.message);
      setStage(0);
    }
  };

  const processPrompt = async (prompt, context) => {
    // Stage 1: Generate JSON
    setMessage(`Generating JSON for "${prompt}"...`);
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
    await new Promise((res) => setTimeout(res, 1000));
    setStage(2);

    // Stage 2: Validate JSON
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
          .filter((tag) => tag.length > 0 && !bannedWords.includes(tag))
      )
    );
    setStage(3);

    // Stage 3: Create wheel entry
    setMessage("Creating wheel entry...");
    const payload = { jsonKey: topKeys[0], jsonData: wheelData };
    const res2 = await fetch("/api/createFromJSON", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data2 = await res2.json();
    if (res2.status !== 201) {
      throw new Error(data2?.message || "Failed to create wheel entry");
    }
    await new Promise((res) => setTimeout(res, 1000));
    setStage(4);

    // Stage 4: Return link
    setMessage("✅ Wheel created successfully!");
    return `/wheel/${payload.jsonKey}`;
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Staged Wheel Creator</h1>

      {/* Toggle Excel vs Manual */}
      <div className="flex items-center space-x-4">
        <label>
          <input
            type="checkbox"
            checked={useExcel}
            onChange={(e) => setUseExcel(e.target.checked)}
          />{" "}
          Use Excel upload
        </label>
      </div>

      {!useExcel ? (
        <>
          {/* Prompt input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Enter your prompt</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full border rounded p-2"
              placeholder='e.g. "Dota 2 Challenges Picker Wheel"'
            />
          </div>

          {/* Context input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Enter your context</label>
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full border rounded p-2"
              placeholder='e.g. "users can pick time for lunch"'
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Upload Excel</label>
          <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
        </div>
      )}

      <button
        onClick={startProcess}
        disabled={!useExcel && !prompt}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Start Process
      </button>

      {/* Progress bar */}
      <div className="flex justify-between items-center mt-6">
        {[1, 2, 3, 4].map((num) => (
          <div
            key={num}
            className={`flex-1 h-2 mx-1 rounded ${
              stage >= num ? "bg-blue-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-sm mt-2">
        <span>1. Generate</span>
        <span>2. Validate</span>
        <span>3. Create</span>
        <span>4. Link</span>
      </div>

      {message && <p className="mt-4 text-center">{message}</p>}

      {wheelLinks.length > 0 && (
        <div className="mt-4 text-center space-y-2">
          <p>🎉 Wheels created:</p>
          <ul className="list-disc list-inside">
            {wheelLinks.map((link, idx) => (
              <li key={idx}>
                <a href={link} className="text-blue-600 underline">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
