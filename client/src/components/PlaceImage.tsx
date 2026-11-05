import React, { useState } from 'react';

interface PlaceImageProps {
  src: string | null;
  alt: string;
  category: string;
  variant?: 'card' | 'hero';
  className?: string;
}

export const PlaceImage: React.FC<PlaceImageProps> = ({
  src,
  alt,
  category,
  variant = 'card',
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  // If no source or error loading, show the designed architectural placeholder
  if (!src || hasError) {
    const isHero = variant === 'hero';

    return (
      <div
        className={`w-full select-none bg-[#302A25] border-b border-[#3A332C] flex flex-col items-center justify-center p-4 text-center ${
          isHero ? 'h-28 sm:h-32' : 'aspect-[3/2]'
        } ${className}`}
        aria-label={`${alt} placeholder`}
      >
        <span className="text-[11px] uppercase tracking-widest text-[#9BAE7F] font-semibold">
          {category}
        </span>
        <span className="text-xs text-[#8F8374] mt-1 line-clamp-1 max-w-[80%]">
          {alt}
        </span>
      </div>
    );
  }

  const containerClasses =
    variant === 'hero'
      ? 'w-full max-h-80 overflow-hidden bg-[#25201C] border-b border-[#3A332C]'
      : 'w-full aspect-[3/2] overflow-hidden bg-[#25201C] border-b border-[#3A332C]';

  return (
    <div className={`${containerClasses} ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-transform duration-200 ${
          variant === 'card' ? 'group-hover:scale-105' : ''
        }`}
        loading="lazy"
      />
    </div>
  );
};
