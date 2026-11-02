import api from './api.js';

export const examService = {
  async getExams(params = {}) {
    const res = await api.get('/exams', { params });
    return res.data;
  },

  async getExamById(id) {
    const res = await api.get(`/exams/${id}`);
    return res.data;
  },

  async createExam(payload) {
    const res = await api.post('/exams', payload);
    return res.data;
  },

  async updateExam(id, payload) {
    const res = await api.put(`/exams/${id}`, payload);
    return res.data;
  },

  async deleteExam(id) {
    const res = await api.delete(`/exams/${id}`);
    return res.data;
  },

  async submitForReview(id) {
    const res = await api.put(`/exams/${id}/submit-review`);
    return res.data;
  },

  async reviewExam(id, payload) {
    const res = await api.put(`/exams/${id}/review`, payload);
    return res.data;
  },

  async scheduleExam(id, payload) {
    const res = await api.put(`/exams/${id}/schedule`, payload);
    return res.data;
  },

  async publishExam(id) {
    const res = await api.put(`/exams/${id}/publish`);
    return res.data;
  },

  async cancelExam(id, payload = {}) {
    const res = await api.put(`/exams/${id}/cancel`, payload);
    return res.data;
  },

  async goLive(id) {
    const res = await api.post(`/exams/${id}/go-live`);
    return res.data;
  },

  async pauseExam(id, payload = {}) {
    const res = await api.post(`/exams/${id}/pause`, payload);
    return res.data;
  },

  async resumeExam(id) {
    const res = await api.post(`/exams/${id}/resume`);
    return res.data;
  },

  async endExam(id) {
    const res = await api.post(`/exams/${id}/end`);
    return res.data;
  },

  async getLiveExams() {
    const res = await api.get('/exams/live');
    return res.data;
  },

  async getPendingApprovals() {
    const res = await api.get('/exams?status=submitted_for_review');
    return res.data;
  },
};

export default examService;
