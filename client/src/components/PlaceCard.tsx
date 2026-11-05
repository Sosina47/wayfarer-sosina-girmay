import React from 'react';
import { Link } from 'react-router-dom';
import { Place } from '../types/index.js';
import { PlaceImage } from './PlaceImage.js';

interface PlaceCardProps {
  place: Place;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  return (
    <Link
      to={`/places/${place.id}`}
      className="group flex flex-col rounded-[6px] bg-[#191A1D] border border-[#303136] hover:border-[#6558E8] transition-colors duration-150 overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7770FF]"
    >
      <PlaceImage
        src={place.imageUrl}
        alt={place.name}
        category={place.category}
      />

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#6558E8] font-semibold block mb-1">
            {place.category}
          </span>

          <h2 className="text-xl font-semibold text-[#E8E8ED] group-hover:text-[#7770FF] transition-colors line-clamp-1 font-serif">
            {place.name}
          </h2>

          <p className="mt-2 text-sm text-[#A5A5B0] line-clamp-2 leading-relaxed">
            {place.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#303136] flex items-center justify-between text-sm">
          {place.reviewCount > 0 && place.averageRating !== null ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[#7770FF] font-bold" aria-hidden="true">★</span>
              <span className="font-semibold text-[#E8E8ED]">
                {place.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-[#A5A5B0]">
                · {place.reviewCount} {place.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#A5A5B0] italic">
              No reviews yet
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
