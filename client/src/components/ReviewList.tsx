import React from 'react';
import { ReviewItem } from '../types/index.js';

interface ReviewListProps {
  reviews: ReviewItem[];
  currentUserId: number | null;
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews, currentUserId }) => {
  if (reviews.length === 0) {
    return (
      <div className="p-6 rounded-[6px] bg-[#25201C] border border-[#3A332C] text-center text-[#8F8374] text-sm">
        No reviews yet. Be the first to share your experience!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map(review => {
        const isAuthor = currentUserId !== null && review.user.id === currentUserId;
        const formattedDate = new Date(review.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        return (
          <div
            key={review.id}
            className={`p-4 rounded-[6px] border ${
              isAuthor ? 'bg-[#29231E] border-[#D9694A]/40' : 'bg-[#25201C] border-[#3A332C]'
            } transition-colors`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#F3EBDD]">
                  {review.user.name}
                </span>
                {isAuthor && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D9694A]/20 text-[#D9694A] border border-[#D9694A]/30">
                    You
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#D9694A]">
                  {'★'.repeat(review.rating)}
                  <span className="text-[#544A3F]">{'★'.repeat(5 - review.rating)}</span>
                </span>
                <span className="text-xs text-[#8F8374]">
                  · {formattedDate}
                </span>
              </div>
            </div>

            <p className="text-sm text-[#C9BDAA] leading-relaxed whitespace-pre-line">
              {review.body}
            </p>
          </div>
        );
      })}
    </div>
  );
};
