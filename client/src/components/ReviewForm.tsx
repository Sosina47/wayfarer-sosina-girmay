import React, { useEffect, useState } from 'react';
import { MyReviewItem } from '../types/index.js';
import { saveReview, ApiError } from '../services/api.js';

interface ReviewFormProps {
  placeId: number;
  existingReview: MyReviewItem | null;
  onReviewSaved: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  placeId,
  existingReview,
  onReviewSaved
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [body, setBody] = useState<string>(existingReview?.body ?? '');
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync form when acting user or myReview changes
  useEffect(() => {
    setRating(existingReview?.rating ?? 5);
    setBody(existingReview?.body ?? '');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [existingReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedBody = body.trim();

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (trimmedBody.length === 0) {
      setErrorMessage('Please write a short review (at least 1 character).');
      return;
    }

    if (trimmedBody.length > 500) {
      setErrorMessage('Review body must not exceed 500 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveReview(placeId, {
        rating,
        body: trimmedBody
      });
      setSuccessMessage('Review saved');
      onReviewSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save your review. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStars = hoveredRating !== null ? hoveredRating : rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-[6px] bg-[#25201C] border border-[#3A332C] space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#F3EBDD]">
          {existingReview ? 'Your review' : 'Write a review'}
        </h3>
        {existingReview && (
          <span className="text-xs px-2 py-0.5 rounded bg-[#2E2822] border border-[#3A332C] text-[#8F8374]">
            Editing existing review
          </span>
        )}
      </div>

      {/* Star Rating Picker */}
      <div>
        <label className="block text-xs font-medium text-[#C9BDAA] mb-1.5">
          Rating
        </label>
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-label="Star rating selector"
        >
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onClick={() => {
                setRating(star);
                setSuccessMessage(null);
              }}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              className="text-2xl p-1 focus:outline-none focus:ring-1 focus:ring-[#D9694A] rounded transition-transform hover:scale-110"
            >
              <span
                className={
                  star <= activeStars ? 'text-[#D9694A]' : 'text-[#544A3F]'
                }
              >
                ★
              </span>
            </button>
          ))}
          <span className="ml-2 text-xs text-[#8F8374]">
            {rating} of 5 stars
          </span>
        </div>
      </div>

      {/* Review Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="review-body" className="block text-xs font-medium text-[#C9BDAA]">
            Review
          </label>
          <span
            className={`text-xs ${
              body.trim().length > 500 ? 'text-[#D9694A] font-semibold' : 'text-[#8F8374]'
            }`}
          >
            {body.trim().length} / 500
          </span>
        </div>
        <textarea
          id="review-body"
          rows={3}
          value={body}
          maxLength={500}
          onChange={e => {
            setBody(e.target.value);
            setSuccessMessage(null);
          }}
          placeholder="Share your experience (highlights, tips, atmosphere)…"
          className="w-full bg-[#1D1916] text-[#F3EBDD] text-sm rounded border border-[#3A332C] p-3 focus:outline-none focus:ring-1 focus:ring-[#D9694A] focus:border-[#D9694A] placeholder-[#544A3F] transition-colors resize-y"
        />
      </div>

      {/* Inline Feedback */}
      {errorMessage && (
        <div className="p-2.5 rounded bg-[#331C18] border border-[#7A2E22] text-[#F5B4A8] text-xs">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 rounded bg-[#1C291E] border border-[#395B3E] text-[#9BAE7F] text-xs font-medium flex items-center gap-1.5">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 rounded text-xs font-semibold bg-[#D9694A] text-[#1D1916] hover:bg-[#E07D62] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? 'Saving…'
            : existingReview
            ? 'Update review'
            : 'Post review'}
        </button>
      </div>
    </form>
  );
};
