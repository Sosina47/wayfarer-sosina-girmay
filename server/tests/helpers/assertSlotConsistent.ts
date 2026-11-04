import { PrismaClient } from '@prisma/client';

export interface InconsistentSlotRow {
  id: number;
  capacity: number;
  booked_seats: number;
  booked_sum: number;
}

/**
 * Verifies that the bookedSeats counter matches the sum of Booking records
 * and stays within [0, capacity] for all slots (or a specific slotId).
 */
export async function assertSlotConsistent(
  prisma: PrismaClient,
  slotId?: number
): Promise<void> {
  const whereClause = slotId !== undefined ? `WHERE s.id = ${Number(slotId)}` : '';

  const inconsistent = await prisma.$queryRawUnsafe<InconsistentSlotRow[]>(`
    SELECT
      s.id,
      s.capacity,
      s.booked_seats,
      COALESCE(SUM(b.seats), 0)::int AS booked_sum
    FROM tour_slots s
    LEFT JOIN bookings b ON b.slot_id = s.id
    ${whereClause}
    GROUP BY s.id
    HAVING s.booked_seats <> COALESCE(SUM(b.seats), 0)
       OR s.booked_seats < 0
       OR s.booked_seats > s.capacity;
  `);

  if (inconsistent.length > 0) {
    const details = inconsistent
      .map(
        row =>
          `Slot ${row.id}: bookedSeats=${row.booked_seats}, sum=${row.booked_sum}, capacity=${row.capacity}`
      )
      .join('; ');
    throw new Error(`[ConsistencyError] Detected inconsistent tour slots: ${details}`);
  }
}
