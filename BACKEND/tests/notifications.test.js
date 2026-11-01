/**
 * tests/notifications.test.js
 * Notification System Tests
 * 
 * Covers:
 * - Notification access control
 * - Unread count endpoint
 * - Mark as read
 * - Role-based notification filtering
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

let app;
let User;

const makeToken = (userId, role) => jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeAll(async () => {
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

describe('Notification Endpoints', () => {
  it('GET /api/notifications should require authentication', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications/unread-count should require authentication', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });

  it('authenticated student should receive their own notifications only', async () => {
    let student = await User.findOne({ role: 'student' });
    if (!student) return;

    const token = makeToken(student._id.toString(), 'student');
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // All returned notifications should belong to this student
    if (res.body.data?.length > 0) {
      res.body.data.forEach((n) => {
        expect(n.recipient?.toString() === student._id.toString() || n.recipient === null).toBeTruthy();
      });
    }
  });

  it('authenticated student should get unread notification count', async () => {
    let student = await User.findOne({ role: 'student' });
    if (!student) return;

    const token = makeToken(student._id.toString(), 'student');
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
  });
});

describe('Notification Security', () => {
  it('student A cannot read student B notifications by ID', async () => {
    const students = await User.find({ role: 'student' }).limit(2);
    if (students.length < 2) return;

    const [studentA, studentB] = students;
    const tokenA = makeToken(studentA._id.toString(), 'student');

    // Get studentB's notifications
    const tokenB = makeToken(studentB._id.toString(), 'student');
    const resB = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenB}`);

    if (resB.body?.data?.length > 0) {
      const notifB = resB.body.data[0];
      // Try to mark studentB's notification as read using studentA's token
      const res = await request(app)
        .put(`/api/notifications/${notifB._id}/read`)
        .set('Authorization', `Bearer ${tokenA}`);
      // Should either 403 (explicitly denied) or 404 (not found for A) — not 200
      expect(res.status).not.toBe(200);
    }
  });
});
