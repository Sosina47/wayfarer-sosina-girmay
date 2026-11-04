import { prisma } from '../lib/prisma.js';
import {
  calculateRankingScore,
  comparePlacesTopRated,
  comparePlacesName,
  NEUTRAL_PRIOR_RATING,
  PlaceForRanking
} from '../lib/ranking.js';
import { SortOption } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

export interface ListPlacesOptions {
  category?: string;
  sort?: SortOption;
}

export interface ReviewDetail {
  id: number;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
  };
}

export interface TourSlotDetail {
  id: number;
  startsAt: string;
  capacity: number;
  bookedSeats: number;
  seatsLeft: number;
}

export interface MyReviewDetail {
  id: number;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceDetailsResult {
  place: {
    id: number;
    name: string;
    category: string;
    description: string;
    address: string;
    openingHours: string;
    imageUrl: string | null;
    reviewCount: number;
    averageRating: number | null;
  };
  reviews: ReviewDetail[];
  tourSlots: TourSlotDetail[];
  myReview: MyReviewDetail | null;
}

export class PlaceService {
  /**
   * Retrieves places with category filtering and Bayesian ranking, sorted deterministically.
   */
  async listPlaces(options: ListPlacesOptions = {}): Promise<PlaceForRanking[]> {
    const { category, sort = 'top-rated' } = options;

    // 1. Query global average rating across ALL reviews (independent of category filter)
    const globalAgg = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { id: true }
    });

    const globalAverage =
      globalAgg._count.id > 0 && globalAgg._avg.rating !== null
        ? globalAgg._avg.rating
        : NEUTRAL_PRIOR_RATING;

    // 2. Query review statistics grouped by place (avoids N+1 queries)
    const reviewStats = await prisma.review.groupBy({
      by: ['placeId'],
      _avg: { rating: true },
      _count: { id: true }
    });

    const statsMap = new Map<number, { count: number; avg: number }>();
    for (const stat of reviewStats) {
      if (stat._avg.rating !== null) {
        statsMap.set(stat.placeId, {
          count: stat._count.id,
          avg: stat._avg.rating
        });
      }
    }

    // 3. Fetch places matching category filter
    const places = await prisma.place.findMany({
      where: category ? { category } : undefined,
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        imageUrl: true
      }
    });

    // 4. Attach stats and calculate Bayesian weighted score
    const rankedPlaces: PlaceForRanking[] = places.map(place => {
      const stats = statsMap.get(place.id);
      const reviewCount = stats ? stats.count : 0;
      const rawAvg = stats ? stats.avg : null;
      const averageRating = rawAvg !== null ? Number(rawAvg.toFixed(2)) : null;

      const score = calculateRankingScore(reviewCount, rawAvg, globalAverage);

      return {
        id: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        imageUrl: place.imageUrl,
        reviewCount,
        averageRating,
        score
      };
    });

    // 5. Deterministic sorting in backend
    if (sort === 'name') {
      rankedPlaces.sort(comparePlacesName);
    } else {
      rankedPlaces.sort(comparePlacesTopRated);
    }

    return rankedPlaces;
  }

  /**
   * Retrieves all distinct category names in alphabetical order.
   */
  async listCategories(): Promise<string[]> {
    const results = await prisma.place.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    return results.map(r => r.category);
  }

  /**
   * Retrieves detailed place information, reviews, tour slots, and acting user's review.
   */
  async getPlaceDetails(placeId: number, actingUserId?: number): Promise<PlaceDetailsResult> {
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      include: {
        reviews: {
          select: {
            id: true,
            rating: true,
            body: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        tourSlots: {
          select: {
            id: true,
            startsAt: true,
            capacity: true,
            bookedSeats: true
          },
          orderBy: { startsAt: 'asc' }
        }
      }
    });

    if (!place) {
      throw new NotFoundError('Place not found.');
    }

    const reviewCount = place.reviews.length;
    let averageRating: number | null = null;
    if (reviewCount > 0) {
      const sum = place.reviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = Number((sum / reviewCount).toFixed(2));
    }

    const formattedReviews: ReviewDetail[] = place.reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: r.user
    }));

    const formattedSlots: TourSlotDetail[] = place.tourSlots.map(s => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      capacity: s.capacity,
      bookedSeats: s.bookedSeats,
      seatsLeft: Math.max(0, s.capacity - s.bookedSeats)
    }));

    let myReview: MyReviewDetail | null = null;
    if (actingUserId !== undefined) {
      const userReview = place.reviews.find(r => r.user.id === actingUserId);
      if (userReview) {
        myReview = {
          id: userReview.id,
          rating: userReview.rating,
          body: userReview.body,
          createdAt: userReview.createdAt.toISOString(),
          updatedAt: userReview.updatedAt.toISOString()
        };
      }
    }

    return {
      place: {
        id: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        address: place.address,
        openingHours: place.openingHours,
        imageUrl: place.imageUrl,
        reviewCount,
        averageRating
      },
      reviews: formattedReviews,
      tourSlots: formattedSlots,
      myReview
    };
  }
}

export const placeService = new PlaceService();
