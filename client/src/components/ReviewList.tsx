import React from 'react';
import { ReviewItem } from '../types/index.js';

interface ReviewListProps {
  reviews: ReviewItem[];
  currentUserId: number | null;
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews, currentUserId }) => {
  if (reviews.length === 0) {
    return (
      <div className="p-6 rounded-[6px] bg-[#191A1D] border border-[#303136] text-center text-[#A5A5B0] text-sm">
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
              isAuthor ? 'bg-[#191A1D] border-[#8C86E8]/60' : 'bg-[#191A1D] border-[#303136]'
            } transition-colors`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#E8E8ED]">
                  {review.user.name}
                </span>
                {isAuthor && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#8C86E8]/20 text-[#8C86E8] border border-[#8C86E8]/30">
                    You
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#F5B544]">
                  {'★'.repeat(review.rating)}
                  <span className="text-[#303136]">{'★'.repeat(5 - review.rating)}</span>
                </span>
                <span className="text-xs text-[#A5A5B0]">
                  · {formattedDate}
                </span>
              </div>
            </div>

            <p className="text-sm text-[#A5A5B0] leading-relaxed whitespace-pre-line">
              {review.body}
            </p>
          </div>
        );
      })}
    </div>
  );
};
