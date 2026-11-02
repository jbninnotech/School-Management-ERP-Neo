import api from './api.js';

export const analyticsService = {
  async getExamAnalytics(examId) {
    const res = await api.get(`/exams/${examId}/analytics`);
    return res.data;
  },

  async getAdminAnalytics(params = {}) {
    const res = await api.get('/dashboard/admin/analytics', { params });
    return res.data;
  },

  async getTeacherAnalytics(teacherId, params = {}) {
    const res = await api.get(`/dashboard/teacher/${teacherId || 'me'}/analytics`, { params });
    return res.data;
  },
};

export default analyticsService;
