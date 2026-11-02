import api from './api.js';

export const questionService = {
  async getQuestions(params = {}) {
    const res = await api.get('/questions', { params });
    return res.data;
  },

  async getQuestionById(id) {
    const res = await api.get(`/questions/${id}`);
    return res.data;
  },

  async createQuestion(payload) {
    const res = await api.post('/questions', payload);
    return res.data;
  },

  async updateQuestion(id, payload) {
    const res = await api.put(`/questions/${id}`, payload);
    return res.data;
  },

  async deleteQuestion(id) {
    const res = await api.delete(`/questions/${id}`);
    return res.data;
  },

  async importQuestions(formData) {
    const res = await api.post('/questions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export default questionService;
