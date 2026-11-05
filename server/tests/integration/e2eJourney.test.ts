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

describe('Slice 5: End-to-End User Journey (wayfarer_test)', () => {
  let server: Server;

  beforeAll(async () => {
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

    // 1. Seed 3 Users
    await prisma.user.createMany({
      data: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
        { id: 3, name: 'Carla' }
      ]
    });

    // 2. Seed 2 Places
    await prisma.place.createMany({
      data: [
        {
          id: 1,
          name: 'Jerónimos Monastery',
          category: 'History',
          description: 'Historic Manueline monastery in Belém.',
          address: 'Praça do Império',
          openingHours: '10:00 - 17:30'
        },
        {
          id: 2,
          name: 'Pastelaria Brilho',
          category: 'Food & Drink',
          description: 'Pastry shop in Cais do Sodré.',
          address: 'Rua do Alecrim',
          openingHours: '08:00 - 20:00'
        }
      ]
    });

    // 3. Seed Tour Slot with capacity 4 (0 booked initially)
    await prisma.tourSlot.create({
      data: {
        id: 10,
        placeId: 1,
        startsAt: new Date('2026-11-10T14:00:00.000Z'),
        capacity: 4,
        bookedSeats: 0
      }
    });

    // 4. Initial review: Ana reviews Place 1 with 5 stars
    await prisma.review.create({
      data: {
        id: 101,
        placeId: 1,
        userId: 1,
        rating: 5,
        body: 'Magnificent architecture.'
      }
    });
  });

  it('completes the entire user journey: explore -> filter/sort -> details -> switch user -> review -> edit review -> book -> fill slot -> back to explore', async () => {
    // Step 1: Explore - load all places (default top-rated)
    const exploreRes = await request(server).get('/api/places');
    expect(exploreRes.status).toBe(200);
    expect(exploreRes.body.places).toHaveLength(2);
    const jeronimosExplore1 = exploreRes.body.places.find((p: any) => p.id === 1);
    expect(jeronimosExplore1.reviewCount).toBe(1);
    expect(jeronimosExplore1.averageRating).toBe(5.0);

    // Step 2: Filter by category
    const filterRes = await request(server).get('/api/places?category=History');
    expect(filterRes.status).toBe(200);
    expect(filterRes.body.places).toHaveLength(1);
    expect(filterRes.body.places[0].name).toBe('Jerónimos Monastery');

    // Step 3: Sort by name
    const sortRes = await request(server).get('/api/places?sort=name');
    expect(sortRes.status).toBe(200);
    expect(sortRes.body.places[0].name).toBe('Jerónimos Monastery');
    expect(sortRes.body.places[1].name).toBe('Pastelaria Brilho');

    // Step 4: Open Place Details (acting as Ana, user 1)
    const detailsRes1 = await request(server)
      .get('/api/places/1')
      .set('X-User-Id', '1');
    expect(detailsRes1.status).toBe(200);
    expect(detailsRes1.body.place.reviewCount).toBe(1);
    expect(detailsRes1.body.myReview).toMatchObject({
      rating: 5,
      body: 'Magnificent architecture.'
    });
    expect(detailsRes1.body.tourSlots[0]).toMatchObject({
      id: 10,
      capacity: 4,
      bookedSeats: 0,
      seatsLeft: 4
    });

    // Step 5: Switch user to Bruno (user 2) and verify details reflects no myReview
    const detailsRes2 = await request(server)
      .get('/api/places/1')
      .set('X-User-Id', '2');
    expect(detailsRes2.status).toBe(200);
    expect(detailsRes2.body.myReview).toBeNull();

    // Step 6: Bruno submits a review (rating: 3)
    const createReviewRes = await request(server)
      .put('/api/places/1/review')
      .set('X-User-Id', '2')
      .send({
        rating: 3,
        body: 'Impressive, but long lines in the afternoon.'
      });
    expect(createReviewRes.status).toBe(200);
    expect(createReviewRes.body.review.rating).toBe(3);

    // Step 7: Bruno edits the same review (rating: 4)
    const editReviewRes = await request(server)
      .put('/api/places/1/review')
      .set('X-User-Id', '2')
      .send({
        rating: 4,
        body: 'Updated: bought tickets online, much better experience!'
      });
    expect(editReviewRes.status).toBe(200);
    expect(editReviewRes.body.review.id).toBe(createReviewRes.body.review.id); // Same row
    expect(editReviewRes.body.review.rating).toBe(4);

    // Verify Place Details now shows reviewCount: 2 and averageRating: (5 + 4)/2 = 4.5
    const detailsAfterReview = await request(server)
      .get('/api/places/1')
      .set('X-User-Id', '2');
    expect(detailsAfterReview.body.place.reviewCount).toBe(2);
    expect(detailsAfterReview.body.place.averageRating).toBe(4.5);
    expect(detailsAfterReview.body.myReview).toMatchObject({
      rating: 4,
      body: 'Updated: bought tickets online, much better experience!'
    });

    // Step 8: Book seats - Bruno books 2 seats
    const bookRes1 = await request(server)
      .post('/api/slots/10/bookings')
      .set('X-User-Id', '2')
      .send({ seats: 2 });
    expect(bookRes1.status).toBe(201);
    expect(bookRes1.body.slot.seatsLeft).toBe(2);

    // Step 9: Carla (user 3) books remaining 2 seats to fill the slot
    const bookRes2 = await request(server)
      .post('/api/slots/10/bookings')
      .set('X-User-Id', '3')
      .send({ seats: 2 });
    expect(bookRes2.status).toBe(201);
    expect(bookRes2.body.slot.seatsLeft).toBe(0);

    // Attempt another booking when full -> returns 409 SLOT_FULL
    const bookFullRes = await request(server)
      .post('/api/slots/10/bookings')
      .set('X-User-Id', '1')
      .send({ seats: 1 });
    expect(bookFullRes.status).toBe(409);
    expect(bookFullRes.body.error.code).toBe('SLOT_FULL');
    expect(bookFullRes.body.error.details).toEqual({ seatsLeft: 0 });

    // Verify consistency invariant
    await assertSlotConsistent(prisma, 10);

    // Step 10: Return to Explore page -> data is updated
    const finalExploreRes = await request(server).get('/api/places');
    expect(finalExploreRes.status).toBe(200);
    const jeronimosFinal = finalExploreRes.body.places.find((p: any) => p.id === 1);
    expect(jeronimosFinal.reviewCount).toBe(2);
    expect(jeronimosFinal.averageRating).toBe(4.5);
  });
});
