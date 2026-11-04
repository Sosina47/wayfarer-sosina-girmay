import { Router } from 'express';
import { placeController } from '../controllers/placeController.js';
import { attachUser } from '../middleware/attachUser.js';

export const placesRouter = Router();

placesRouter.get('/places', (req, res, next) => placeController.getPlaces(req, res, next));
placesRouter.get('/categories', (req, res, next) => placeController.getCategories(req, res, next));
placesRouter.get('/places/:id', attachUser, (req, res, next) => placeController.getPlaceById(req, res, next));
