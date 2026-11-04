import React, { useState } from 'react';

interface PlaceImageProps {
  src: string | null;
  alt: string;
  category: string;
  className?: string;
}

export const PlaceImage: React.FC<PlaceImageProps> = ({
  src,
  alt,
  category,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  // If no source or error loading, show the designed architectural placeholder
  if (!src || hasError) {
    return (
      <div
        className={`w-full aspect-[3/2] bg-[#302A25] border-b border-[#3A332C] flex flex-col items-center justify-center p-4 text-center select-none ${className}`}
        aria-label={`${alt} placeholder`}
      >
        <span className="text-xs uppercase tracking-widest text-[#9BAE7F] font-semibold">
          {category}
        </span>
        <span className="text-xs text-[#8F8374] mt-1 line-clamp-1 max-w-[80%]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full aspect-[3/2] overflow-hidden bg-[#25201C] border-b border-[#3A332C] ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
      />
    </div>
  );
};
