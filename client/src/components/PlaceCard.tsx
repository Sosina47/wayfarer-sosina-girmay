import React from 'react';
import { Place } from '../types/index.js';
import { PlaceImage } from './PlaceImage.js';

interface PlaceCardProps {
  place: Place;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  return (
    <article className="group flex flex-col rounded-[6px] bg-[#25201C] border border-[#3A332C] hover:border-[#D9694A] transition-colors duration-150 overflow-hidden shadow-sm">
      <PlaceImage
        src={place.imageUrl}
        alt={place.name}
        category={place.category}
      />

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#9BAE7F] font-semibold block mb-1">
            {place.category}
          </span>

          <h2 className="text-lg font-semibold text-[#F3EBDD] group-hover:text-[#D9694A] transition-colors line-clamp-1">
            {place.name}
          </h2>

          <p className="mt-2 text-sm text-[#C9BDAA] line-clamp-2 leading-relaxed">
            {place.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#3A332C] flex items-center justify-between text-sm">
          {place.reviewCount > 0 && place.averageRating !== null ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[#D9694A] font-bold" aria-hidden="true">★</span>
              <span className="font-semibold text-[#F3EBDD]">
                {place.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-[#8F8374]">
                · {place.reviewCount} {place.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#8F8374] italic">
              No reviews yet
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
