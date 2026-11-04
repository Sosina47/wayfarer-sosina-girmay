import { PrismaClient } from '@prisma/client';

/**
 * Truncates all application tables for integration tests, verifying at runtime
 * that the active connection is connected to a database with 'test' in its name.
 */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  // Runtime safeguard: inspect actual connected database
  const result = await prisma.$queryRawUnsafe<Array<{ current_database: string }>>(
    'SELECT current_database();'
  );

  const currentDb = result[0]?.current_database?.toLowerCase() || '';

  if (!currentDb.includes('test')) {
    throw new Error(
      `[ResetDatabaseSafety] ABORT: Connected to "${currentDb}", which is not a test database! ` +
      'Refusing to truncate tables.'
    );
  }

  // Limited strictly to known application tables
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      users,
      places,
      reviews,
      tour_slots,
      bookings
    RESTART IDENTITY CASCADE;
  `);
}
