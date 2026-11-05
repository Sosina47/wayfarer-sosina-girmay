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
   * Reserves tour seats atomically using a conditional SQL UPDATE within an interactive transaction.
   *
   * Strategy:
   * 1. The conditional UPDATE atomically tests availability (booked_seats + seats <= capacity)
   *    and increments booked_seats in a single database operation.
   * 2. PostgreSQL row-level locks serialize concurrent requests for the same tour slot.
   *    Waiting transactions re-evaluate the WHERE condition against the committed row state.
   * 3. If 0 rows were updated, we query the slot to return a detailed 404 or 409 error
   *    and throw, triggering an immediate transaction rollback.
   * 4. If 1 row was updated, the Booking record is created within the same transaction,
   *    guaranteeing that bookedSeats and Booking records remain 100% consistent.
   */
  async bookSeats(userId: number, slotId: number, seats: number): Promise<BookingResult> {
    return prisma.$transaction(
      async tx => {
        // Step 1: Conditional atomic increment
        const affectedRows = await tx.$executeRaw`
          UPDATE tour_slots
          SET booked_seats = booked_seats + ${seats}
          WHERE id = ${slotId}
            AND booked_seats + ${seats} <= capacity;
        `;

        // Step 2 & 3: Handle 0 rows affected (slot missing or insufficient capacity)
        if (affectedRows === 0) {
          const slot = await tx.tourSlot.findUnique({
            where: { id: slotId }
          });

          if (!slot) {
            throw new NotFoundError('Tour slot not found.');
          }

          const seatsLeft = Math.max(0, slot.capacity - slot.bookedSeats);
          if (seatsLeft === 0) {
            throw new ConflictError('SLOT_FULL', 'This tour is fully booked.', {
              seatsLeft: 0
            });
          }

          throw new ConflictError(
            'NOT_ENOUGH_SEATS',
            'Not enough seats available on this tour.',
            { seatsLeft }
          );
        }

        // Step 4: 1 row affected -> insert Booking row in the same transaction
        const booking = await tx.booking.create({
          data: {
            userId,
            slotId,
            seats
          }
        });

        // Query updated slot state to return authoritative seatsLeft
        const updatedSlot = await tx.tourSlot.findUniqueOrThrow({
          where: { id: slotId },
          select: {
            id: true,
            capacity: true,
            bookedSeats: true
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
            seatsLeft: Math.max(0, updatedSlot.capacity - updatedSlot.bookedSeats)
          }
        };
      },
      {
        // Explicit interactive transaction timeouts:
        // maxWait: Maximum time (ms) to wait to acquire a connection from the pool under concurrency
        maxWait: 5000,
        // timeout: Maximum execution time (ms) for the entire interactive transaction callback
        timeout: 10000
      }
    );
  }
}

export const bookingService = new BookingService();
