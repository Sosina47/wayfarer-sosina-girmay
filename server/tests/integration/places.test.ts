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

describe('Places API & Discovery Integration Tests (wayfarer_test)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedPredictableFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedPredictableFixtures() {
    // 3 Test Users
    await prisma.user.createMany({
      data: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
        { id: 3, name: 'Carla' }
      ]
    });

    // 4 Test Places across 3 Categories
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
          description: 'New bakery with 1 review.',
          address: 'Cais do Sodré',
          openingHours: '08:00 - 19:00'
        },
        {
          id: 3,
          name: 'Belém Tower',
          category: 'History',
          description: 'Historic tower.',
          address: 'Av. Brasília',
          openingHours: '10:00 - 17:30'
        },
        {
          id: 4,
          name: 'Príncipe Real Garden',
          category: 'Neighbourhoods',
          description: 'Tranquil garden with 0 reviews.',
          address: 'Príncipe Real',
          openingHours: 'Open all day'
        }
      ]
    });

    // Total 7 reviews: 3 for Jerónimos, 1 for Pastelaria, 3 for Belém Tower, 0 for Garden
    // Jerónimos ratings: 5, 5, 4 (sum 14, avg 4.67)
    // Pastelaria rating: 5 (sum 5, avg 5.0)
    // Belém Tower ratings: 4, 3, 4 (sum 11, avg 3.67)
    // Overall sum: 14 + 5 + 11 = 30 across 7 reviews -> global mean C = 30 / 7 ≈ 4.2857
    await prisma.review.createMany({
      data: [
        { placeId: 1, userId: 1, rating: 5, body: 'Stunning architecture.' },
        { placeId: 1, userId: 2, rating: 5, body: 'Beautiful cloisters.' },
        { placeId: 1, userId: 3, rating: 4, body: 'Arrive early.' },

        { placeId: 2, userId: 1, rating: 5, body: 'Warm pastéis de nata.' },

        { placeId: 3, userId: 1, rating: 4, body: 'Nice waterfront view.' },
        { placeId: 3, userId: 2, rating: 3, body: 'Crowded inside.' },
        { placeId: 3, userId: 3, rating: 4, body: 'Iconic monument.' }
      ]
    });
  }

  it('GET /api/places defaults to top-rated sorting with Bayesian ranking', async () => {
    const res = await request(app).get('/api/places');

    expect(res.status).toBe(200);
    expect(res.body.places).toBeInstanceOf(Array);
    expect(res.body.places).toHaveLength(4);

    const places = res.body.places;

    // Jerónimos (3 reviews, avg 4.67) must outrank Pastelaria Brilho (1 review, avg 5.0)
    // because Bayesian shrinkage pulls the 1-review 5.0 down toward C (4.29)
    const jeronimos = places.find((p: any) => p.name === 'Jerónimos Monastery');
    const pastelaria = places.find((p: any) => p.name === 'Pastelaria Brilho');

    expect(jeronimos).toBeDefined();
    expect(pastelaria).toBeDefined();

    expect(jeronimos.reviewCount).toBe(3);
    expect(jeronimos.averageRating).toBe(4.67);

    expect(pastelaria.reviewCount).toBe(1);
    expect(pastelaria.averageRating).toBe(5.0);

    expect(jeronimos.score).toBeGreaterThan(pastelaria.score);

    // Jerónimos is #1, Pastelaria is #2
    expect(places[0].name).toBe('Jerónimos Monastery');
    expect(places[1].name).toBe('Pastelaria Brilho');
  });

  it('GET /api/places?sort=name orders strictly alphabetically A-Z', async () => {
    const res = await request(app).get('/api/places?sort=name');

    expect(res.status).toBe(200);
    const names = res.body.places.map((p: any) => p.name);
    expect(names).toEqual([
      'Belém Tower',
      'Jerónimos Monastery',
      'Pastelaria Brilho',
      'Príncipe Real Garden'
    ]);
  });

  it('GET /api/places?sort=invalid returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/places?sort=invalid');

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: "Invalid 'sort' query parameter. Allowed values: 'top-rated', 'name'."
    });
  });

  it('GET /api/places?category=History filters places on the server', async () => {
    const res = await request(app).get('/api/places?category=History');

    expect(res.status).toBe(200);
    expect(res.body.places).toHaveLength(2);
    expect(res.body.places.every((p: any) => p.category === 'History')).toBe(true);
  });

  it('GET /api/places?category=NonExistent returns an empty list', async () => {
    const res = await request(app).get('/api/places?category=NonExistent');

    expect(res.status).toBe(200);
    expect(res.body.places).toEqual([]);
  });

  it('PROVES: Category filtering does not alter the global mean C or ranking score of a place', async () => {
    // 1. Fetch all places without category filter
    const allRes = await request(app).get('/api/places?sort=name');
    const allJeronimos = allRes.body.places.find((p: any) => p.name === 'Jerónimos Monastery');

    // 2. Fetch with category filter 'History'
    const filterRes = await request(app).get('/api/places?category=History&sort=name');
    const filterJeronimos = filterRes.body.places.find((p: any) => p.name === 'Jerónimos Monastery');

    expect(allJeronimos).toBeDefined();
    expect(filterJeronimos).toBeDefined();

    // The score must be mathematically identical, proving C was computed globally,
    // not scoped to only the 'History' category.
    expect(filterJeronimos.score).toBe(allJeronimos.score);
    expect(filterJeronimos.averageRating).toBe(allJeronimos.averageRating);
    expect(filterJeronimos.reviewCount).toBe(allJeronimos.reviewCount);
  });

  it('GET /api/categories returns distinct sorted categories', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual(['Food & Drink', 'History', 'Neighbourhoods']);
  });

  it('handles places with zero reviews and fallback to global neutral prior (3.0) when DB is empty', async () => {
    // Isolated sub-case: truncate all reviews in wayfarer_test
    await prisma.review.deleteMany();

    const res = await request(app).get('/api/places');
    expect(res.status).toBe(200);

    // Every place has 0 reviews, averageRating null, and scores exactly 3.0
    for (const place of res.body.places) {
      expect(place.reviewCount).toBe(0);
      expect(place.averageRating).toBeNull();
      expect(place.score).toBe(3.0);
    }

    // When all scores and counts are equal, tie-breaker orders alphabetically
    const names = res.body.places.map((p: any) => p.name);
    expect(names).toEqual([
      'Belém Tower',
      'Jerónimos Monastery',
      'Pastelaria Brilho',
      'Príncipe Real Garden'
    ]);
  });
});
