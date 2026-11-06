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
        className={`w-full select-none bg-[#191A1D] border-b border-[#303136] flex flex-col items-center justify-center p-4 text-center ${
          isHero ? 'h-28 sm:h-32' : 'aspect-[3/2]'
        } ${className}`}
        aria-label={`${alt} placeholder`}
      >
        <span className="text-[11px] uppercase tracking-widest text-[#8C86E8] font-semibold">
          {category}
        </span>
        <span className="text-xs text-[#A5A5B0] mt-1 line-clamp-1 max-w-[80%]">
          {alt}
        </span>
      </div>
    );
  }

  const isHero = variant === 'hero';

  const containerClasses = isHero
    ? 'w-full max-h-[440px] sm:max-h-[480px] overflow-hidden bg-[#101012] flex items-center justify-center'
    : 'w-full aspect-[3/2] overflow-hidden bg-[#191A1D] border-b border-[#303136]';

  const imgClasses = isHero
    ? 'max-h-[440px] sm:max-h-[480px] w-auto max-w-full h-auto object-contain'
    : 'w-full h-full object-cover transition-transform duration-200 group-hover:scale-105';

  return (
    <div className={`${containerClasses} ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={imgClasses}
        loading="lazy"
      />
    </div>
  );
};
