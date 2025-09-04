"use client";

import { useEffect, useState } from "react";
import QuestionComposer from "./QuestionComposer";
import QuestionCard from "./QuestionCard";

export default function QuestionsPanel({
  type,               // contentType: "anime", "movie", "game"
  contentId,
  isLoggedIn,
  openLoginPrompt,
  currentUserId,
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/questions?contentType=${type}&contentId=${contentId}`
      );
      if (!res.ok) throw new Error("Failed to load questions");
      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [type, contentId]);

  const handleCreated = (newQ) => {
    setQuestions((prev) => [newQ, ...prev]);
  };

  const handleUpdated = (updatedQ) => {
    setQuestions((prev) =>
      prev.map((q) => (q._id === updatedQ._id ? updatedQ : q))
    );
  };

  return (
    <div className="space-y-4">
      {/* Composer */}
      <QuestionComposer
        type={type}
        contentId={contentId}
        isLoggedIn={isLoggedIn}
        openLoginPrompt={openLoginPrompt}
        onCreated={handleCreated}
      />

      {/* Question Feed */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading questions…</p>
      ) : questions.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-600 dark:text-gray-300">
          No questions yet. Be the first to ask!
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionCard
              key={q._id}
              data={q}
              isLoggedIn={isLoggedIn}
              openLoginPrompt={openLoginPrompt}
              currentUserId={currentUserId}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
