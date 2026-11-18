import api from './api.js';

export const questionPaperService = {
  async getQuestionPapers(params = {}) {
    const res = await api.get('/question-papers', { params });
    return res.data;
  },

  async getQuestionPaperById(id) {
    const res = await api.get(`/question-papers/${id}`);
    return res.data;
  },

  async createQuestionPaper(payload) {
    const res = await api.post('/question-papers', payload);
    return res.data;
  },

  async updateQuestionPaper(id, payload) {
    const res = await api.put(`/question-papers/${id}`, payload);
    return res.data;
  },

  async deleteQuestionPaper(id) {
    const res = await api.delete(`/question-papers/${id}`);
    return res.data;
  },
};

export default questionPaperService;
