import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app.js';
import { resetDatabase } from '../helpers/resetDatabase.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

describe('Place Details, Reviews & Acting-as Identity Integration Tests (wayfarer_test)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedDeterministicFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedDeterministicFixtures() {
    // 3 Test Users
    await prisma.user.createMany({
      data: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
        { id: 3, name: 'Carla' }
      ]
    });

    // 2 Test Places (one with tours & reviews, one empty)
    await prisma.place.createMany({
      data: [
        {
          id: 1,
          name: 'Jerónimos Monastery',
          category: 'History',
          description: 'Historic Manueline monastery in Belém.',
          address: 'Praça do Império 1400-206 Lisboa',
          openingHours: '10:00 - 17:30 (Closed Mondays)',
          imageUrl: '/places/jeronimos.jpg'
        },
        {
          id: 2,
          name: 'Belém Tower',
          category: 'History',
          description: 'Fortified tower on the Tagus river.',
          address: 'Av. Brasília 1400-038 Lisboa',
          openingHours: '10:00 - 17:30',
          imageUrl: null
        }
      ]
    });

    // Tour Slot for Place 1
    await prisma.tourSlot.create({
      data: {
        id: 10,
        placeId: 1,
        startsAt: new Date('2026-11-05T14:00:00.000Z'),
        capacity: 15,
        bookedSeats: 5
      }
    });

    // Initial review: Ana reviews Jerónimos Monastery
    await prisma.review.create({
      data: {
        id: 100,
        placeId: 1,
        userId: 1,
        rating: 4,
        body: 'Incredible architecture and cloister walk.'
      }
    });
  }

  // --- 1. Identity & Users Endpoint ---
  describe('Acting-as User Endpoint & Middleware', () => {
    it('GET /api/users returns all seeded users ordered by id', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
        { id: 3, name: 'Carla' }
      ]);
    });

    it('rejects invalid or non-numeric X-User-Id header with 401 INVALID_USER', async () => {
      const res1 = await request(app)
        .get('/api/places/1')
        .set('X-User-Id', 'invalid-id');

      expect(res1.status).toBe(401);
      expect(res1.body.error).toEqual({
        code: 'INVALID_USER',
        message: 'Acting user specified in X-User-Id is invalid.'
      });

      const res2 = await request(app)
        .get('/api/places/1')
        .set('X-User-Id', '0');

      expect(res2.status).toBe(401);
      expect(res2.body.error.code).toBe('INVALID_USER');
    });

    it('rejects non-existent X-User-Id header with 401 INVALID_USER', async () => {
      const res = await request(app)
        .get('/api/places/1')
        .set('X-User-Id', '999');

      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: 'INVALID_USER',
        message: 'Acting user specified in X-User-Id does not exist.'
      });
    });

    it('requires X-User-Id on PUT /api/places/:id/review with 401 USER_REQUIRED', async () => {
      const res = await request(app)
        .put('/api/places/1/review')
        .send({ rating: 5, body: 'Missing user header review.' });

      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({
        code: 'USER_REQUIRED',
        message: 'Acting user header X-User-Id is required.'
      });
    });
  });

  // --- 2. Place Details Endpoint ---
  describe('GET /api/places/:id', () => {
    it('returns place details, reviews, tourSlots, and null myReview when no user is acting', async () => {
      const res = await request(app).get('/api/places/1');

      expect(res.status).toBe(200);
      expect(res.body.place).toMatchObject({
        id: 1,
        name: 'Jerónimos Monastery',
        category: 'History',
        address: 'Praça do Império 1400-206 Lisboa',
        openingHours: '10:00 - 17:30 (Closed Mondays)',
        reviewCount: 1,
        averageRating: 4.0
      });

      expect(res.body.reviews).toHaveLength(1);
      expect(res.body.reviews[0]).toMatchObject({
        id: 100,
        rating: 4,
        body: 'Incredible architecture and cloister walk.',
        user: { id: 1, name: 'Ana' }
      });

      expect(res.body.tourSlots).toEqual([
        {
          id: 10,
          startsAt: '2026-11-05T14:00:00.000Z',
          capacity: 15,
          bookedSeats: 5,
          seatsLeft: 10
        }
      ]);

      expect(res.body.myReview).toBeNull();
    });

    it('returns populated myReview when acting user has already reviewed the place', async () => {
      const res = await request(app)
        .get('/api/places/1')
        .set('X-User-Id', '1'); // Ana

      expect(res.status).toBe(200);
      expect(res.body.myReview).toMatchObject({
        id: 100,
        rating: 4,
        body: 'Incredible architecture and cloister walk.'
      });
    });

    it('returns myReview null when acting user has not reviewed this place', async () => {
      const res = await request(app)
        .get('/api/places/1')
        .set('X-User-Id', '2'); // Bruno

      expect(res.status).toBe(200);
      expect(res.body.myReview).toBeNull();
    });

    it('returns empty reviews and empty tourSlots for a place with none', async () => {
      const res = await request(app).get('/api/places/2');

      expect(res.status).toBe(200);
      expect(res.body.place.reviewCount).toBe(0);
      expect(res.body.place.averageRating).toBeNull();
      expect(res.body.reviews).toEqual([]);
      expect(res.body.tourSlots).toEqual([]);
      expect(res.body.myReview).toBeNull();
    });

    it('returns 404 NOT_FOUND for unknown place ID', async () => {
      const res = await request(app).get('/api/places/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({
        code: 'NOT_FOUND',
        message: 'Place not found.'
      });
    });

    it('returns 400 VALIDATION_ERROR for non-numeric place ID', async () => {
      const res = await request(app).get('/api/places/not-a-number');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // --- 3. Review Creation & Updating ---
  describe('PUT /api/places/:id/review', () => {
    it('creates a new review for an acting user and recalculates averages', async () => {
      const res = await request(app)
        .put('/api/places/1/review')
        .set('X-User-Id', '2') // Bruno
        .send({
          rating: 5,
          body: 'Sublime vaulted ceilings and peaceful ambiance.'
        });

      expect(res.status).toBe(200);
      expect(res.body.review).toMatchObject({
        placeId: 1,
        userId: 2,
        rating: 5,
        body: 'Sublime vaulted ceilings and peaceful ambiance.'
      });

      // Confirm GET /api/places/1 reflects updated counts and average
      // Previous rating was 4 (Ana), new is 5 (Bruno) -> sum 9 / 2 = 4.5
      const detailRes = await request(app)
        .get('/api/places/1')
        .set('X-User-Id', '2');

      expect(detailRes.body.place.reviewCount).toBe(2);
      expect(detailRes.body.place.averageRating).toBe(4.5);
      expect(detailRes.body.reviews).toHaveLength(2);
      // Newest first
      expect(detailRes.body.reviews[0].user.name).toBe('Bruno');
      expect(detailRes.body.myReview).toMatchObject({
        rating: 5,
        body: 'Sublime vaulted ceilings and peaceful ambiance.'
      });
    });

    it('updates an existing review without duplicating the row', async () => {
      // Ana initially had rating 4, body 'Incredible architecture...' (review id: 100)
      const updateRes = await request(app)
        .put('/api/places/1/review')
        .set('X-User-Id', '1') // Ana
        .send({
          rating: 5,
          body: 'Updated review: even better after morning light.'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.review.id).toBe(100); // Same review ID
      expect(updateRes.body.review.rating).toBe(5);
      expect(updateRes.body.review.body).toBe('Updated review: even better after morning light.');

      // Review count must STILL be 1, not 2
      const detailRes = await request(app).get('/api/places/1');
      expect(detailRes.body.place.reviewCount).toBe(1);
      expect(detailRes.body.place.averageRating).toBe(5.0);
      expect(detailRes.body.reviews).toHaveLength(1);

      // Verify row count directly in database is strictly 1
      const totalReviewsInDb = await prisma.review.count({
        where: { placeId: 1, userId: 1 }
      });
      expect(totalReviewsInDb).toBe(1);
    });

    it('trims review body before validating and persisting', async () => {
      const res = await request(app)
        .put('/api/places/1/review')
        .set('X-User-Id', '3') // Carla
        .send({
          rating: 3,
          body: '   Padded with leading and trailing spaces.   '
        });

      expect(res.status).toBe(200);
      expect(res.body.review.body).toBe('Padded with leading and trailing spaces.');

      // DB check
      const persisted = await prisma.review.findUnique({
        where: { placeId_userId: { placeId: 1, userId: 3 } }
      });
      expect(persisted?.body).toBe('Padded with leading and trailing spaces.');
    });

    it('returns 404 NOT_FOUND when attempting to review a non-existent place', async () => {
      const res = await request(app)
        .put('/api/places/999/review')
        .set('X-User-Id', '1')
        .send({ rating: 5, body: 'Ghost place review.' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    // --- Validation Edge Cases ---
    describe('Input Validation Constraints', () => {
      it('rejects invalid ratings (out of bounds, non-integer, strings, null)', async () => {
        const invalidRatings = [0, 6, 3.5, -1, '5', null, undefined];

        for (const rating of invalidRatings) {
          const res = await request(app)
            .put('/api/places/1/review')
            .set('X-User-Id', '1')
            .send({ rating, body: 'Valid body text.' });

          expect(res.status).toBe(400);
          expect(res.body.error).toEqual({
            code: 'VALIDATION_ERROR',
            message: 'Rating must be an integer between 1 and 5.'
          });
        }
      });

      it('rejects invalid review bodies (empty, whitespace, non-string, >500 characters)', async () => {
        const resEmpty = await request(app)
          .put('/api/places/1/review')
          .set('X-User-Id', '1')
          .send({ rating: 4, body: '' });

        expect(resEmpty.status).toBe(400);
        expect(resEmpty.body.error.message).toBe('Review body must be between 1 and 500 characters.');

        const resWhitespace = await request(app)
          .put('/api/places/1/review')
          .set('X-User-Id', '1')
          .send({ rating: 4, body: '    ' });

        expect(resWhitespace.status).toBe(400);
        expect(resWhitespace.body.error.message).toBe('Review body must be between 1 and 500 characters.');

        const resTooLong = await request(app)
          .put('/api/places/1/review')
          .set('X-User-Id', '1')
          .send({ rating: 4, body: 'a'.repeat(501) });

        expect(resTooLong.status).toBe(400);
        expect(resTooLong.body.error.message).toBe('Review body must be between 1 and 500 characters.');

        const resNonString = await request(app)
          .put('/api/places/1/review')
          .set('X-User-Id', '1')
          .send({ rating: 4, body: 12345 });

        expect(resNonString.status).toBe(400);
        expect(resNonString.body.error.message).toBe('Review body must be a string.');
      });
    });
  });
});
