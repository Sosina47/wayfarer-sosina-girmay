import { prisma } from '../lib/prisma.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';

export interface BookingResult {
  booking: {
    id: number;
    slotId: number;
    seats: number;
    createdAt: string;
  };
  slot: {
    id: number;
    capacity: number;
    seatsLeft: number;
  };
}

export class BookingService {
  /**
   * Naive read-then-insert implementation.
   * Vulnerable to race conditions under concurrent requests.
   */
  async bookSeats(userId: number, slotId: number, seats: number): Promise<BookingResult> {
    // 1. Read current slot state
    const slot = await prisma.tourSlot.findUnique({
      where: { id: slotId }
    });

    if (!slot) {
      throw new NotFoundError('Tour slot not found.');
    }

    const seatsLeft = slot.capacity - slot.bookedSeats;
    if (seatsLeft <= 0) {
      throw new ConflictError('SLOT_FULL', 'This tour is fully booked.', { seatsLeft: 0 });
    }

    if (seatsLeft < seats) {
      throw new ConflictError(
        'NOT_ENOUGH_SEATS',
        'Not enough seats available on this tour.',
        { seatsLeft }
      );
    }

    // 2. Unsafe separate insert and update
    const booking = await prisma.booking.create({
      data: {
        userId,
        slotId,
        seats
      }
    });

    const updatedSlot = await prisma.tourSlot.update({
      where: { id: slotId },
      data: {
        bookedSeats: {
          increment: seats
        }
      }
    });

    return {
      booking: {
        id: booking.id,
        slotId: booking.slotId,
        seats: booking.seats,
        createdAt: booking.createdAt.toISOString()
      },
      slot: {
        id: updatedSlot.id,
        capacity: updatedSlot.capacity,
        seatsLeft: updatedSlot.capacity - updatedSlot.bookedSeats
      }
    };
  }
}

export const bookingService = new BookingService();
