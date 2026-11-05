import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('API Infrastructure & Error Handling', () => {
  it('GET /api/health returns 200 with database: up when PostgreSQL is accessible', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      database: 'up'
    });
  });

  it('unknown /api/* routes return 404 NOT_FOUND with standard error shape', async () => {
    const res = await request(app).get('/api/unknown-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource or endpoint was not found.'
      }
    });
  });

  it('unexpected errors return generic 500 without exposing stack traces or internals', () => {
    const mockReq = {} as any;
    let responseStatus: number | null = null;
    let responseBody: any = null;
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseBody = data;
        return mockRes;
      }
    } as any;
    const mockNext = () => {};

    // Suppress console.error during this simulated error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(
      new Error('Secret internal failure: DB connection closed abruptly at line 42'),
      mockReq,
      mockRes,
      mockNext
    );

    consoleSpy.mockRestore();

    expect(responseStatus).toBe(500);
    expect(responseBody).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred.'
      }
    });
    expect(JSON.stringify(responseBody)).not.toContain('Secret internal failure');
    expect(JSON.stringify(responseBody)).not.toContain('stack');
  });
});
