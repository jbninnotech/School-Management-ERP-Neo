import api from './api.js';

export const resultService = {
  async getStudentResult(examId, params = {}) {
    const res = await api.get(`/exams/${examId}/results`, { params });
    return res.data;
  },

  async getExamAnalytics(examId) {
    const res = await api.get(`/exams/${examId}/analytics`);
    return res.data;
  },
};

export default resultService;
