import { Router } from 'express';
import { bookingController } from '../controllers/bookingController.js';
import { attachUser } from '../middleware/attachUser.js';
import { requireUser } from '../middleware/requireUser.js';

export const bookingsRouter = Router();

bookingsRouter.post(
  '/slots/:slotId/bookings',
  attachUser,
  requireUser,
  (req, res, next) => bookingController.createBooking(req, res, next)
);
