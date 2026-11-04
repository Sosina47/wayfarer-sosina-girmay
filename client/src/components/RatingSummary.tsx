import React from 'react';

interface RatingSummaryProps {
  averageRating: number | null;
  reviewCount: number;
}

export const RatingSummary: React.FC<RatingSummaryProps> = ({ averageRating, reviewCount }) => {
  if (reviewCount === 0 || averageRating === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#8F8374] italic">
        <span>★</span>
        <span>No reviews yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-[#D9694A]">★ {averageRating.toFixed(1)}</span>
      <span className="text-sm text-[#8F8374]">
        based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
      </span>
    </div>
  );
};
