import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';

const app = createExpressApp();

describe('Health Check API', () => {
  it('should return 200 OK and correct JSON structure', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'Service is healthy');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status', 'healthy');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('uptime');
  });
});
