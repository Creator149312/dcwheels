#!/usr/bin/env node
/**
 * Single-list pipeline runner.
 *
 * Reads a JSON payload from stdin, runs Stage 2 (curation) → Stage 3
 * (verification) → Stage 4 (ingestion), and prints the result as JSON.
 *
 * Example:
 *   echo '{"title":"...","description":"...","context":"...","tags":[],"dryRun":false}' | \
 *     node scripts/ai-list-pipeline/run-one.js
 */

import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const { loadState, saveState, logEvent } = await import("./lib/state.js");
const { runCuration } = await import("./stages/curation.js");
const { runVerification } = await import("./stages/verification.js");
const { runIngestion } = await import("./stages/ingestion.js");

const ORIGINAL_LOG = console.log;
const ORIGINAL_WARN = console.warn;

function redirectLogsToStderr() {
  console.log = (...args) => process.stderr.write(args.join(" ") + "\n");
  console.warn = (...args) => process.stderr.write(args.join(" ") + "\n");
}

function restoreLogs() {
  console.log = ORIGINAL_LOG;
  console.warn = ORIGINAL_WARN;
}

function normalizeTags(tags) {
  if (!tags) return ["ai-curated", "movies", "tmdb-verified"];
  if (Array.isArray(tags)) return tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  const stdin = await readStdin();
  let payload;
  try {
    payload = JSON.parse(stdin || "{}");
  } catch (err) {
    console.error(JSON.stringify({ error: `Invalid JSON payload: ${err.message}` }));
    process.exit(1);
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) {
    console.error(JSON.stringify({ error: "Title is required." }));
    process.exit(1);
  }

  const idea = {
    title,
    description:
      typeof payload.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : `Curated list of movies for "${title}".`,
    tags: normalizeTags(payload.tags),
  };
  const context = typeof payload.context === "string" ? payload.context.trim() : "";
  const dryRun = !!payload.dryRun;

  const state = loadState();
  logEvent({ stage: "run-one-start", list: title, dryRun });

  redirectLogsToStderr();

  try {
    const candidates = await runCuration(idea, context);
    // For the single-list UI runner, allow movies that were already used in
    // earlier pipeline runs so the requested list can be fully populated.
    const verified = await runVerification(candidates, state, { skipProcessedDedup: true });

    let saved = null;
    if (!dryRun) {
      saved = await runIngestion(idea, verified);
    }

    saveState(state);

    if (!dryRun && !saved) {
      restoreLogs();
      const reason =
        verified.length < 5
          ? `Only ${verified.length} movies verified (minimum 5 required).`
          : `A list too similar to "${title}" already exists.`;
      console.error(JSON.stringify({ error: reason, verifiedCount: verified.length }));
      process.exit(1);
    }

    logEvent({
      stage: dryRun ? "run-one-dry-run" : "run-one-complete",
      list: title,
      itemCount: verified.length,
    });

    restoreLogs();
    process.stdout.write(
      JSON.stringify({
        success: true,
        dryRun,
        list: saved || {
          name: idea.title,
          description: idea.description,
          itemCount: verified.length,
          items: verified,
          tags: idea.tags,
          source: "ai-curated",
        },
      }) + "\n"
    );
  } catch (err) {
    restoreLogs();
    console.error(JSON.stringify({ error: err.message || "Pipeline failed." }));
    process.exit(1);
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    if (process.stdin.isTTY) {
      resolve(data);
      return;
    }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

main();
