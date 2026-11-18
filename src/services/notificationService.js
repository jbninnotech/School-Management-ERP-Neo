import api from './api.js';

export const notificationService = {
  async getNotifications(params = {}) {
    const res = await api.get('/notifications', { params });
    return res.data;
  },

  async getUnreadCount() {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(id) {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead() {
    const res = await api.put('/notifications/mark-all-read');
    return res.data;
  },
};

export default notificationService;
