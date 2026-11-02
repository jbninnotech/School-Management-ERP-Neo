import api from './api.js';

export const uploadService = {
  async uploadProfilePhoto(file, role = 'student') {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('role', role);

    const res = await api.post('/upload/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async uploadProctoringChunk(formData) {
    const res = await api.post('/upload/proctoring/chunk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async uploadProctoringSnapshot(formData) {
    const res = await api.post('/upload/proctoring/snapshot', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getProctoringMedia(attemptId) {
    const res = await api.get(`/upload/proctoring/${attemptId}`);
    return res.data;
  },
};

export default uploadService;
