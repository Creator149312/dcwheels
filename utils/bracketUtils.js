// utils/bracketUtils.js
// Pure bracket logic — no React dependencies.

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns bracket sizes that make sense for the given segment count.
 * Rule: at least half the bracket slots must be real competitors (no more
 * than half BYEs). This keeps the bracket from feeling empty.
 *   4  → need >= 2 segments
 *   8  → need >= 4 segments
 *   16 → need >= 8 segments
 *   32 → need >= 16 segments
 */
export function validBracketSizes(segmentCount) {
  return [4, 8, 16, 32].filter((s) => segmentCount >= Math.ceil(s / 2));
}

/**
 * Build a bracket structure.
 * Each segment is tagged with a stable `_bId` for identity comparisons
 * (avoids false-positive matches when two competitors share the same text).
 * BYE slots (null) are auto-advanced after seeding.
 */
export function buildBracket(segments, size) {
  const tagged = segments
    .filter((s) => s && typeof s.text === "string" && s.text.trim())
    .map((s, i) => ({ ...s, _bId: i }));

  const shuffled = shuffle(tagged);
  const seeded = shuffled.slice(0, size);
  while (seeded.length < size) seeded.push(null); // pad with BYEs

  const numRounds = Math.log2(size); // 8→3, 16→4, 32→5

  // Round 0: pair adjacent seeded entries
  const round0 = [];
  for (let i = 0; i < size; i += 2) {
    round0.push({ a: seeded[i], b: seeded[i + 1], winner: null });
  }

  // Subsequent rounds: empty slots filled as winners advance
  const rounds = [round0];
  for (let r = 1; r < numRounds; r++) {
    const count = size / Math.pow(2, r + 1);
    rounds.push(
      Array.from({ length: count }, () => ({ a: null, b: null, winner: null }))
    );
  }

  return processByes({ size, rounds, champion: null });
}

// Internal: set winner and promote to next round (no BYE processing)
function _advance(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket));
  b.rounds[roundIdx][matchIdx].winner = winner;

  const nextRound = roundIdx + 1;
  if (nextRound < b.rounds.length) {
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const slot = matchIdx % 2 === 0 ? "a" : "b";
    b.rounds[nextRound][nextMatchIdx][slot] = winner;
  } else {
    // Last round match finished → champion
    b.champion = winner;
  }

  return b;
}

// Auto-advance any match where one side is BYE (null) until none remain
function processByes(bracket) {
  let b = JSON.parse(JSON.stringify(bracket));
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < b.rounds.length; r++) {
      for (let m = 0; m < b.rounds[r].length; m++) {
        const match = b.rounds[r][m];
        if (match.winner !== null) continue;
        if (match.a !== null && match.b === null) {
          b = _advance(b, r, m, match.a);
          changed = true;
        } else if (match.a === null && match.b !== null) {
          b = _advance(b, r, m, match.b);
          changed = true;
        }
      }
    }
  }
  return b;
}

/**
 * Record a winner for a match, promote them, and auto-resolve any BYEs
 * that open up in subsequent rounds.
 */
export function advanceWinner(bracket, roundIdx, matchIdx, winner) {
  return processByes(_advance(bracket, roundIdx, matchIdx, winner));
}

/**
 * Returns {round, match} of the next match needing a human spin, or null
 * if the tournament is complete (or waiting for earlier rounds to fill).
 */
export function getNextSpinnable(bracket) {
  for (let r = 0; r < bracket.rounds.length; r++) {
    for (let m = 0; m < bracket.rounds[r].length; m++) {
      const match = bracket.rounds[r][m];
      if (match.winner === null && match.a !== null && match.b !== null) {
        return { round: r, match: m };
      }
    }
  }
  return null;
}

export function isTournamentComplete(bracket) {
  return bracket.champion !== null;
}

/**
 * Human-readable round label, counted from the end.
 *   Final → Semi-Final → Quarter-Final → Round N
 */
export function getRoundName(roundIdx, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIdx;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-Final";
  if (fromEnd === 2) return "Quarter-Final";
  return `Round ${roundIdx + 1}`;
}
