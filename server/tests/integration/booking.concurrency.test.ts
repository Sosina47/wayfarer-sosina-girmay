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

    // Standard baseline users & place
    await prisma.user.createMany({
      data: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
        { id: 3, name: 'Carla' }
      ]
    });

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
  });

  // --- Scenario A: Core last-seat concurrency test ---
  it('Scenario A: 20 simultaneous requests for 2 remaining seats results in exactly 2 bookings and 18 rejections with no overbooking', async () => {
    const slot = await prisma.tourSlot.create({
      data: {
        id: 10,
        placeId: 1,
        startsAt: new Date('2026-11-06T10:00:00.000Z'),
        capacity: 10,
        bookedSeats: 8
      }
    });

    // Seed initial bookings totaling 8 seats so invariant holds from the start
    await prisma.booking.createMany({
      data: [
        { id: 101, slotId: 10, userId: 1, seats: 4 },
        { id: 102, slotId: 10, userId: 2, seats: 4 }
      ]
    });

    await assertSlotConsistent(prisma, slot.id);

    // 20 simultaneous POST requests for 1 seat each
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

    const successResponses = responses.filter(r => r.status === 201);
    const conflictResponses = responses.filter(r => r.status === 409);
    const serverErrorResponses = responses.filter(r => r.status === 500);

    expect(serverErrorResponses).toHaveLength(0);
    expect(responses.every(r => r.status === 201 || r.status === 409)).toBe(true);

    expect(successResponses).toHaveLength(2);
    expect(conflictResponses).toHaveLength(18);

    for (const res of conflictResponses) {
      expect(res.body.error.code).toBe('SLOT_FULL');
      expect(res.body.error.details).toEqual({ seatsLeft: 0 });
    }

    const finalSlot = await prisma.tourSlot.findUniqueOrThrow({
      where: { id: slot.id }
    });

    expect(finalSlot.bookedSeats).toBe(10);

    const allBookings = await prisma.booking.findMany({
      where: { slotId: slot.id }
    });

    expect(allBookings).toHaveLength(4);
    const totalBookedSum = allBookings.reduce((sum, b) => sum + b.seats, 0);
    expect(totalBookedSum).toBe(10);

    await assertSlotConsistent(prisma, slot.id);
  });

  // --- Scenario B: Mixed sizes ---
  it('Scenario B: 10 simultaneous requests for 2 seats on a slot with 3 remaining seats allows exactly 1 booking', async () => {
    const slot = await prisma.tourSlot.create({
      data: {
        id: 20,
        placeId: 1,
        startsAt: new Date('2026-11-06T14:00:00.000Z'),
        capacity: 10,
        bookedSeats: 7
      }
    });

    await prisma.booking.create({
      data: { id: 201, slotId: 20, userId: 1, seats: 7 }
    });

    await assertSlotConsistent(prisma, slot.id);

    // 10 simultaneous requests for 2 seats each
    const requestPromises = Array.from({ length: 10 }, (_, idx) => {
      const actingUserId = (idx % 3) + 1;
      return request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', String(actingUserId))
        .send({ seats: 2 });
    });

    const responses = await Promise.all(requestPromises);

    const successResponses = responses.filter(r => r.status === 201);
    const conflictResponses = responses.filter(r => r.status === 409);

    expect(successResponses).toHaveLength(1);
    expect(conflictResponses).toHaveLength(9);

    // Exactly 1 seat remains, so subsequent conflicts are NOT_ENOUGH_SEATS with seatsLeft: 1
    for (const res of conflictResponses) {
      expect(res.body.error.code).toBe('NOT_ENOUGH_SEATS');
      expect(res.body.error.details).toEqual({ seatsLeft: 1 });
    }

    const finalSlot = await prisma.tourSlot.findUniqueOrThrow({
      where: { id: slot.id }
    });

    expect(finalSlot.bookedSeats).toBe(9); // 7 + 2

    const allBookings = await prisma.booking.findMany({
      where: { slotId: slot.id }
    });
    expect(allBookings).toHaveLength(2); // 1 initial (7) + 1 new (2)

    await assertSlotConsistent(prisma, slot.id);
  });

  // --- Scenario C: Failed booking leaves no trace ---
  it('Scenario C: A rejected booking rolls back cleanly, leaving bookedSeats and Booking records intact', async () => {
    const slot = await prisma.tourSlot.create({
      data: {
        id: 30,
        placeId: 1,
        startsAt: new Date('2026-11-06T16:00:00.000Z'),
        capacity: 5,
        bookedSeats: 4
      }
    });

    await prisma.booking.create({
      data: { id: 301, slotId: 30, userId: 1, seats: 4 }
    });

    await assertSlotConsistent(prisma, slot.id);

    // Attempt booking 2 seats when only 1 is left
    const res = await request(server)
      .post(`/api/slots/${slot.id}/bookings`)
      .set('X-User-Id', '2')
      .send({ seats: 2 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_ENOUGH_SEATS');
    expect(res.body.error.details).toEqual({ seatsLeft: 1 });

    const finalSlot = await prisma.tourSlot.findUniqueOrThrow({
      where: { id: slot.id }
    });

    expect(finalSlot.bookedSeats).toBe(4); // Unchanged

    const count = await prisma.booking.count({ where: { slotId: slot.id } });
    expect(count).toBe(1);

    await assertSlotConsistent(prisma, slot.id);
  });

  // --- Additional Booking Rules & Boundary Tests ---
  describe('Business Rules, Validation & Errors', () => {
    it('successfully books seats, returns 201, and calculates seatsLeft accurately', async () => {
      const slot = await prisma.tourSlot.create({
        data: {
          id: 40,
          placeId: 1,
          startsAt: new Date('2026-11-07T10:00:00.000Z'),
          capacity: 10,
          bookedSeats: 0
        }
      });

      const res = await request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', '1')
        .send({ seats: 3 });

      expect(res.status).toBe(201);
      expect(res.body.booking).toMatchObject({
        slotId: 40,
        seats: 3
      });
      expect(res.body.slot).toEqual({
        id: 40,
        capacity: 10,
        seatsLeft: 7
      });

      await assertSlotConsistent(prisma, 40);
    });

    it('allows multiple bookings by the same user for the same tour slot', async () => {
      const slot = await prisma.tourSlot.create({
        data: {
          id: 50,
          placeId: 1,
          startsAt: new Date('2026-11-07T12:00:00.000Z'),
          capacity: 10,
          bookedSeats: 0
        }
      });

      const res1 = await request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', '1')
        .send({ seats: 2 });
      expect(res1.status).toBe(201);

      const res2 = await request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', '1')
        .send({ seats: 2 });
      expect(res2.status).toBe(201);

      const bookings = await prisma.booking.findMany({
        where: { slotId: 50, userId: 1 }
      });
      expect(bookings).toHaveLength(2);
      await assertSlotConsistent(prisma, 50);
    });

    it('rejects 11 seats even when the slot has unlimited capacity (backend authority)', async () => {
      const slot = await prisma.tourSlot.create({
        data: {
          id: 60,
          placeId: 1,
          startsAt: new Date('2026-11-07T14:00:00.000Z'),
          capacity: 50,
          bookedSeats: 0
        }
      });

      const res = await request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', '1')
        .send({ seats: 11 });

      expect(res.status).toBe(400);
      expect(res.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Cannot book more than 10 seats per booking.',
        details: { maxSeats: 10 }
      });

      await assertSlotConsistent(prisma, 60);
    });

    it('accepts 10 seats when exactly 10 seats remain', async () => {
      const slot = await prisma.tourSlot.create({
        data: {
          id: 70,
          placeId: 1,
          startsAt: new Date('2026-11-07T16:00:00.000Z'),
          capacity: 10,
          bookedSeats: 0
        }
      });

      const res = await request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', '1')
        .send({ seats: 10 });

      expect(res.status).toBe(201);
      expect(res.body.slot.seatsLeft).toBe(0);
      await assertSlotConsistent(prisma, 70);
    });

    it('rejects 10 seats with 409 NOT_ENOUGH_SEATS when fewer than 10 remain', async () => {
      const slot = await prisma.tourSlot.create({
        data: {
          id: 80,
          placeId: 1,
          startsAt: new Date('2026-11-07T18:00:00.000Z'),
          capacity: 10,
          bookedSeats: 2 // 8 left
        }
      });

      await prisma.booking.create({
        data: { id: 801, slotId: 80, userId: 1, seats: 2 }
      });

      const res = await request(server)
        .post(`/api/slots/${slot.id}/bookings`)
        .set('X-User-Id', '2')
        .send({ seats: 10 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('NOT_ENOUGH_SEATS');
      expect(res.body.error.details).toEqual({ seatsLeft: 8 });
      await assertSlotConsistent(prisma, 80);
    });

    it('rejects invalid seat inputs (0, negative, fractional, strings, null, missing)', async () => {
      const invalidSeats = [0, -1, 1.5, '2', 'five', null, undefined];

      for (const seats of invalidSeats) {
        const res = await request(server)
          .post('/api/slots/10/bookings')
          .set('X-User-Id', '1')
          .send({ seats });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns 404 NOT_FOUND for unknown slot ID', async () => {
      const res = await request(server)
        .post('/api/slots/999/bookings')
        .set('X-User-Id', '1')
        .send({ seats: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('requires X-User-Id with 401 USER_REQUIRED when omitted', async () => {
      const res = await request(server)
        .post('/api/slots/10/bookings')
        .send({ seats: 1 });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('USER_REQUIRED');
    });

    it('rejects invalid or non-existent X-User-Id with 401 INVALID_USER', async () => {
      const res1 = await request(server)
        .post('/api/slots/10/bookings')
        .set('X-User-Id', '999')
        .send({ seats: 1 });
      expect(res1.status).toBe(401);
      expect(res1.body.error.code).toBe('INVALID_USER');

      const res2 = await request(server)
        .post('/api/slots/10/bookings')
        .set('X-User-Id', 'abc')
        .send({ seats: 1 });
      expect(res2.status).toBe(401);
      expect(res2.body.error.code).toBe('INVALID_USER');
    });
  });
});
