"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { FaTrophy } from "react-icons/fa";
import { TbRefresh } from "react-icons/tb";
import {
  buildBracket,
  advanceWinner,
  getNextSpinnable,
  isTournamentComplete,
  getRoundName,
  validBracketSizes,
} from "@utils/bracketUtils";

const Wheel = dynamic(
  () => import("react-custom-roulette").then((m) => m.Wheel),
  { ssr: false }
);
const FireworksConfetti = dynamic(
  () => import("@components/FireworksConfetti"),
  { ssr: false }
);

// Two colours for the 2-segment spin wheel (indigo vs amber)
const MATCH_COLORS = ["#6366f1", "#f59e0b"];

export default function BracketMode({ segments, title, wheelHref }) {
  const [bracket, setBracket] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  // Store the pending winner so onStopSpinning can commit it
  const [pendingWinner, setPendingWinner] = useState(null);

  const validSegments = segments.filter(
    (s) => s && typeof s.text === "string" && s.text.trim()
  );
  const sizes = validBracketSizes(validSegments.length);

  const nextSpinnable = bracket ? getNextSpinnable(bracket) : null;
  const complete = bracket ? isTournamentComplete(bracket) : false;
  const totalRounds = bracket ? bracket.rounds.length : 0;

  const currentMatch =
    nextSpinnable && bracket
      ? bracket.rounds[nextSpinnable.round][nextSpinnable.match]
      : null;

  // Spin wheel data: exactly 2 entries for the current match
  const spinWheelData = currentMatch
    ? [
        {
          option: currentMatch.a?.text ?? "?",
          style: { backgroundColor: MATCH_COLORS[0], textColor: "#fff" },
        },
        {
          option: currentMatch.b?.text ?? "?",
          style: { backgroundColor: MATCH_COLORS[1], textColor: "#fff" },
        },
      ]
    : [
        { option: "A", style: { backgroundColor: MATCH_COLORS[0], textColor: "#fff" } },
        { option: "B", style: { backgroundColor: MATCH_COLORS[1], textColor: "#fff" } },
      ];

  function startTournament(size) {
    setBracket(buildBracket(validSegments, size));
    setMustSpin(false);
    setPendingWinner(null);
  }

  function handleSpin() {
    if (!nextSpinnable || mustSpin) return;
    // Randomly decide winner now so we can pass prizeNumber to wheel
    const winnerSlot = Math.random() < 0.5 ? 0 : 1; // 0 = slot a, 1 = slot b
    const winner = winnerSlot === 0 ? currentMatch.a : currentMatch.b;
    setPrizeNumber(winnerSlot);
    setPendingWinner({ roundIdx: nextSpinnable.round, matchIdx: nextSpinnable.match, winner });
    setMustSpin(true);
  }

  function handleStopSpinning() {
    setMustSpin(false);
    if (pendingWinner) {
      setBracket((prev) =>
        advanceWinner(prev, pendingWinner.roundIdx, pendingWinner.matchIdx, pendingWinner.winner)
      );
      setPendingWinner(null);
    }
  }

  // ── Size Selector ─────────────────────────────────────────────────────────
  if (!bracket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-sm w-full text-center">
          <FaTrophy className="mx-auto text-amber-400 mb-4" size={48} />
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Tournament Mode
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-8">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{title}</span>
            {" · "}{validSegments.length} competitors
          </p>

          {sizes.length === 0 ? (
            <p className="text-sm text-red-500">
              You need at least 2 segments to run a tournament.
            </p>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
                Choose bracket size
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {sizes.map((s) => {
                  const byes = Math.max(0, s - validSegments.length);
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`flex flex-col items-center px-6 py-4 rounded-xl border-2 transition-all ${
                        selectedSize === s
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                          : "border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="text-2xl font-black">{s}</span>
                      <span className="text-xs mt-0.5 opacity-70">
                        {byes > 0 ? `${byes} BYE${byes > 1 ? "s" : ""}` : "Full bracket"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!selectedSize}
                onClick={() => startTournament(selectedSize)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-colors"
              >
                Start Tournament
              </button>
            </>
          )}

          {wheelHref && (
            <Link
              href={wheelHref}
              className="mt-5 block text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ← Back to wheel
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Active Bracket ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-6">
      {complete && <FireworksConfetti />}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FaTrophy className="text-amber-400 shrink-0" size={20} />
              <span className="line-clamp-1">{title}</span>
              <span className="text-gray-400 dark:text-gray-600 font-normal text-sm hidden sm:inline">
                — {bracket.size}-player bracket
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { setBracket(null); setSelectedSize(null); }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <TbRefresh size={14} /> Restart
            </button>
            {wheelHref && (
              <Link
                href={wheelHref}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ← Wheel
              </Link>
            )}
          </div>
        </div>

        {/* Champion banner */}
        {complete && (
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-center shadow-lg shadow-amber-500/30">
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">
              🏆 Tournament Champion
            </p>
            <p className="text-3xl font-black">{bracket.champion?.text}</p>
            {bracket.champion?.imageUrl && (
              <div className="mx-auto mt-3 relative h-24 w-24 rounded-full overflow-hidden border-4 border-white/40 shadow-lg">
                <Image
                  src={bracket.champion.imageUrl}
                  alt={bracket.champion.text}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            )}
            <p className="mt-3 text-sm opacity-80">
              Spun {bracket.size === 4 ? "3" : bracket.size === 8 ? "7" : bracket.size === 16 ? "15" : "31"} matches
            </p>
          </div>
        )}

        {/* Current match spin panel */}
        {!complete && currentMatch && (
          <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-sm p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-4">
              {getRoundName(nextSpinnable.round, totalRounds)}
              {" · "}
              Match {nextSpinnable.match + 1} of {bracket.rounds[nextSpinnable.round].length}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Competitors */}
              <div className="flex-1 w-full flex items-center gap-3">
                <CompetitorCard seg={currentMatch.a} color={MATCH_COLORS[0]} />
                <span className="font-black text-gray-300 dark:text-gray-700 text-xl shrink-0">
                  vs
                </span>
                <CompetitorCard seg={currentMatch.b} color={MATCH_COLORS[1]} />
              </div>

              {/* Spin wheel */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="w-32 h-32">
                  <Wheel
                    mustStartSpinning={mustSpin}
                    prizeNumber={prizeNumber}
                    data={spinWheelData}
                    onStopSpinning={handleStopSpinning}
                    spinDuration={0.35}
                    outerBorderWidth={3}
                    outerBorderColor="#e5e7eb"
                    radiusLineColor="transparent"
                    radiusLineWidth={0}
                    fontSize={11}
                    textDistance={62}
                  />
                </div>
                <button
                  disabled={mustSpin}
                  onClick={handleSpin}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-sm shadow-indigo-600/20"
                >
                  {mustSpin ? "Spinning…" : "Spin to Decide!"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bracket grid */}
        <div className="overflow-x-auto pb-4">
          <div
            className="flex gap-2"
            style={{ minWidth: `${(totalRounds + 1) * 168}px` }}
          >
            {bracket.rounds.map((round, rIdx) => (
              <RoundColumn
                key={rIdx}
                round={round}
                roundIdx={rIdx}
                totalRounds={totalRounds}
                activeRound={nextSpinnable?.round ?? -1}
                activeMatch={nextSpinnable?.match ?? -1}
                bracketSize={bracket.size}
              />
            ))}

            {/* Champion column */}
            <div className="flex flex-col items-center justify-center w-40 shrink-0">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">
                Champion
              </p>
              <div
                className={`w-full rounded-xl border-2 p-3 text-center transition-all ${
                  bracket.champion
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 shadow-sm shadow-amber-400/20"
                    : "border-dashed border-gray-200 dark:border-gray-800"
                }`}
              >
                {bracket.champion ? (
                  <>
                    <FaTrophy className="mx-auto text-amber-400 mb-1" size={18} />
                    {bracket.champion.imageUrl && (
                      <div className="relative mx-auto h-10 w-10 rounded-full overflow-hidden mb-1 border-2 border-amber-300">
                        <Image
                          src={bracket.champion.imageUrl}
                          alt={bracket.champion.text}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    )}
                    <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2">
                      {bracket.champion.text}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-300 dark:text-gray-700">?</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CompetitorCard({ seg, color }) {
  if (!seg)
    return (
      <div className="flex-1 h-14 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center text-xs text-gray-300 dark:text-gray-700 italic">
        BYE
      </div>
    );
  return (
    <div
      className="flex-1 min-w-0 flex items-center gap-2 rounded-xl border-2 p-2.5"
      style={{ borderColor: color }}
    >
      {seg.imageUrl && (
        <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
          <Image
            src={seg.imageUrl}
            alt={seg.text}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      )}
      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {seg.text}
      </p>
    </div>
  );
}

function RoundColumn({ round, roundIdx, totalRounds, activeRound, activeMatch, bracketSize }) {
  const label = getRoundName(roundIdx, totalRounds);

  // Vertical spacing: each match occupies an equal slice of the bracket height.
  // The bracket height is proportional to bracketSize (number of initial competitors).
  // Round 0 has bracketSize/2 matches, Round 1 has bracketSize/4, etc.
  // We use flex justify-around which automatically centers matches within the column.

  return (
    <div className="flex flex-col w-40 shrink-0">
      <p className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2 text-center">
        {label}
      </p>
      <div
        className="flex flex-col flex-1 gap-2"
        style={{ justifyContent: round.length === 1 ? "center" : "space-around" }}
      >
        {round.map((match, mIdx) => (
          <MatchCard
            key={mIdx}
            match={match}
            isActive={activeRound === roundIdx && activeMatch === mIdx}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, isActive }) {
  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all ${
        isActive
          ? "border-indigo-500 shadow-md shadow-indigo-500/15"
          : "border-gray-100 dark:border-gray-800"
      }`}
    >
      <MatchSlot
        seg={match.a}
        isWinner={match.winner !== null && match.winner?._bId === match.a?._bId}
        isLoser={match.winner !== null && match.winner?._bId !== match.a?._bId && match.a !== null}
      />
      <div className="h-px bg-gray-100 dark:border-gray-800" />
      <MatchSlot
        seg={match.b}
        isWinner={match.winner !== null && match.winner?._bId === match.b?._bId}
        isLoser={match.winner !== null && match.winner?._bId !== match.b?._bId && match.b !== null}
      />
    </div>
  );
}

function MatchSlot({ seg, isWinner, isLoser }) {
  if (!seg) {
    return (
      <div className="px-2.5 py-2 bg-gray-50 dark:bg-gray-900/50 text-[10px] text-gray-300 dark:text-gray-700 italic">
        BYE
      </div>
    );
  }

  return (
    <div
      className={`px-2.5 py-2 flex items-center gap-1.5 transition-colors ${
        isWinner
          ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
          : isLoser
          ? "bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600"
          : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
      }`}
    >
      {isWinner && <span className="text-green-500 text-xs shrink-0">✓</span>}
      {seg.imageUrl ? (
        <div className="relative h-5 w-5 rounded overflow-hidden shrink-0">
          <Image
            src={seg.imageUrl}
            alt={seg.text}
            fill
            className="object-cover"
            sizes="20px"
          />
        </div>
      ) : null}
      <span
        className={`text-[11px] font-semibold truncate leading-tight ${
          isLoser ? "line-through opacity-60" : ""
        }`}
      >
        {seg.text}
      </span>
    </div>
  );
}
