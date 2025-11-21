"use client";

import { useState } from "react";
import { fetchAnime } from "@/lib/fetchAnime";
import { fetchMovies } from "@/lib/fetchMovie";
import QuestionStep from "./QuestionStep";
import ResultsGrid from "./ResultGridAdv";
import SpinWheelModal from "./SpinWheelModal";

export default function RecommendationPage() {
  const [mode, setMode] = useState(null); // "anime" or "movie"
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWheel, setShowWheel] = useState(false);

  // Anime questions
  const animeQuestions = [
    { key: "genre", question: "Which genre do you enjoy most?", options: ["Action", "Romance", "Comedy", "Horror", "Fantasy", "Sci-Fi"] },
    { key: "length", question: "What length of anime do you prefer?", options: ["Short (<20 episodes)", "Medium (20–100 episodes)", "Long (>100 episodes)"] },
    { key: "popularity", question: "Do you want popular hits or hidden gems?", options: ["Popular hits", "Hidden gems"] },
  ];

  // Movie questions
  const movieQuestions = [
    { key: "genre", question: "Which genre of movie do you enjoy most?", options: ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi"] },
    { key: "length", question: "What length of movie do you prefer?", options: ["Short (<90 min)", "Medium (90–150 min)", "Long (>150 min)"] },
    { key: "year", question: "Which release period do you prefer?", options: ["Before 2000", "2000–2015", "2015–Now"] },
  ];

  const questions = mode === "anime" ? animeQuestions : movieQuestions;

  const handleAnswer = (key, value) => {
    const updated = { ...answers, [key]: value };
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
          perPage: 6,
          sort: finalAnswers.popularity === "Hidden gems" ? "SCORE_DESC" : "POPULARITY_DESC",
        });
        setResults(recs.slice(0, 6));
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
          length: finalAnswers.length,
          page: "1",
        });

        if (finalAnswers.year === "Before 2000") {
          params.set("year[lte]", "1999-12-31");
        } else if (finalAnswers.year === "2000–2015") {
          params.set("year[gte]", "2000-01-01");
          params.set("year[lte]", "2015-12-31");
        } else if (finalAnswers.year === "2015–Now") {
          params.set("year[gte]", "2015-01-01");
        }

        const res = await fetch(`/api/recommendation/movie?${params.toString()}`);
        const recs = await res.json();
        setResults(recs.slice(0, 6));
      }
      setStep(questions.length);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">What do you want to watch?</h1>

      {/* Step 0: Choose Anime or Movie */}
      {!mode && (
        <div className="space-y-4">
          <button
            onClick={() => setMode("anime")}
            className="w-full border rounded-lg py-3 px-4 hover:bg-blue-50"
          >
            Anime
          </button>
          <button
            onClick={() => setMode("movie")}
            className="w-full border rounded-lg py-3 px-4 hover:bg-blue-50"
          >
            Movie
          </button>
        </div>
      )}

      {/* Quiz flow */}
      {mode && step < questions.length && (
        <QuestionStep
          question={questions[step].question}
          options={questions[step].options}
          onAnswer={(opt) => handleAnswer(questions[step].key, opt)}
        />
      )}

      {/* Results */}
      {mode && step === questions.length && (
        <div className="mt-6">
          {loading && <p>Finding recommendations...</p>}
          {!loading && results.length > 0 && (
            <>
              <ResultsGrid results={results} />
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowWheel(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Spin To Decide
                </button>
              </div>
            </>
          )}
          {!loading && results.length === 0 && <p>No recommendations found.</p>}
        </div>
      )}

      {showWheel && <SpinWheelModal results={results} onClose={() => setShowWheel(false)} />}
    </main>
  );
}
