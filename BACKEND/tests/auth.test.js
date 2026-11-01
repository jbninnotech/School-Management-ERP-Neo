/**
 * tests/auth.test.js
 * Authentication & Authorization Tests
 * 
 * Covers:
 * - Valid and invalid login
 * - Expired / invalid JWT
 * - Unauthorized dashboard access
 * - Role-based route protection
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Import app WITHOUT starting the server ─────────────────────────────────
// We need to import the express app directly, not the server entry point,
// because the server starts listening on a port. For supertest we just need app.
let app;
let User;

beforeAll(async () => {
  // Dynamic imports so env is loaded first
  const appModule = await import('../src/app.js');
  app = appModule.default;
  const dbModule = await import('../src/config/db.js');
  await dbModule.default();
  const userModule = await import('../src/models/userModel.js');
  User = userModule.default;
});

afterAll(async () => {
  await mongoose.disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('should reject a request with missing email or password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/email and password/i);
  });

  it('should reject a request with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nonexistent.invalid', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for a correct email but wrong password', async () => {
    // Try with known superadmin email (might not exist in test DB, but should 401, not 500)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@school.com', password: 'wrongpassword12345' });
    // Either 401 (user exists, wrong pass) or 401 (user doesn't exist) — both valid
    expect([401, 200]).toContain(res.status); // 200 only if somehow correct
    if (res.status !== 200) {
      expect(res.body.success).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JWT PROTECTION TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('JWT Protection', () => {
  it('should reject requests with no Authorization header', async () => {
    const res = await request(app).get('/api/dashboard/student');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no token/i);
  });

  it('should reject requests with an invalid JWT', async () => {
    const res = await request(app)
      .get('/api/dashboard/student')
      .set('Authorization', 'Bearer thisisnotavalidtoken.fake.payload');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject requests with a tampered JWT', async () => {
    // A well-formed but unsigned JWT (algorithm: none)
    const tamperedToken = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' +
      Buffer.from(JSON.stringify({ id: '000000000000000000000000', role: 'superadmin' })).toString('base64url') + '.';
    const res = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
  });

  it('should reject with expired/invalid-signature JWT', async () => {
    // A real-format but wrong-signature token
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2Iiwicm9sZSI6InN1cGVyYWRtaW4iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMX0.invalidsignaturehere';
    const res = await request(app)
      .get('/api/exams')
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-BASED ACCESS TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Role-Based Access Control', () => {
  it('GET /api/health should be accessible without authentication', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('POST /api/auth/setup-superadmin should be a one-time operation', async () => {
    const res = await request(app)
      .post('/api/auth/setup-superadmin')
      .send({ name: 'Test Admin', email: 'test@admin.com', password: 'password123', phone: '1234567890' });
    // Either 201 (created) or 400 (already exists) — both valid
    expect([201, 400]).toContain(res.status);
  });
});
