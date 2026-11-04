import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/reviewService.js';
import { parseId, parseRating, parseReviewBody } from '../lib/validation.js';

export class ReviewController {
  async upsertReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const placeId = parseId(req.params.id, 'place ID');
      const userId = req.user!.id;
      const rating = parseRating(req.body?.rating);
      const body = parseReviewBody(req.body?.body);

      const result = await reviewService.saveReview(userId, placeId, { rating, body });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const reviewController = new ReviewController();
