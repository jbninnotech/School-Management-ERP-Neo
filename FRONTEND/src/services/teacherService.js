import api from './api.js';

export const teacherService = {
  async getTeachers(params = {}) {
    const res = await api.get('/auth/teachers', { params });
    return res.data;
  },

  async getTeacherById(id) {
    const res = await api.get(`/auth/teachers/${id}`);
    return res.data;
  },

  async createTeacher(payload) {
    const res = await api.post('/auth/add-teacher', payload);
    return res.data;
  },

  async updateTeacher(id, payload) {
    const res = await api.put(`/auth/teachers/${id}`, payload);
    return res.data;
  },

  async deleteTeacher(id) {
    const res = await api.delete(`/auth/teachers/${id}`);
    return res.data;
  },

  async restoreTeacher(id) {
    const res = await api.put(`/auth/teachers/${id}/restore`);
    return res.data;
  },

  async getTeacherQuestionBank(teacherId) {
    const res = await api.get(`/auth/teachers/${teacherId}/question-bank`);
    return res.data;
  },
};

export default teacherService;
