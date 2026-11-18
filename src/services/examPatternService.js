import api from './api.js';

export const examPatternService = {
  async getPatterns(params = {}) {
    const res = await api.get('/exam-patterns', { params });
    return res.data;
  },

  async getPatternById(id) {
    const res = await api.get(`/exam-patterns/${id}`);
    return res.data;
  },

  async createPattern(payload) {
    const res = await api.post('/exam-patterns', payload);
    return res.data;
  },

  async updatePattern(id, payload) {
    const res = await api.put(`/exam-patterns/${id}`, payload);
    return res.data;
  },

  async deletePattern(id) {
    const res = await api.delete(`/exam-patterns/${id}`);
    return res.data;
  },

  async assignTeachers(id, teacherIds) {
    const res = await api.put(`/exam-patterns/${id}/assign`, { teacherIds });
    return res.data;
  },
};

export default examPatternService;
