import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading places">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[6px] bg-[#191A1D] border border-[#303136] overflow-hidden flex flex-col"
        >
          {/* 3:2 placeholder box */}
          <div className="w-full aspect-[3/2] bg-[#303136]/50" />
          <div className="p-4 space-y-3">
            <div className="h-3 w-16 bg-[#303136]/50 rounded" />
            <div className="h-5 w-3/4 bg-[#303136]/50 rounded" />
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-full bg-[#303136]/50 rounded" />
              <div className="h-3 w-2/3 bg-[#303136]/50 rounded" />
            </div>
            <div className="pt-3 border-t border-[#303136] flex items-center justify-between">
              <div className="h-3 w-24 bg-[#303136]/50 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface EmptyStateProps {
  onResetCategory?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onResetCategory }) => {
  return (
    <div className="p-12 text-center rounded-[6px] bg-[#191A1D] border border-[#303136] max-w-lg mx-auto">
      <h3 className="text-lg font-semibold text-[#E8E8ED] font-serif">Nothing here yet.</h3>
      <p className="text-sm text-[#A5A5B0] mt-2">
        We couldn't find any places matching your current category filter.
      </p>
      {onResetCategory && (
        <button
          type="button"
          onClick={onResetCategory}
          className="mt-6 px-4 py-2 bg-[#A6A1F5] hover:bg-[#B8B4F8] text-[#101012] font-semibold text-xs rounded-[6px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A6A1F5]"
        >
          Show all places
        </button>
      )}
    </div>
  );
};

interface ErrorPanelProps {
  message: string;
  onRetry: () => void;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ message, onRetry }) => {
  return (
    <div className="p-6 rounded-[6px] bg-[#191A1D] border border-[#E5707E] text-center max-w-lg mx-auto">
      <div className="flex items-center justify-center gap-2 text-[#E5707E] mb-2 font-semibold text-sm">
        <span>⚠</span>
        <span>We couldn't load places.</span>
      </div>
      <p className="text-xs text-[#A5A5B0] mb-4 font-mono break-all">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-[#101012] hover:bg-[#303136] text-[#E8E8ED] font-semibold text-xs rounded-[6px] border border-[#303136] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A6A1F5]"
      >
        Try again
      </button>
    </div>
  );
};
