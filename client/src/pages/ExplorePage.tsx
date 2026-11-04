import React, { useState, useCallback } from 'react';
import { getCategories, getPlaces } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { AppHeader } from '../components/AppHeader.js';
import { CategoryFilter } from '../components/CategoryFilter.js';
import { SortSelect, SortMode } from '../components/SortSelect.js';
import { PlaceCard } from '../components/PlaceCard.js';
import { LoadingSkeleton, EmptyState, ErrorPanel } from '../components/StatusMessage.js';

export const ExplorePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [sortMode, setSortMode] = useState<SortMode>('top-rated');

  // Load distinct categories for the filter buttons
  const categoriesApi = useApi(getCategories, []);

  // Load places whenever category or sort mode changes
  const fetchPlaces = useCallback(() => {
    return getPlaces({
      category: selectedCategory,
      sort: sortMode
    });
  }, [selectedCategory, sortMode]);

  const placesApi = useApi(fetchPlaces, [fetchPlaces]);

  return (
    <div className="min-h-screen flex flex-col bg-[#161311] text-[#F3EBDD]">
      <AppHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Compact Heading Band */}
        <section className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#F3EBDD]">
            Explore Lisbon
          </h1>
          <p className="text-sm text-[#C9BDAA] mt-1">
            Honest ratings, fair bookings.
          </p>
        </section>

        {/* Controls Row: Category Filter on left, Sort on right */}
        <section className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 mb-8 border-b border-[#3A332C]">
          <CategoryFilter
            categories={categoriesApi.data?.categories || []}
            selectedCategory={selectedCategory}
            onSelectCategory={cat => setSelectedCategory(cat)}
            disabled={placesApi.loading}
          />

          <SortSelect
            value={sortMode}
            onChange={sort => setSortMode(sort)}
            disabled={placesApi.loading}
          />
        </section>

        {/* Dynamic States & Place Grid */}
        <section aria-label="Places List">
          {placesApi.loading && <LoadingSkeleton count={6} />}

          {placesApi.error && (
            <ErrorPanel
              message={placesApi.error.message}
              onRetry={() => placesApi.reload()}
            />
          )}

          {!placesApi.loading && !placesApi.error && placesApi.data && (
            <>
              {placesApi.data.places.length === 0 ? (
                <EmptyState onResetCategory={() => setSelectedCategory(undefined)} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {placesApi.data.places.map(place => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Synthetic Demonstration Data Notice (RV-8) */}
        <footer className="mt-16 pt-6 border-t border-[#3A332C] text-center">
          <p className="text-xs text-[#8F8374]">
            Reviews in this demo are synthetic demonstration data.
          </p>
        </footer>
      </main>
    </div>
  );
};
