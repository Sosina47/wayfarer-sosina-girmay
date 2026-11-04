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
        className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors border focus:outline-none focus:ring-2 focus:ring-[#D9694A] ${
          !selectedCategory
            ? 'bg-[#302A25] border-[#D9694A] text-[#F3EBDD]'
            : 'bg-[#25201C] border-[#3A332C] text-[#C9BDAA] hover:bg-[#302A25] hover:text-[#F3EBDD]'
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors border focus:outline-none focus:ring-2 focus:ring-[#D9694A] ${
              isSelected
                ? 'bg-[#302A25] border-[#D9694A] text-[#F3EBDD]'
                : 'bg-[#25201C] border-[#3A332C] text-[#C9BDAA] hover:bg-[#302A25] hover:text-[#F3EBDD]'
            }`}
          >
            {category}
          </button>
        );
      })}
    </nav>
  );
};
