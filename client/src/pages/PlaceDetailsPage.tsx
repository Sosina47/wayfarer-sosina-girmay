import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { getPlace, ApiError } from '../services/api.js';
import { useCurrentUser } from '../context/CurrentUserContext.js';
import { AppHeader } from '../components/AppHeader.js';
import { PlaceImage } from '../components/PlaceImage.js';
import { RatingSummary } from '../components/RatingSummary.js';
import { ReviewForm } from '../components/ReviewForm.js';
import { ReviewList } from '../components/ReviewList.js';
import { TourSlotList } from '../components/TourSlotList.js';

export const PlaceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useCurrentUser();

  const { data, error, loading, reload } = useApi(
    () => {
      if (!id) throw new Error('Missing place ID');
      return getPlace(id);
    },
    [id, currentUser?.id]
  );

  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <div className="min-h-screen bg-[#171512] text-[#E8DDC9] flex flex-col font-sans">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A99B89] hover:text-[#B17A43] transition-colors focus:outline-none focus:ring-1 focus:ring-[#B17A43] rounded px-1 py-0.5"
          >
            ← Back to Explore
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6 animate-pulse" aria-busy="true">
            <div className="h-48 sm:h-64 bg-[#30241D] rounded-[6px] border border-[#49372A]" />
            <div className="space-y-3">
              <div className="h-4 w-24 bg-[#30241D] rounded" />
              <div className="h-8 w-64 bg-[#30241D] rounded" />
              <div className="h-4 w-48 bg-[#30241D] rounded" />
              <div className="h-20 w-full bg-[#30241D] rounded" />
            </div>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div className="p-8 rounded-[6px] bg-[#30241D] border border-[#7A2E22] text-center max-w-lg mx-auto space-y-4">
            <h2 className="text-lg font-semibold text-[#F5B4A8] font-serif">
              {isNotFound ? "Place not found" : "Couldn't load place details"}
            </h2>
            <p className="text-sm text-[#A99B89]">
              {isNotFound
                ? "We couldn't find the attraction you're looking for. It may have been removed or the link is invalid."
                : error.message}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              {isNotFound ? (
                <Link
                  to="/"
                  className="px-4 py-2 rounded text-xs font-semibold bg-[#B17A43] text-[#171512] hover:bg-[#C58B50] transition-colors"
                >
                  Return to Explore
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={reload}
                  className="px-4 py-2 rounded text-xs font-semibold bg-[#B17A43] text-[#171512] hover:bg-[#C58B50] transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success Content */}
        {!loading && !error && data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Content Column */}
            <div className={data.tourSlots.length > 0 ? 'lg:col-span-8 space-y-8' : 'lg:col-span-12 max-w-3xl space-y-8'}>
              {/* Hero Image / Placeholder */}
              <div className="rounded-[6px] overflow-hidden border border-[#49372A] bg-[#30241D]">
                <PlaceImage
                  src={data.place.imageUrl}
                  alt={data.place.name}
                  category={data.place.category}
                  variant="hero"
                />
              </div>

              {/* Title & Metadata */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider text-[#B17A43] font-semibold block">
                  {data.place.category}
                </span>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#E8DDC9] font-serif">
                  {data.place.name}
                </h1>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#A99B89]">
                  <span>📍 {data.place.address}</span>
                  <span>⏱ {data.place.openingHours}</span>
                </div>

                <div className="pt-2">
                  <RatingSummary
                    averageRating={data.place.averageRating}
                    reviewCount={data.place.reviewCount}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="pt-2 border-t border-[#49372A]">
                <p className="text-sm text-[#A99B89] leading-relaxed">
                  {data.place.description}
                </p>
              </div>

              {/* Reviews Section */}
              <section className="pt-6 border-t border-[#49372A] space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#E8DDC9] font-serif">Reviews</h2>
                  <p className="text-xs text-[#A99B89] mt-1">
                    All reviews are synthetic demonstration data.
                  </p>
                </div>

                {/* Review Form */}
                <ReviewForm
                  placeId={data.place.id}
                  existingReview={data.myReview}
                  onReviewSaved={reload}
                />

                {/* Review List */}
                <div className="pt-2">
                  <ReviewList
                    reviews={data.reviews}
                    currentUserId={currentUser?.id ?? null}
                  />
                </div>
              </section>
            </div>

            {/* Sidebar Column: Tour Slot List (Only if tours exist) */}
            {data.tourSlots.length > 0 && (
              <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                <TourSlotList
                  slots={data.tourSlots}
                  onBookingSuccess={reload}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Synthetic Data Disclaimer */}
      <footer className="mt-auto border-t border-[#49372A] bg-[#171512] py-6 text-center text-xs text-[#A99B89]">
        Wayfarer Lisbon Edition · Reviews in this demo are synthetic demonstration data.
      </footer>
    </div>
  );
};
