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
        <label htmlFor="sort-select" className="text-xs text-[#A99B89] whitespace-nowrap">
          Sort by:
        </label>
        <select
          id="sort-select"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value as SortMode)}
          className="bg-[#30241D] text-[#E8DDC9] text-xs font-medium border border-[#49372A] rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B17A43] cursor-pointer"
        >
          <option value="top-rated">Top rated</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      {value === 'top-rated' && (
        <p className="text-[11px] text-[#A99B89] mt-1 text-right max-w-xs leading-tight">
          Ranked with review count in mind, so one 5★ review doesn't beat a well-reviewed favourite.
        </p>
      )}
    </div>
  );
};
