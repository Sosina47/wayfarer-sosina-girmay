/**
 * Pure safety guard ensuring automated tests only ever target a dedicated test database.
 * Rejects missing URLs, invalid targets, and any target matching the development database.
 */
export function assertTestDatabase(testUrl: string | undefined, devUrl?: string): void {
  if (!testUrl || testUrl.trim() === '') {
    throw new Error(
      '[TestDatabaseGuard] TEST_DATABASE_URL is required for running tests. ' +
      'Tests truncate tables and must never run against an unconfigured or fallback database.'
    );
  }

  let testParsed: URL;
  try {
    testParsed = new URL(testUrl);
  } catch {
    throw new Error(
      `[TestDatabaseGuard] TEST_DATABASE_URL is not a valid URL: "${testUrl}".`
    );
  }

  // Extract database name (path stripped of leading slash and query params)
  const testDbName = testParsed.pathname.replace(/^\//, '').toLowerCase();

  if (!testDbName || !testDbName.includes('test')) {
    throw new Error(
      `[TestDatabaseGuard] Unsafe TEST_DATABASE_URL: Database name "${testDbName}" does not contain "test". ` +
      'Tests require a dedicated test database (e.g., wayfarer_test).'
    );
  }

  if (devUrl) {
    try {
      const devParsed = new URL(devUrl);
      const devDbName = devParsed.pathname.replace(/^\//, '').toLowerCase();

      const sameHost = (testParsed.hostname.toLowerCase() === devParsed.hostname.toLowerCase()) ||
        (['localhost', '127.0.0.1'].includes(testParsed.hostname.toLowerCase()) &&
         ['localhost', '127.0.0.1'].includes(devParsed.hostname.toLowerCase()));
      const samePort = (testParsed.port || '5432') === (devParsed.port || '5432');
      const sameDb = testDbName === devDbName;

      // Check schema parameter if present
      const testSchema = testParsed.searchParams.get('schema') || 'public';
      const devSchema = devParsed.searchParams.get('schema') || 'public';
      const sameSchema = testSchema.toLowerCase() === devSchema.toLowerCase();

      if (sameHost && samePort && sameDb && sameSchema) {
        throw new Error(
          `[TestDatabaseGuard] TEST_DATABASE_URL matches DATABASE_URL (${devDbName}). ` +
          'Tests would destroy development data. Aborting immediately.'
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('[TestDatabaseGuard]')) {
        throw err;
      }
      // If devUrl is malformed, we still ensure testDbName is clearly a test database
    }
  }
}
