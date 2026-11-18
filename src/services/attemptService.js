import api from './api.js';

export const attemptService = {
  async startAttempt(examId, payload = {}) {
    const res = await api.post(`/exams/${examId}/start-attempt`, payload);
    return res.data;
  },

  async saveAnswer(attemptId, questionId, payload) {
    const res = await api.put(`/exams/attempts/${attemptId}/answers/${questionId}`, payload);
    return res.data;
  },

  async legacySaveAnswer(payload) {
    const res = await api.post('/exams/save-answer', payload);
    return res.data;
  },

  async sendHeartbeat(attemptId) {
    const res = await api.post(`/exams/attempts/${attemptId}/heartbeat`);
    return res.data;
  },

  async reportViolation(attemptId, payload) {
    const res = await api.post(`/exams/attempts/${attemptId}/violation`, payload);
    return res.data;
  },

  async submitAttempt(payload) {
    const res = await api.post('/exams/submit-attempt', payload);
    return res.data;
  },

  async getAttemptForEvaluation(attemptId) {
    const res = await api.get(`/exams/attempt/${attemptId}`);
    return res.data;
  },

  async evaluateAttempt(attemptId, payload) {
    const res = await api.post(`/exams/attempt/${attemptId}/evaluate`, payload);
    return res.data;
  },

  async getSubmissions(examId, params = {}) {
    const res = await api.get(`/exams/${examId}/submissions`, { params });
    return res.data;
  },
};

export default attemptService;
