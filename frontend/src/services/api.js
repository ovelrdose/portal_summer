import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Обработка ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (data) => api.post('/auth/registration/', data),
  logout: () => api.post('/auth/logout/'),
  getUser: () => api.get('/auth/user/'),
  verifyEmail: (key) => api.post('/auth/registration/verify-email/', { key }),
  resetPassword: (email) => api.post('/auth/password/reset/', { email }),
  confirmResetPassword: (data) => api.post('/auth/password/reset/confirm/', data),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile/'),
  updateProfile: (data) => api.patch('/users/profile/', data),
  changePassword: (data) => api.post('/users/change-password/', data),
  getUsers: (params) => api.get('/users/', { params }),
  getUser: (id) => api.get(`/users/${id}/`),
  assignRole: (data) => api.post('/users/admin/assign-role/', data),
  resetPassword: (data) => api.post('/users/admin/reset-password/', data),
};

// News API
export const newsAPI = {
  getNews: (params) => api.get('/news/', { params }),
  getNewsItem: (id) => api.get(`/news/${id}/`),
  getLatest: () => api.get('/news/latest/'),
  createNews: (data) => api.post('/news/', data),
  updateNews: (id, data) => api.patch(`/news/${id}/`, data),
  deleteNews: (id) => api.delete(`/news/${id}/`),
  publishNews: (id) => api.post(`/news/${id}/publish/`),
  unpublishNews: (id) => api.post(`/news/${id}/unpublish/`),
  getTags: () => api.get('/news/tags/'),
};

// Gallery API
export const galleryAPI = {
  getAlbums: (params) => api.get('/gallery/albums/', { params }),
  getAlbum: (id) => api.get(`/gallery/albums/${id}/`),
  getLatest: () => api.get('/gallery/albums/latest/'),
  createAlbum: (data) => api.post('/gallery/albums/', data),
  updateAlbum: (id, data) => api.patch(`/gallery/albums/${id}/`, data),
  deleteAlbum: (id) => api.delete(`/gallery/albums/${id}/`),
  uploadPhotos: (albumId, files) => {
    const formData = new FormData();
    formData.append('album', albumId);
    files.forEach((file) => formData.append('images', file));
    return api.post('/gallery/photos/bulk_upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePhoto: (id) => api.delete(`/gallery/photos/${id}/`),
};

// Courses API
export const coursesAPI = {
  getCourses: (params) => api.get('/courses/', { params }),
  getCourse: (id) => api.get(`/courses/${id}/`),
  getLatest: () => api.get('/courses/latest/'),
  getMyCourses: () => api.get('/courses/my_courses/'),
  getCreatedCourses: () => api.get('/courses/created_courses/'),
  getDrafts: () => api.get('/courses/drafts/'),
  createCourse: (data) => {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.post('/courses/', data, config);
  },
  updateCourse: (id, data) => {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.patch(`/courses/${id}/`, data, config);
  },
  deleteCourse: (id) => api.delete(`/courses/${id}/`),
  subscribe: (id) => api.post(`/courses/${id}/subscribe/`),
  unsubscribe: (id) => api.post(`/courses/${id}/unsubscribe/`),
  getSubscribers: (id) => api.get(`/courses/${id}/subscribers/`),
  removeSubscriber: (courseId, userId) =>
    api.post(`/courses/${courseId}/remove_subscriber/`, { user_id: userId }),
  publishCourse: (id) => api.post(`/courses/${id}/publish/`),
  unpublishCourse: (id) => api.post(`/courses/${id}/unpublish/`),

  // Sections
  getSections: (courseId) => api.get('/sections/', { params: { course: courseId } }),
  createSection: (data) => api.post('/sections/', data),
  updateSection: (id, data) => api.patch(`/sections/${id}/`, data),
  deleteSection: (id) => api.delete(`/sections/${id}/`),

  // Elements
  getElements: (sectionId) => api.get('/elements/', { params: { section: sectionId } }),
  getElement: (id) => api.get(`/elements/${id}/`),
  createElement: (data) => api.post('/elements/', data),
  updateElement: (id, data) => api.patch(`/elements/${id}/`, data),
  deleteElement: (id) => api.delete(`/elements/${id}/`),

  // Homework
  submitHomework: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => formData.append(key, data[key]));
    return api.post('/homework/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getHomework: (params) => api.get('/homework/', { params }),
  getHomeworkSubmission: (id) => api.get(`/homework/${id}/`),
  reviewHomework: (id, data) =>
    api.post(`/homework/${id}/review/`, {
      teacher_comment: data.comment,
      grade: data.grade,
    }),
  getHomeworkStatsByCourse: (courseId) =>
    api.get(`/homework/section-stats/?course_id=${courseId}`),
  getHomeworkReviewHistory: (submissionId) =>
    api.get(`/homework/${submissionId}/review_history/`),

  // Block Editor - Image Upload
  uploadImage: (file, sectionId) => {
    const formData = new FormData();
    formData.append('image', file);
    if (sectionId) formData.append('section_id', sectionId);
    return api.post('/elements/upload_image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Block Editor - Reorder Elements
  reorderElements: (items) => api.post('/elements/reorder/', { items }),
};

// Stats API
export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard/'),
  getUsersByGrade: () => api.get('/stats/users-by-grade/'),
  getPopularCourses: () => api.get('/stats/popular-courses/'),
  getActiveUsers: () => api.get('/stats/active-users/'),
};

export default api;
