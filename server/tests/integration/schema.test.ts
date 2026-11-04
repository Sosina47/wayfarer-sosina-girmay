import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { assertSlotConsistent } from '../helpers/assertSlotConsistent.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

describe('Database Schema & Integrity Constraints (PostgreSQL)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createTestPlace() {
    return prisma.place.create({
      data: {
        name: 'Castelo de São Jorge',
        category: 'History',
        description: 'Historic hilltop castle.',
        address: 'R. de Santa Cruz do Castelo, 1100-129 Lisboa',
        openingHours: '09:00 - 18:00'
      }
    });
  }

  async function createTestUser(id = 1, name = 'Test User') {
    return prisma.user.create({
      data: { id, name }
    });
  }

  it('enforces rating CHECK constraint between 1 and 5', async () => {
    const user = await createTestUser();
    const place = await createTestPlace();

    // Valid ratings: 1 and 5 succeed
    await expect(
      prisma.review.create({
        data: { placeId: place.id, userId: user.id, rating: 5, body: 'Superb.' }
      })
    ).resolves.toBeDefined();

    const user2 = await createTestUser(2, 'Second User');

    // Rating 0 violates check constraint
    await expect(
      prisma.review.create({
        data: { placeId: place.id, userId: user2.id, rating: 0, body: 'Too low.' }
      })
    ).rejects.toThrow();

    const user3 = await createTestUser(3, 'Third User');

    // Rating 6 violates check constraint
    await expect(
      prisma.review.create({
        data: { placeId: place.id, userId: user3.id, rating: 6, body: 'Too high.' }
      })
    ).rejects.toThrow();
  });

  it('enforces composite unique constraint (one review per user per place)', async () => {
    const user = await createTestUser();
    const place = await createTestPlace();

    // First review succeeds
    await prisma.review.create({
      data: { placeId: place.id, userId: user.id, rating: 4, body: 'First review.' }
    });

    // Second review by same user for same place fails unique constraint
    await expect(
      prisma.review.create({
        data: { placeId: place.id, userId: user.id, rating: 5, body: 'Duplicate attempt.' }
      })
    ).rejects.toThrow(/unique constraint/i);
  });

  it('enforces tour slot capacity > 0 constraint', async () => {
    const place = await createTestPlace();

    await expect(
      prisma.tourSlot.create({
        data: {
          placeId: place.id,
          startsAt: new Date(Date.now() + 86400000),
          capacity: 0,
          bookedSeats: 0
        }
      })
    ).rejects.toThrow();
  });

  it('enforces tour slot booked_seats <= capacity CHECK constraint', async () => {
    const place = await createTestPlace();

    await expect(
      prisma.tourSlot.create({
        data: {
          placeId: place.id,
          startsAt: new Date(Date.now() + 86400000),
          capacity: 10,
          bookedSeats: 11 // Exceeds capacity
        }
      })
    ).rejects.toThrow();
  });

  it('enforces booking seats > 0 constraint', async () => {
    const user = await createTestUser();
    const place = await createTestPlace();
    const slot = await prisma.tourSlot.create({
      data: {
        placeId: place.id,
        startsAt: new Date(Date.now() + 86400000),
        capacity: 10,
        bookedSeats: 0
      }
    });

    await expect(
      prisma.booking.create({
        data: {
          slotId: slot.id,
          userId: user.id,
          seats: 0
        }
      })
    ).rejects.toThrow();
  });

  it('verifies the bookedSeats = SUM(booking.seats) invariant with assertSlotConsistent', async () => {
    const user1 = await createTestUser(1, 'User 1');
    const user2 = await createTestUser(2, 'User 2');
    const place = await createTestPlace();

    const slot = await prisma.tourSlot.create({
      data: {
        placeId: place.id,
        startsAt: new Date(Date.now() + 86400000),
        capacity: 10,
        bookedSeats: 5
      }
    });

    await prisma.booking.create({
      data: { slotId: slot.id, userId: user1.id, seats: 3 }
    });
    await prisma.booking.create({
      data: { slotId: slot.id, userId: user2.id, seats: 2 }
    });

    // Invariant holds: 3 + 2 = 5 == bookedSeats
    await expect(assertSlotConsistent(prisma, slot.id)).resolves.not.toThrow();

    // Artificially create inconsistency by changing counter directly
    await prisma.$executeRawUnsafe(
      `UPDATE tour_slots SET booked_seats = 6 WHERE id = ${slot.id}`
    );

    // Invariant fails: 5 != 6
    await expect(assertSlotConsistent(prisma, slot.id)).rejects.toThrow(
      /Detected inconsistent tour slots/
    );
  });
});
