import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';

export interface SaveReviewInput {
  rating: number;
  body: string;
}

export interface ReviewResponsePayload {
  id: number;
  placeId: number;
  userId: number;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export class ReviewService {
  /**
   * Creates or updates a review for an acting user on a specific place.
   * Leverages Prisma's composite unique upsert on (place_id, user_id).
   */
  async saveReview(
    userId: number,
    placeId: number,
    data: SaveReviewInput
  ): Promise<{ review: ReviewResponsePayload }> {
    // 1. Ensure place exists
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true }
    });

    if (!place) {
      throw new NotFoundError('Place not found.');
    }

    // 2. Perform upsert on composite unique key
    const review = await prisma.review.upsert({
      where: {
        placeId_userId: {
          placeId,
          userId
        }
      },
      create: {
        placeId,
        userId,
        rating: data.rating,
        body: data.body
      },
      update: {
        rating: data.rating,
        body: data.body
      },
      select: {
        id: true,
        placeId: true,
        userId: true,
        rating: true,
        body: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      review: {
        id: review.id,
        placeId: review.placeId,
        userId: review.userId,
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString()
      }
    };
  }
}

export const reviewService = new ReviewService();
