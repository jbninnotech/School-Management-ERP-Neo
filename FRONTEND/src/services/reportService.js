import api from './api.js';

export const reportService = {
  async getStudentReport(studentId = 'me') {
    const res = await api.get(`/dashboard/student/${studentId}/report`);
    return res.data;
  },

  async downloadReportPdf(studentId = 'me') {
    const res = await api.get(`/dashboard/student/${studentId}/report/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default reportService;
