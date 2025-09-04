"use client";

import { useState, useEffect } from "react";
import ReviewRecommendToggle from "./ReviewRecommendToggle";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import apiConfig from "@utils/ApiUrlConfig";

export default function ReviewsPanel({
  type,
  contentId,
  isLoggedIn,
  openLoginPrompt,
}) {
  const [recommend, setRecommend] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch reviews on mount
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(
          `/api/reviews?type=${type}&contentId=${contentId}`
        );
        if (!res.ok) throw new Error("Failed to load reviews");
        const data = await res.json();
        setReviews(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [type, contentId]);

  const handleSubmit = async ({ recommend, text }) => {
    if (!isLoggedIn) {
      openLoginPrompt?.();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiConfig.apiUrl}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          contentId,
          recommend,
          text,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit review");
      const newReview = await res.json();
      setReviews((prev) => [newReview, ...prev]);
      setRecommend(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecommendChange = (val) => {
    if (!isLoggedIn) {
      openLoginPrompt?.();
      return;
    }
    setRecommend(val);
  };

  return (
    <div className="space-y-6">
      {/* Review creation */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-3">
          <span className="text-sm font-medium mb-2 sm:mb-0">
            Do you recommend this {type}?
          </span>
          <ReviewRecommendToggle
            value={recommend}
            onChange={handleRecommendChange}
            disabled={submitting}
            isLoggedIn={isLoggedIn}
            openLoginPrompt={openLoginPrompt}
          />
        </div>

        {recommend !== null && (
          <div className="mt-3 rounded-md border border-gray-300 dark:border-gray-700 p-3">
            <ReviewForm
              recommend={recommend}
              onSubmit={handleSubmit}
              submitting={submitting}
              minChars={50}
              isLoggedIn={isLoggedIn}
              openLoginPrompt={openLoginPrompt}
            />
          </div>
        )}
      </div>

      {/* Review list */}
      <div>
        <h4 className="text-sm font-semibold mb-2">User Reviews</h4>
        {loading ? (
          <p className="text-sm text-gray-500">Loading reviews…</p>
        ) : (
          <ReviewList
            reviews={reviews}
            isLoggedIn={isLoggedIn}
            openLoginPrompt={openLoginPrompt}
          />
        )}
      </div>
    </div>
  );
}
