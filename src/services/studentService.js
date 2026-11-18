import api from './api.js';

export const studentService = {
  async getStudents(params = {}) {
    const res = await api.get('/auth/students', { params });
    return res.data;
  },

  async getStudentById(id) {
    const res = await api.get(`/auth/students/${id}`);
    return res.data;
  },

  async createStudent(payload) {
    const res = await api.post('/auth/add-student', payload);
    return res.data;
  },

  async updateStudent(id, payload) {
    const res = await api.put(`/auth/students/${id}`, payload);
    return res.data;
  },

  async deleteStudent(id) {
    const res = await api.delete(`/auth/students/${id}`);
    return res.data;
  },

  async restoreStudent(id) {
    const res = await api.put(`/auth/students/${id}/restore`);
    return res.data;
  },

  async getStudentQuestionPerformance(studentId) {
    const res = await api.get(`/auth/students/${studentId}/question-performance`);
    return res.data;
  },
};

export default studentService;
