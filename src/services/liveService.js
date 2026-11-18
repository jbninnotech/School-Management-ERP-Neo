import api from './api.js';

export const liveService = {
  async getLiveMonitor(examId) {
    const res = await api.get(`/exams/${examId}/monitor`);
    return res.data;
  },

  async executeMonitorAction(examId, payload) {
    const res = await api.post(`/exams/${examId}/monitor/action`, payload);
    return res.data;
  },

  async getAdminDashboardStats() {
    const res = await api.get('/dashboard/admin');
    return res.data;
  },

  async getTeacherDashboardStats() {
    const res = await api.get('/dashboard/teacher');
    return res.data;
  },

  async getStudentDashboardStats() {
    const res = await api.get('/dashboard/student');
    return res.data;
  },
};

export default liveService;
