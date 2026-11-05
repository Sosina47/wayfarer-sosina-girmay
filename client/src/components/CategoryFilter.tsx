import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory?: string;
  onSelectCategory: (category?: string) => void;
  disabled?: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  disabled = false
}) => {
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Filter places by category">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelectCategory(undefined)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors border focus:outline-none focus:ring-2 focus:ring-[#B17A43] ${
          !selectedCategory
            ? 'bg-[#30241D] border-[#B17A43] text-[#E8DDC9] shadow-sm'
            : 'bg-[#30241D] border-[#49372A] text-[#A99B89] hover:border-[#76502F] hover:text-[#E8DDC9]'
        }`}
      >
        All Places
      </button>

      {categories.map(category => {
        const isSelected = selectedCategory === category;
        return (
          <button
            key={category}
            type="button"
            disabled={disabled}
            onClick={() => onSelectCategory(isSelected ? undefined : category)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors border focus:outline-none focus:ring-2 focus:ring-[#B17A43] ${
              isSelected
                ? 'bg-[#30241D] border-[#B17A43] text-[#E8DDC9] shadow-sm'
                : 'bg-[#30241D] border-[#49372A] text-[#A99B89] hover:border-[#76502F] hover:text-[#E8DDC9]'
            }`}
          >
            {category}
          </button>
        );
      })}
    </nav>
  );
};
