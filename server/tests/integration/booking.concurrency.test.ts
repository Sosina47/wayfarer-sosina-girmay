import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { Server } from 'node:http';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app.js';
import { resetDatabase } from '../helpers/resetDatabase.js';
import { assertSlotConsistent } from '../helpers/assertSlotConsistent.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

describe('Tour Booking Concurrency Tests (wayfarer_test)', () => {
  let server: Server;

  beforeAll(async () => {
    // Start listening on ephemeral port so all concurrent requests share the same server
    await new Promise<void>(resolve => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  // --- Scenario A: Core last-seat concurrency test ---
  it('Scenario A: 20 simultaneous requests for 2 remaining seats results in exactly 2 bookings and 18 rejections with no overbooking', async () => {
    // 1. Seed 3 Users
    await prisma.user.createMany({
      data: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
        { id: 3, name: 'Carla' }
      ]
    });

    // 2. Seed Place
    await prisma.place.create({
      data: {
        id: 1,
        name: 'Jerónimos Monastery',
        category: 'History',
        description: 'Historic Manueline monastery.',
        address: 'Praça do Império',
        openingHours: '10:00 - 17:30'
      }
    });

    // 3. Seed TourSlot with capacity 10, already 8 seats booked
    const slot = await prisma.tourSlot.create({
      data: {
        id: 10,
        placeId: 1,
        startsAt: new Date('2026-11-06T10:00:00.000Z'),
        capacity: 10,
        bookedSeats: 8
      }
    });

    // 4. Seed initial bookings totaling 8 seats so invariant holds from the start
    await prisma.booking.createMany({
      data: [
        { id: 101, slotId: 10, userId: 1, seats: 4 },
        { id: 102, slotId: 10, userId: 2, seats: 4 }
      ]
    });

    // Verify baseline invariant
    await assertSlotConsistent(prisma, slot.id);

    // 5. Fire 20 simultaneous POST requests for 1 seat each
    const userIds = [1, 2, 3];
    const totalRequests = 20;

    const requestPromises = Array.from({ length: totalRequests }, (_, idx) => {
      const actingUserId = userIds[idx % userIds.length];
      return request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', String(actingUserId))
        .send({ seats: 1 });
    });

    const responses = await Promise.all(requestPromises);

    // Analyze status codes
    const successResponses = responses.filter(r => r.status === 201);
    const conflictResponses = responses.filter(r => r.status === 409);
    const serverErrorResponses = responses.filter(r => r.status === 500);

    // Invariant assertions
    expect(serverErrorResponses).toHaveLength(0);
    expect(responses.every(r => r.status === 201 || r.status === 409)).toBe(true);

    // Exactly 2 successes, 18 rejections
    expect(successResponses).toHaveLength(2);
    expect(conflictResponses).toHaveLength(18);

    // All conflict responses must be SLOT_FULL
    for (const res of conflictResponses) {
      expect(res.body.error.code).toBe('SLOT_FULL');
      expect(res.body.error.details).toEqual({ seatsLeft: 0 });
    }

    // Database state assertions
    const finalSlot = await prisma.tourSlot.findUniqueOrThrow({
      where: { id: slot.id }
    });

    expect(finalSlot.bookedSeats).toBe(10);

    const allBookings = await prisma.booking.findMany({
      where: { slotId: slot.id }
    });

    expect(allBookings).toHaveLength(4); // 2 initial + 2 new
    const totalBookedSum = allBookings.reduce((sum, b) => sum + b.seats, 0);
    expect(totalBookedSum).toBe(10);

    // Strict PostgreSQL consistency invariant check
    await assertSlotConsistent(prisma, slot.id);
  });
});
