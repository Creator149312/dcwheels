"use client";

import { useState, useEffect } from "react";
import ReviewRecommendToggle from "./ReviewRecommendToggle";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import apiConfig from "@utils/ApiUrlConfig";

// layout prop is forwarded to ReviewList.
// formPosition = "top" (default) | "bottom" — controls whether the write-review
// form appears before or after the review list. Use "bottom" so readers see
// social proof (existing reviews) before the write-review CTA.
export default function ReviewsPanel({
  type,
  contentId,
  isLoggedIn,
  openLoginPrompt,
  layout = "vertical",
  formPosition = "top",
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
      {/* Write-review form — position determined by formPosition prop */}
      {formPosition === "top" && (
        <ReviewCreationBlock
          type={type}
          recommend={recommend}
          submitting={submitting}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
          onRecommendChange={handleRecommendChange}
          onSubmit={handleSubmit}
        />
      )}

      {/* Review list — visible first when formPosition="bottom" */}
      <div>
        {reviews.length > 0 && (
          <h4 className="text-sm font-semibold mb-2">
            User Reviews ({reviews.length})
          </h4>
        )}
        {loading ? (
          <p className="text-sm text-gray-500">Loading reviews…</p>
        ) : (
          <ReviewList
            reviews={reviews}
            isLoggedIn={isLoggedIn}
            openLoginPrompt={openLoginPrompt}
            layout={layout}
          />
        )}
      </div>

      {/* Write-review form at the bottom (social-proof-first pattern) */}
      {formPosition === "bottom" && (
        <ReviewCreationBlock
          type={type}
          recommend={recommend}
          submitting={submitting}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
          onRecommendChange={handleRecommendChange}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// Extracted form block to avoid duplication between top/bottom positions.
function ReviewCreationBlock({
  type,
  recommend,
  submitting,
  isLoggedIn,
  openLoginPrompt,
  onRecommendChange,
  onSubmit,
}) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-3">
        <span className="text-sm font-medium mb-2 sm:mb-0">
          Do you recommend this {type}?
        </span>
        <ReviewRecommendToggle
          value={recommend}
          onChange={onRecommendChange}
          disabled={submitting}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
        />
      </div>

      {recommend !== null && (
        <div className="mt-3 rounded-md border border-gray-300 dark:border-gray-700 p-3">
          <ReviewForm
            recommend={recommend}
            onSubmit={onSubmit}
            submitting={submitting}
            minChars={50}
            isLoggedIn={isLoggedIn}
            openLoginPrompt={openLoginPrompt}
          />
        </div>
      )}
    </div>
  );
}
