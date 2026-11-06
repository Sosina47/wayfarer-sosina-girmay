import React from 'react';

export type SortMode = 'top-rated' | 'name';

interface SortSelectProps {
  value: SortMode;
  onChange: (sort: SortMode) => void;
  disabled?: boolean;
}

export const SortSelect: React.FC<SortSelectProps> = ({ value, onChange, disabled = false }) => {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-xs text-[#A5A5B0] whitespace-nowrap">
          Sort by:
        </label>
        <select
          id="sort-select"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value as SortMode)}
          className="bg-[#191A1D] text-[#E8E8ED] text-xs font-medium border border-[#303136] rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#A6A1F5] cursor-pointer"
        >
          <option value="top-rated">Top rated</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>
    </div>
  );
};
