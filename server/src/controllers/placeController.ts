import { Request, Response, NextFunction } from 'express';
import { placeService } from '../services/placeService.js';
import { parseCategory, parseId, parseSort } from '../lib/validation.js';

export class PlaceController {
  async getPlaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = parseCategory(req.query.category);
      const sort = parseSort(req.query.sort);

      const places = await placeService.listPlaces({ category, sort });
      res.status(200).json({ places });
    } catch (err) {
      next(err);
    }
  }

  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await placeService.listCategories();
      res.status(200).json({ categories });
    } catch (err) {
      next(err);
    }
  }

  async getPlaceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const placeId = parseId(req.params.id, 'place ID');
      const actingUserId = req.user?.id;

      const details = await placeService.getPlaceDetails(placeId, actingUserId);
      res.status(200).json(details);
    } catch (err) {
      next(err);
    }
  }
}

export const placeController = new PlaceController();
