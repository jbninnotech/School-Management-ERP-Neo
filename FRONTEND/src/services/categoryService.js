import api from './api.js';

export const categoryService = {
  // 1. Cascading category query
  async getCascading({ subject, classGrade, parentId = null, level = null } = {}) {
    const params = {};
    if (subject) params.subject = subject;
    if (classGrade) params.classGrade = classGrade;
    if (parentId !== undefined) params.parentId = parentId;
    if (level) params.level = level;

    const res = await api.get('/categories/cascading', { params });
    return res.data;
  },

  // 2. Search categories by name with full breadcrumb path
  async searchCategories({ subject, classGrade, q }) {
    const res = await api.get('/categories/search', {
      params: { subject, classGrade, q },
    });
    return res.data;
  },

  // 3. Create a category
  async createCategory({ name, level, parentId, subject, classGrade, order }) {
    const res = await api.post('/categories', {
      name,
      level,
      parentId,
      subject,
      classGrade,
      order,
    });
    return res.data;
  },

  // 4. Update category
  async updateCategory(id, { name, order }) {
    const res = await api.put(`/categories/${id}`, { name, order });
    return res.data;
  },

  // 5. Delete category (checks in-use questions)
  async deleteCategory(id) {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },

  // 6. Merge category
  async mergeCategory(id, targetCategoryId) {
    const res = await api.post(`/categories/${id}/merge`, { targetCategoryId });
    return res.data;
  },

  // 7. Student/Teacher/Admin Chapter & Topic Analysis drill-down
  async getTopicAnalysis(params = {}) {
    const res = await api.get('/dashboard/topic-analysis', { params });
    return res.data;
  },
};

export default categoryService;
