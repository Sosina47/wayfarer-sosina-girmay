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
        className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors border focus:outline-none focus:ring-2 focus:ring-[#7770FF] ${
          !selectedCategory
            ? 'bg-[#191A1D] border-[#7770FF] text-[#E8E8ED] shadow-sm'
            : 'bg-[#191A1D] border-[#303136] text-[#A5A5B0] hover:border-[#6558E8] hover:text-[#E8E8ED]'
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors border focus:outline-none focus:ring-2 focus:ring-[#7770FF] ${
              isSelected
                ? 'bg-[#191A1D] border-[#7770FF] text-[#E8E8ED] shadow-sm'
                : 'bg-[#191A1D] border-[#303136] text-[#A5A5B0] hover:border-[#6558E8] hover:text-[#E8E8ED]'
            }`}
          >
            {category}
          </button>
        );
      })}
    </nav>
  );
};
