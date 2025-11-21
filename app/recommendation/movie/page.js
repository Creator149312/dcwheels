"use client";

import { useState } from "react";
import { fetchMovies } from "@lib/fetchMovie";
import QuestionStep from "../QuestionStep";
import ResultsGrid from "../ResultGridAdv";
import SpinWheelModal from "../SpinWheelModal";

export default function MovieRecommenderPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ genre: "", length: "", year: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWheel, setShowWheel] = useState(false);

  const questions = [
    {
      key: "genre",
      question: "Which genre of movie do you enjoy most?",
      options: ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi"],
    },
    {
      key: "length",
      question: "What length of movie do you prefer?",
      options: ["Short (<90 min)", "Medium (90–150 min)", "Long (>150 min)"],
    },
    {
      key: "year",
      question: "Which release period do you prefer?",
      options: ["Before 2000", "2000–2015", "2015–Now"],
    },
  ];

  const handleAnswer = (key, value) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      fetchRecommendations(updated);
    }
  };

  const fetchRecommendations = async (finalAnswers) => {
  setLoading(true);

  const genreMap = {
    Action: 28,
    Comedy: 35,
    Drama: 18,
    Horror: 27,
    Romance: 10749,
    "Sci-Fi": 878,
  };

  // Build query params
  const params = new URLSearchParams({
    genre: genreMap[finalAnswers.genre],
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

  try {
    const res = await fetch(`/api/recommendation/movie?${params.toString()}`);
    const recs = await res.json();
    setResults(recs.slice(0, 6));
    setStep(questions.length);
  } catch (err) {
    console.error("Error fetching movies:", err);
  } finally {
    setLoading(false);
  }
};



  return (<></>
    // <main className="max-w-3xl mx-auto p-6">
    //   <h1 className="text-2xl font-bold mb-6">Movie Recommendation Quiz</h1>

    //   {step < questions.length && (
    //     <QuestionStep
    //       question={questions[step].question}
    //       options={questions[step].options}
    //       onAnswer={(opt) => handleAnswer(questions[step].key, opt)}
    //     />
    //   )}

    //   {step === questions.length && (
    //     <div className="mt-6">
    //       {loading && <p>Finding recommendations...</p>}
    //       {!loading && results.length > 0 && (
    //         <>
    //           <ResultsGrid results={results} />
    //           <div className="mt-6 text-center">
    //             <button
    //               onClick={() => setShowWheel(true)}
    //               className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
    //             >
    //               Spin To Decide
    //             </button>
    //           </div>
    //         </>
    //       )}
    //       {!loading && results.length === 0 && <p>No recommendations found.</p>}
    //     </div>
    //   )}

    //   {showWheel && (
    //     <SpinWheelModal results={results} onClose={() => setShowWheel(false)} />
    //   )}
    // </main>
  );
}
