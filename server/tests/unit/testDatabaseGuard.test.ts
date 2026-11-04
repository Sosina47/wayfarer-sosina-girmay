import { describe, it, expect } from 'vitest';
import { assertTestDatabase } from '../helpers/assertTestDatabase.js';

describe('assertTestDatabase safety guard', () => {
  const devUrl = 'postgresql://postgres:secret@localhost:5432/wayfarer';

  it('rejects missing or undefined TEST_DATABASE_URL', () => {
    expect(() => assertTestDatabase(undefined, devUrl)).toThrow(
      /TEST_DATABASE_URL is required/
    );
  });

  it('rejects empty string TEST_DATABASE_URL', () => {
    expect(() => assertTestDatabase('   ', devUrl)).toThrow(
      /TEST_DATABASE_URL is required/
    );
  });

  it('rejects malformed URL', () => {
    expect(() => assertTestDatabase('not-a-valid-url', devUrl)).toThrow(
      /not a valid URL/
    );
  });

  it('rejects target when database name does not contain "test"', () => {
    expect(() =>
      assertTestDatabase('postgresql://postgres:secret@localhost:5432/production', devUrl)
    ).toThrow(/does not contain "test"/);

    expect(() =>
      assertTestDatabase('postgresql://postgres:secret@localhost:5432/wayfarer_dev', devUrl)
    ).toThrow(/does not contain "test"/);
  });

  it('rejects when TEST_DATABASE_URL equals DATABASE_URL', () => {
    expect(() =>
      assertTestDatabase(
        'postgresql://postgres:secret@localhost:5432/wayfarer',
        'postgresql://postgres:secret@localhost:5432/wayfarer'
      )
    ).toThrow(); // Either fails non-test or fails equality
  });

  it('rejects even if different credentials but same host, port, and db', () => {
    expect(() =>
      assertTestDatabase(
        'postgresql://testuser:pass1@localhost:5432/wayfarer_test',
        'postgresql://devuser:pass2@localhost:5432/wayfarer_test'
      )
    ).toThrow(/matches DATABASE_URL/);
  });

  it('accepts valid dedicated test database', () => {
    expect(() =>
      assertTestDatabase(
        'postgresql://postgres:secret@localhost:5432/wayfarer_test',
        devUrl
      )
    ).not.toThrow();
  });
});
