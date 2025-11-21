"use client";

import { useState } from "react";
import { fetchAnime } from "@/lib/fetchAnime";
import { fetchMovies } from "@/lib/fetchMovie";
import QuestionStep from "./QuestionStep";
import ResultsGrid from "./ResultGrid";

function ResultSkeleton() {
  return (
    <div className="flex flex-col items-center text-center p-2 animate-pulse">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-sm h-64 p-2 bg-gray-300 dark:bg-gray-700 rounded-lg" />
      <div className="mt-2 h-5 w-2/3 bg-gray-300 dark:bg-gray-700 rounded" />
      <div className="mt-1 h-4 w-1/2 bg-gray-200 dark:bg-gray-600 rounded" />
    </div>
  );
}



export default function RecommendationPage() {
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [seenIds, setSeenIds] = useState([]);

  const moodMapAnime = { Lighthearted: "Comedy", Intense: "Action" };
  const moodMapMovie = { Lighthearted: "Comedy", Intense: "Action" };

  const animeQuestions = [
    {
      key: "moodOrGenre",
      question: "Do you want something lighthearted, intense, or pick a genre?",
      options: ["Lighthearted", "Intense", "Pick a Genre"],
    },
    {
      key: "genre",
      question: "Which genre do you enjoy most?",
      options: ["Action", "Romance", "Comedy", "Horror", "Fantasy", "Sci-Fi"],
    },
  ];

  const movieQuestions = [
    {
      key: "moodOrGenre",
      question: "Do you want something lighthearted, intense, or pick a genre?",
      options: ["Lighthearted", "Intense", "Pick a Genre"],
    },
    {
      key: "genre",
      question: "Which genre of movie do you enjoy most?",
      options: ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi"],
    },
  ];

  const questions = mode === "anime" ? animeQuestions : movieQuestions;

  const handleAnswer = (key, value) => {
    let updated = { ...answers, [key]: value };

    if (key === "moodOrGenre" && value !== "Pick a Genre") {
      updated.genre =
        mode === "anime" ? moodMapAnime[value] : moodMapMovie[value];
      setAnswers(updated);
      fetchRecommendations(mode, updated);
      return;
    }

    setAnswers(updated);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      fetchRecommendations(mode, updated);
    }
  };

  const fetchRecommendations = async (mode, finalAnswers) => {
    setLoading(true);
    try {
      if (mode === "anime") {
        const recs = await fetchAnime({
          genre: finalAnswers.genre,
          perPage: 10,
          sort: "POPULARITY_DESC",
        });
        const unseen = recs.filter((r) => !seenIds.includes(r.id));
        if (unseen.length > 0) {
          setResults([unseen[0]]);
          setSeenIds([...seenIds, unseen[0].id]);
        } else {
          setResults([]);
        }
      } else {
        const genreMap = {
          Action: 28,
          Comedy: 35,
          Drama: 18,
          Horror: 27,
          Romance: 10749,
          "Sci-Fi": 878,
        };
        const params = new URLSearchParams({
          genre: String(genreMap[finalAnswers.genre]),
          page: "1",
          excludeIds: seenIds.join(","),
        });
        const res = await fetch(
          `/api/recommendation/movie?${params.toString()}`
        );
        const recs = await res.json();
        if (recs.length > 0) {
          setResults([recs[0]]);
          setSeenIds([...seenIds, recs[0].id]);
        } else {
          setResults([]);
        }
      }
      setStep(questions.length);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReshuffle = () => {
    if (cooldown) return;
    fetchRecommendations(mode, answers);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
  };

  const handleRestart = () => {
    setMode(null);
    setStep(0);
    setAnswers({});
    setResults([]);
    setSeenIds([]);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 ">
      <h1 className="text-xl sm:text-2xl font-bold text-center tracking-tight text-gray-800 dark:text-gray-100">
        {mode && step === questions.length
          ? "🍕 Grab snacks — here’s your surprise pick!"
          : "🎲 Ready for a surprise? Let’s pick your mood!"}
      </h1>

      {!mode && (
        <div className="space-y-3">
          <button
            onClick={() => setMode("anime")}
            className="w-full border rounded-lg py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          >
            Anime
          </button>
          <button
            onClick={() => setMode("movie")}
            className="w-full border rounded-lg py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          >
            Movie
          </button>
        </div>
      )}

      {mode && step < questions.length && (
        <div className="mt-4">
          <QuestionStep
            question={questions[step].question}
            options={questions[step].options}
            onAnswer={(opt) => handleAnswer(questions[step].key, opt)}
            optionClassName="border rounded-lg py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          />
        </div>
      )}

      {mode && step === questions.length && (
        <div className="mt-6 space-y-4">
          {loading && <ResultSkeleton />}
          {!loading && results.length > 0 && (
            <>
              <ResultsGrid results={results} />
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleReshuffle}
                  disabled={cooldown}
                  className={`px-5 py-2 rounded-lg shadow transition ${
                    cooldown
                      ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  }`}
                >
                  🔄 Re‑Surprise Me
                </button>
                <button
                  onClick={handleRestart}
                  className="px-5 py-2 rounded-lg shadow transition bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  🔁 Start Again
                </button>
              </div>
            </>
          )}
          {!loading && results.length === 0 && (
            <p className="text-center text-gray-600 dark:text-gray-400">
              No recommendation found.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
