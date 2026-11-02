import api from './api.js';

export const authService = {
  async login(credentials) {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.data?.token) {
      sessionStorage.setItem('token', res.data.data.token);
      sessionStorage.setItem('user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  },

  async logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    return { success: true };
  },

  getCurrentUser() {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  },

  getToken() {
    return sessionStorage.getItem('token');
  },

  async getProfile() {
    const res = await api.get('/auth/profile');
    return res.data;
  },

  async updateProfile(profileData) {
    const res = await api.put('/auth/profile', profileData);
    return res.data;
  },
};

export default authService;
