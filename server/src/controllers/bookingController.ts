import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/bookingService.js';
import { parseId } from '../lib/validation.js';

export class BookingController {
  async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slotId = parseId(req.params.slotId, 'slot ID');
      const userId = req.user!.id;
      const seats = req.body?.seats;

      const result = await bookingService.bookSeats(userId, slotId, seats);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const bookingController = new BookingController();
