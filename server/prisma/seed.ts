/**
 * Wayfarer Seed Script (Lisbon dataset)
 *
 * NOTICE (RV-8): All place reviews and tour bookings generated in this seed are
 * SYNTHETIC DEMONSTRATION DATA created specifically for evaluating the ranking
 * formula and concurrency-safe booking behaviors.
 */

import { PrismaClient } from '@prisma/client';
import { assertSlotConsistent } from '../tests/helpers/assertSlotConsistent.js';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Verifying database connection safety...');

  // 1. Strict Seed Safety Check: inspect actual connected database
  const result = await prisma.$queryRawUnsafe<Array<{ current_database: string }>>(
    'SELECT current_database();'
  );
  const currentDb = result[0]?.current_database?.toLowerCase() || '';

  if (currentDb !== 'wayfarer') {
    throw new Error(
      `[SeedSafety] Refusing to seed: connected database is "${currentDb}". ` +
      'Seed script must only run against the development database "wayfarer". ' +
      'It must NEVER run against "wayfarer_test".'
    );
  }

  console.log(`[Seed] Connected safely to development database "${currentDb}".`);

  // 2. Truncate tables with RESTART IDENTITY CASCADE in child-first order
  console.log('[Seed] Truncating existing development tables...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      users,
      places,
      reviews,
      tour_slots,
      bookings
    RESTART IDENTITY CASCADE;
  `);

  console.log('[Seed] Populating seed dataset...');

  // Compute dates relative to seed run
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayPlusOne = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayPlusTwo = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Set predictable UTC hours
  tomorrow.setUTCHours(10, 0, 0, 0);
  const tomorrowAfternoon = new Date(tomorrow);
  tomorrowAfternoon.setUTCHours(16, 0, 0, 0);

  dayPlusOne.setUTCHours(11, 0, 0, 0);

  dayPlusTwo.setUTCHours(10, 0, 0, 0);
  const dayPlusTwoAfternoon = new Date(dayPlusTwo);
  dayPlusTwoAfternoon.setUTCHours(14, 0, 0, 0);

  // Execute seeding in a transaction
  await prisma.$transaction(async tx => {
    // 3. Seed Users with fixed IDs (1–3)
    await tx.user.createMany({
      data: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Bruno' },
        { id: 3, name: 'Carla' }
      ]
    });

    // Advance PostgreSQL user id sequence so future auto-generated IDs do not collide
    await tx.$executeRawUnsafe(
      "SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;"
    );

    // 4. Seed Places (10 Lisbon venues)
    const placesData = [
      {
        id: 1,
        name: 'Jerónimos Monastery',
        category: 'History',
        description: 'Magnificent 16th-century monastery and pinnacle of Manueline architecture in Belém.',
        address: 'Praça do Império 1400-206 Lisboa',
        openingHours: 'Tue–Sun 10:00–17:30',
        imageUrl: '/images/places/jeronimos-monastery.jpg'
      },
      {
        id: 2,
        name: 'Belém Tower',
        category: 'History',
        description: 'Fortified 16th-century tower on the Tagus estuary guarding Lisbon harbour.',
        address: 'Av. Brasília, 1400-038 Lisboa',
        openingHours: 'Tue–Sun 10:00–17:30',
        imageUrl: '/images/places/belem-tower.jpg'
      },
      {
        id: 3,
        name: 'Alfama',
        category: 'Neighbourhoods',
        description: 'Lisbon’s oldest, most atmospheric quarter of steep alleys, tiled facades, and fado taverns.',
        address: 'Alfama, 1100 Lisboa',
        openingHours: 'Open all day',
        imageUrl: '/images/places/alfama.jpg'
      },
      {
        id: 4,
        name: 'National Tile Museum',
        category: 'Museums',
        description: 'Former convent housing five centuries of exquisite decorative Portuguese azulejos.',
        address: 'R. Me. Deus 4, 1900-312 Lisboa',
        openingHours: 'Tue–Sun 10:00–18:00',
        imageUrl: '/images/places/national-tile-museum.jpg'
      },
      {
        id: 5,
        name: 'MAAT',
        category: 'Museums',
        description: 'Striking contemporary waterfront museum integrating art, architecture, and technology.',
        address: 'Av. Brasília 64, 1300-598 Lisboa',
        openingHours: 'Wed–Mon 10:00–19:00',
        imageUrl: '/images/places/maat.jpg'
      },
      {
        id: 6,
        name: 'Miradouro da Senhora do Monte',
        category: 'Viewpoints',
        description: 'The highest natural terrace in the city offering sweeping vistas of the castle and Tagus.',
        address: 'Largo Monte, 1170-107 Lisboa',
        openingHours: 'Open all day',
        imageUrl: '/images/places/senhora-do-monte.jpg'
      },
      {
        id: 7,
        name: 'Miradouro de Santa Luzia',
        category: 'Viewpoints',
        description: 'Romantic terrace framed by bougainvillea and blue azulejos overlooking Alfama.',
        address: 'Largo Santa Luzia, 1100-487 Lisboa',
        openingHours: 'Open all day',
        imageUrl: '/images/places/santa-luzia.jpg'
      },
      {
        id: 8,
        name: 'Time Out Market',
        category: 'Food & Drink',
        description: 'Lively food hall inside Mercado da Ribeira showcasing culinary creations from top Portuguese chefs.',
        address: 'Av. 24 de Julho 49, 1200-479 Lisboa',
        openingHours: 'Mon–Sun 10:00–00:00',
        imageUrl: '/images/places/time-out-market.jpg'
      },
      {
        id: 9,
        name: 'Pastelaria Brilho',
        category: 'Food & Drink',
        description: 'Newly opened artisanal bakery serving warm pastéis de nata with crisp pastry and fresh cinnamon.',
        address: 'R. Nova do Carvalho 12, 1200-292 Lisboa',
        openingHours: 'Tue–Sun 08:00–19:00',
        imageUrl: '/images/places/pastelaria-brilho.jpg'
      },
      {
        id: 10,
        name: 'Príncipe Real Garden',
        category: 'Neighbourhoods',
        description: 'Tranquil 19th-century public park famous for its sprawling centenary cedar tree.',
        address: 'Praça do Príncipe Real, 1250-096 Lisboa',
        openingHours: 'Open all day',
        imageUrl: '/images/places/principe-real-garden.jpg'
      }
    ];

    await tx.place.createMany({ data: placesData });

    // Advance places id sequence
    await tx.$executeRawUnsafe(
      "SELECT setval(pg_get_serial_sequence('places', 'id'), COALESCE(MAX(id), 1)) FROM places;"
    );

    // 5. Seed Reviews (23 reviews total, sum = 92, global mean C = 4.000)
    // Ratings precisely match section 5.6 of DEVELOPMENT_PLAN.md
    const reviewsData = [
      // 1: Jerónimos Monastery (5, 5, 4)
      { placeId: 1, userId: 1, rating: 5, body: 'The cloisters are breathtaking in the morning light.' },
      { placeId: 1, userId: 2, rating: 5, body: 'Stunning stone carving detail throughout.' },
      { placeId: 1, userId: 3, rating: 4, body: 'Arrive early to avoid the longest tour bus queues.' },

      // 2: Belém Tower (4, 3, 4)
      { placeId: 2, userId: 1, rating: 4, body: 'Iconic river fortress with lovely maritime details.' },
      { placeId: 2, userId: 2, rating: 3, body: 'Interior is quite bare; the best view is from outside.' },
      { placeId: 2, userId: 3, rating: 4, body: 'Beautiful exterior stone work right by the water.' },

      // 3: Alfama (5, 4, 5)
      { placeId: 3, userId: 1, rating: 5, body: 'Got pleasantly lost among the alleys, loved every corner.' },
      { placeId: 3, userId: 2, rating: 4, body: 'Steep cobblestone climb, but fado echoing in the evening is magical.' },
      { placeId: 3, userId: 3, rating: 5, body: 'The authentic soul of old Lisbon.' },

      // 4: National Tile Museum (5, 4, 4)
      { placeId: 4, userId: 1, rating: 5, body: 'The great Lisbon panorama mural alone is worth the trip.' },
      { placeId: 4, userId: 2, rating: 4, body: 'Peaceful museum with a lovely shaded cloister café.' },
      { placeId: 4, userId: 3, rating: 4, body: 'Fascinating evolution of tile craft over the centuries.' },

      // 5: MAAT (2, 3)
      { placeId: 5, userId: 1, rating: 2, body: 'Impressive building exterior, but the exhibits felt sparse.' },
      { placeId: 5, userId: 2, rating: 3, body: 'Great rooftop walk along the river; mixed feelings on the gallery.' },

      // 6: Miradouro da Senhora do Monte (4, 5, 5)
      { placeId: 6, userId: 1, rating: 4, body: 'Steep walk up from Graça, but the sunset view is unmatched.' },
      { placeId: 6, userId: 2, rating: 5, body: 'Best panoramic viewpoint over Lisbon castle and the estuary.' },
      { placeId: 6, userId: 3, rating: 5, body: 'Incredible atmosphere with buskers and chilled drinks at dusk.' },

      // 7: Miradouro de Santa Luzia (4, 4)
      { placeId: 7, userId: 1, rating: 4, body: 'Classic Lisbon photo spot overlooking the Alfama rooftops.' },
      { placeId: 7, userId: 2, rating: 4, body: 'Charming pergola and tiled benches facing the river.' },

      // 8: Time Out Market (3, 2, 3)
      { placeId: 8, userId: 1, rating: 3, body: 'Delicious food options, though finding seating at peak hours is tough.' },
      { placeId: 8, userId: 2, rating: 2, body: 'Overly crowded and noisy; feels catering mainly to tourists.' },
      { placeId: 8, userId: 3, rating: 3, body: 'Good variety under one roof, but higher prices than neighborhood tascas.' },

      // 9: Pastelaria Brilho (5) - single review
      { placeId: 9, userId: 1, rating: 5, body: 'Crispy warm pastéis straight from the oven! A delicious hidden gem.' }

      // 10: Príncipe Real Garden (0 reviews)
    ];

    await tx.review.createMany({ data: reviewsData });

    // 6. Seed Tour Slots
    const slot1 = await tx.tourSlot.create({
      data: {
        placeId: 1, // Jerónimos
        startsAt: tomorrow,
        capacity: 10,
        bookedSeats: 3
      }
    });

    await tx.tourSlot.create({
      data: {
        placeId: 1, // Jerónimos
        startsAt: dayPlusTwoAfternoon,
        capacity: 8,
        bookedSeats: 0
      }
    });

    const slot3 = await tx.tourSlot.create({
      data: {
        placeId: 3, // Alfama
        startsAt: tomorrowAfternoon,
        capacity: 10,
        bookedSeats: 8 // almost full (2 left)
      }
    });

    const slot4 = await tx.tourSlot.create({
      data: {
        placeId: 3, // Alfama
        startsAt: dayPlusTwo,
        capacity: 6,
        bookedSeats: 6 // full (0 left)
      }
    });

    const slot5 = await tx.tourSlot.create({
      data: {
        placeId: 4, // National Tile Museum
        startsAt: dayPlusOne,
        capacity: 12,
        bookedSeats: 2
      }
    });

    // 7. Seed Bookings to guarantee bookedSeats == SUM(booking.seats)
    await tx.booking.createMany({
      data: [
        // Slot 1 (Jerónimos, booked 3)
        { slotId: slot1.id, userId: 1, seats: 3 },

        // Slot 3 (Alfama, booked 8: Ana 5 + Bruno 3)
        { slotId: slot3.id, userId: 1, seats: 5 },
        { slotId: slot3.id, userId: 2, seats: 3 },

        // Slot 4 (Alfama, booked 6: Ana 3 + Carla 3)
        { slotId: slot4.id, userId: 1, seats: 3 },
        { slotId: slot4.id, userId: 3, seats: 3 },

        // Slot 5 (Tile Museum, booked 2)
        { slotId: slot5.id, userId: 2, seats: 2 }
      ]
    });
  });

  // 8. Audit Invariant: verify bookedSeats matches bookings exactly
  console.log('[Seed] Auditing bookedSeats invariant across all tour slots...');
  await assertSlotConsistent(prisma);
  console.log('[Seed] Invariant check passed: bookedSeats equals SUM(booking.seats) for all slots.');

  console.log('------------------------------------------------------------');
  console.log('✅ Seed completed successfully!');
  console.log('Users: 3 | Places: 10 | Reviews: 23 (C = 4.000) | Tour Slots: 5');
  console.log('NOTICE: All reviews in this dataset are synthetic demonstration data.');
  console.log('------------------------------------------------------------');
}

main()
  .catch(e => {
    console.error('[Seed] Seed failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
