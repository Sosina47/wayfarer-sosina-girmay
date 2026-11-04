import { Router } from 'express';
import { placeController } from '../controllers/placeController.js';
import { reviewController } from '../controllers/reviewController.js';
import { attachUser } from '../middleware/attachUser.js';
import { requireUser } from '../middleware/requireUser.js';

export const placesRouter = Router();

placesRouter.get('/places', (req, res, next) => placeController.getPlaces(req, res, next));
placesRouter.get('/categories', (req, res, next) => placeController.getCategories(req, res, next));
placesRouter.get('/places/:id', attachUser, (req, res, next) => placeController.getPlaceById(req, res, next));
placesRouter.put('/places/:id/review', attachUser, requireUser, (req, res, next) => reviewController.upsertReview(req, res, next));
