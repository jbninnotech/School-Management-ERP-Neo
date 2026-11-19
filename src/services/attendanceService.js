import API from './api.js';

export const attendanceService = {
  // Teacher APIs
  punchIn: (data) => API.post('/attendance/punch-in', data),
  punchOut: (data) => API.post('/attendance/punch-out', data),
  toggleBreak: (data) => API.post('/attendance/break', data),
  getMyAttendance: () => API.get('/attendance/my-attendance'),
  getMyHistory: (params) => API.get('/attendance/my-history', { params }),
  requestCorrection: (data) => API.post('/attendance/correction-request', data),

  // Admin APIs
  getAdminDashboard: (params) => API.get('/attendance/dashboard', { params }),
  getAttendanceReports: (params) => API.get('/attendance/reports', { params }),

  // Schedule Management
  getSchedules: () => API.get('/attendance/schedules'),
  createSchedule: (data) => API.post('/attendance/schedules', data),
  updateSchedule: (id, data) => API.put(`/attendance/schedules/${id}`, data),
  deleteSchedule: (id) => API.delete(`/attendance/schedules/${id}`),

  // Location / Geofence Settings
  getSchoolLocation: () => API.get('/attendance/location'),
  updateSchoolLocation: (data) => API.put('/attendance/location', data),

  // Holidays
  getHolidays: () => API.get('/attendance/holidays'),
  createHoliday: (data) => API.post('/attendance/holidays', data),
  deleteHoliday: (id) => API.delete(`/attendance/holidays/${id}`),

  // Corrections Review
  getCorrections: () => API.get('/attendance/corrections'),
  reviewCorrection: (id, data) => API.put(`/attendance/corrections/${id}/review`, data),
};

export default attendanceService;
