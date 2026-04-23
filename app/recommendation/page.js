"use client";

import { useState } from "react";
import QuestionStep from "./QuestionStep";
import ResultsGrid from "./ResultGrid";
import SpinWheelModal from "./SpinWheelModal";
import { Sparkles, RefreshCw, Clapperboard, MonitorPlay, Dices } from "lucide-react";

// NOTE: we previously imported `fetchAnime` from "@/lib/fetchAnime" directly
// here. That pulled the AniList SDK + graphql (~70KB) into the client bundle
// for everyone who hit /recommendation. The anime path now goes through
// /api/recommendation/anime so the SDK stays on the server — same pattern
// the movie path has used since day one.

function ResultSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto animate-pulse space-y-4">
      <div className="aspect-[2/3] w-full bg-gray-200 dark:bg-gray-800 rounded-3xl" />
      <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mx-auto" />
      <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-900 rounded mx-auto" />
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
  const [showWheel, setShowWheel] = useState(false);

  const moodMapAnime = { Lighthearted: "Comedy", Intense: "Action" };
  const moodMapMovie = { Lighthearted: "Comedy", Intense: "Action" };

  const animeQuestions = [
    {
      key: "moodOrGenre",
      question: "What's the vibe today?",
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
      question: "What's the vibe today?",
      options: ["Lighthearted", "Intense", "Pick a Genre"],
    },
    {
      key: "genre",
      question: "Which genre do you enjoy most?",
      options: ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi"],
    },
  ];

  const questions = mode === "anime" ? animeQuestions : movieQuestions;
  const progress = mode ? ((step + 1) / (questions.length + 1)) * 100 : 0;

  const handleAnswer = (key, value) => {
    let updated = { ...answers, [key]: value };
    if (key === "moodOrGenre" && value !== "Pick a Genre") {
      updated.genre = mode === "anime" ? moodMapAnime[value] : moodMapMovie[value];
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

  const fetchRecommendations = async (targetMode, finalAnswers) => {
    setLoading(true);
    setStep(questions.length); // Move to result view
    try {
      if (targetMode === "anime") {
        const params = new URLSearchParams({
          genre: finalAnswers.genre,
          perPage: "15",
          sort: "POPULARITY_DESC",
        });
        const res = await fetch(`/api/recommendation/anime?${params.toString()}`);
        const recs = res.ok ? await res.json() : [];
        const unseen = recs.filter((r) => !seenIds.includes(r.id));
        const picks = unseen.slice(0, 6);
        if (picks.length > 0) {
          setResults(picks);
          setSeenIds((prev) => [...prev, ...picks.map((p) => p.id)]);
        }
      } else {
        const genreMap = { Action: 28, Comedy: 35, Drama: 18, Horror: 27, Romance: 10749, "Sci-Fi": 878 };
        const params = new URLSearchParams({
          genre: String(genreMap[finalAnswers.genre]),
          page: Math.floor(Math.random() * 3 + 1).toString(),
        });
        const res = await fetch(`/api/recommendation/movie?${params.toString()}`);
        const recs = await res.json();
        const unseen = recs.filter((r) => !seenIds.includes(r.id));
        const picks = unseen.slice(0, 6);
        if (picks.length > 0) {
          setResults(picks);
          setSeenIds((prev) => [...prev, ...picks.map((p) => p.id)]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setMode(null);
    setStep(0);
    setAnswers({});
    setResults([]);
  };

  return (
   <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Tightened Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Can't Decide?</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">We'll pick for you</p>
        </div>
      </div>

      {mode && step <= questions.length && (
        <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
      )}

      {!mode && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode("anime")} className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 border rounded-2xl hover:border-blue-500">
            <MonitorPlay className="text-orange-500 mb-2" size={32} />
            <span className="font-bold text-sm">Anime</span>
          </button>
          <button onClick={() => setMode("movie")} className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 border rounded-2xl hover:border-blue-500">
            <Clapperboard className="text-blue-500 mb-2" size={32} />
            <span className="font-bold text-sm">Movies</span>
          </button>
        </div>
      )}

      {mode && step < questions.length && (
        <QuestionStep 
          question={questions[step].question} 
          options={questions[step].options} 
          onAnswer={(opt) => handleAnswer(questions[step].key, opt)} 
        />
      )}

      {mode && step === questions.length && (
        <div className="space-y-4">
          <ResultsGrid results={results} loading={loading} />
          <div className="flex gap-2">
            <button onClick={() => fetchRecommendations(mode, answers)} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><RefreshCw size={14} className="inline mr-2" /> Reshuffle</button>
            {results.length > 1 && (
              <button onClick={() => setShowWheel(true)} className="flex-1 py-3 bg-purple-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><Dices size={14} className="inline mr-2" /> Spin!</button>
            )}
            <button onClick={() => setMode(null) || setStep(0)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 font-black rounded-xl text-xs uppercase tracking-widest">Restart</button>
          </div>
          {showWheel && results.length > 1 && (
            <SpinWheelModal results={results} mode={mode} onClose={() => setShowWheel(false)} />
          )}
        </div>
      )}
    </main>
  );
}

// "use client";

// import { useState } from "react";
// import { fetchAnime } from "@/lib/fetchAnime";
// import { fetchMovies } from "@/lib/fetchMovie";
// import QuestionStep from "./QuestionStep";
// import ResultsGrid from "./ResultGrid";

// function ResultSkeleton() {
//   return (
//     <div className="flex flex-col items-center text-center p-2 animate-pulse">
//       <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-sm h-64 p-2 bg-gray-300 dark:bg-gray-700 rounded-lg" />
//       <div className="mt-2 h-5 w-2/3 bg-gray-300 dark:bg-gray-700 rounded" />
//       <div className="mt-1 h-4 w-1/2 bg-gray-200 dark:bg-gray-600 rounded" />
//     </div>
//   );
// }



// export default function RecommendationPage() {
//   const [mode, setMode] = useState(null);
//   const [step, setStep] = useState(0);
//   const [answers, setAnswers] = useState({});
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [cooldown, setCooldown] = useState(false);
//   const [seenIds, setSeenIds] = useState([]);

//   const moodMapAnime = { Lighthearted: "Comedy", Intense: "Action" };
//   const moodMapMovie = { Lighthearted: "Comedy", Intense: "Action" };

//   const animeQuestions = [
//     {
//       key: "moodOrGenre",
//       question: "Do you want something lighthearted, intense, or pick a genre?",
//       options: ["Lighthearted", "Intense", "Pick a Genre"],
//     },
//     {
//       key: "genre",
//       question: "Which genre do you enjoy most?",
//       options: ["Action", "Romance", "Comedy", "Horror", "Fantasy", "Sci-Fi"],
//     },
//   ];

//   const movieQuestions = [
//     {
//       key: "moodOrGenre",
//       question: "Do you want something lighthearted, intense, or pick a genre?",
//       options: ["Lighthearted", "Intense", "Pick a Genre"],
//     },
//     {
//       key: "genre",
//       question: "Which genre of movie do you enjoy most?",
//       options: ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi"],
//     },
//   ];

//   const questions = mode === "anime" ? animeQuestions : movieQuestions;

//   const handleAnswer = (key, value) => {
//     let updated = { ...answers, [key]: value };

//     if (key === "moodOrGenre" && value !== "Pick a Genre") {
//       updated.genre =
//         mode === "anime" ? moodMapAnime[value] : moodMapMovie[value];
//       setAnswers(updated);
//       fetchRecommendations(mode, updated);
//       return;
//     }

//     setAnswers(updated);
//     if (step < questions.length - 1) {
//       setStep(step + 1);
//     } else {
//       fetchRecommendations(mode, updated);
//     }
//   };

//   const fetchRecommendations = async (mode, finalAnswers) => {
//     setLoading(true);
//     try {
//       if (mode === "anime") {
//         const recs = await fetchAnime({
//           genre: finalAnswers.genre,
//           perPage: 10,
//           sort: "POPULARITY_DESC",
//         });
//         const unseen = recs.filter((r) => !seenIds.includes(r.id));
//         if (unseen.length > 0) {
//           setResults([unseen[0]]);
//           setSeenIds([...seenIds, unseen[0].id]);
//         } else {
//           setResults([]);
//         }
//       } else {
//         const genreMap = {
//           Action: 28,
//           Comedy: 35,
//           Drama: 18,
//           Horror: 27,
//           Romance: 10749,
//           "Sci-Fi": 878,
//         };
//         const params = new URLSearchParams({
//           genre: String(genreMap[finalAnswers.genre]),
//           page: "1",
//           excludeIds: seenIds.join(","),
//         });
//         const res = await fetch(
//           `/api/recommendation/movie?${params.toString()}`
//         );
//         const recs = await res.json();
//         if (recs.length > 0) {
//           setResults([recs[0]]);
//           setSeenIds([...seenIds, recs[0].id]);
//         } else {
//           setResults([]);
//         }
//       }
//       setStep(questions.length);
//     } catch (err) {
//       console.error("Error fetching recommendations:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleReshuffle = () => {
//     if (cooldown) return;
//     fetchRecommendations(mode, answers);
//     setCooldown(true);
//     setTimeout(() => setCooldown(false), 3000);
//   };

//   const handleRestart = () => {
//     setMode(null);
//     setStep(0);
//     setAnswers({});
//     setResults([]);
//     setSeenIds([]);
//   };

//   return (
//     <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 ">
//       <h1 className="text-xl sm:text-2xl font-bold text-center tracking-tight text-gray-800 dark:text-gray-100">
//         {mode && step === questions.length
//           ? "🍕 Grab snacks — here’s your surprise pick!"
//           : "🎲 Ready for a surprise? Let’s pick your mood!"}
//       </h1>

//       {!mode && (
//         <div className="space-y-3">
//           <button
//             onClick={() => setMode("anime")}
//             className="w-full border rounded-lg py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"
//           >
//             Anime
//           </button>
//           <button
//             onClick={() => setMode("movie")}
//             className="w-full border rounded-lg py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"
//           >
//             Movie
//           </button>
//         </div>
//       )}

//       {mode && step < questions.length && (
//         <div className="mt-4">
//           <QuestionStep
//             question={questions[step].question}
//             options={questions[step].options}
//             onAnswer={(opt) => handleAnswer(questions[step].key, opt)}
//             optionClassName="border rounded-lg py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100"
//           />
//         </div>
//       )}

//       {mode && step === questions.length && (
//         <div className="mt-6 space-y-4">
//           {loading && <ResultSkeleton />}
//           {!loading && results.length > 0 && (
//             <>
//               <ResultsGrid results={results} />
//               <div className="flex justify-center gap-4">
//                 <button
//                   onClick={handleReshuffle}
//                   disabled={cooldown}
//                   className={`px-5 py-2 rounded-lg shadow transition ${
//                     cooldown
//                       ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
//                       : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
//                   }`}
//                 >
//                   🔄 Re‑Surprise Me
//                 </button>
//                 <button
//                   onClick={handleRestart}
//                   className="px-5 py-2 rounded-lg shadow transition bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
//                 >
//                   🔁 Start Again
//                 </button>
//               </div>
//             </>
//           )}
//           {!loading && results.length === 0 && (
//             <p className="text-center text-gray-600 dark:text-gray-400">
//               No recommendation found.
//             </p>
//           )}
//         </div>
//       )}
//     </main>
//   );
// }
