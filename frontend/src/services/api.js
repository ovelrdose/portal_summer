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
  deleteUser: (id) => api.delete(`/users/${id}/delete/`),
};

// News API
export const newsAPI = {
  getNews: (params) => api.get('/news/', { params }),
  getNewsItem: (id) => api.get(`/news/${id}/`),
  getLatest: () => api.get('/news/latest/'),
  createNews: (data) => {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.post('/news/', data, config);
  },
  updateNews: (id, data) => {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.patch(`/news/${id}/`, data, config);
  },
  deleteNews: (id) => api.delete(`/news/${id}/`),
  publishNews: (id) => api.post(`/news/${id}/publish/`),
  unpublishNews: (id) => api.post(`/news/${id}/unpublish/`),
  getTags: () => api.get('/news/tags/'),
  uploadNewsImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/news/upload_image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Gallery API
export const galleryAPI = {
  getAlbums: (params) => api.get('/gallery/albums/', { params }),
  getAlbum: (id) => api.get(`/gallery/albums/${id}/`),
  getLatest: () => api.get('/gallery/albums/latest/'),
  createAlbum: (data) => {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.post('/gallery/albums/', data, config);
  },
  updateAlbum: (id, data) => {
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    return api.patch(`/gallery/albums/${id}/`, data, config);
  },
  deleteAlbum: (id) => api.delete(`/gallery/albums/${id}/`),
  publishAlbum: (id) => api.post(`/gallery/albums/${id}/publish/`),
  unpublishAlbum: (id) => api.post(`/gallery/albums/${id}/unpublish/`),
  getPhotos: (albumId) => api.get('/gallery/photos/', { params: { album: albumId } }),
  uploadPhotos: (albumId, files) => {
    const formData = new FormData();
    formData.append('album', albumId);
    files.forEach((file) => formData.append('images', file));
    return api.post('/gallery/photos/bulk_upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updatePhoto: (id, data) => api.patch(`/gallery/photos/${id}/`, data),
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
      request_revision: data.request_revision || false,
    }),
  resubmitHomework: (id, data) => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.comment) {
      formData.append('comment', data.comment);
    }
    return api.patch(`/homework/${id}/resubmit/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
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

  // Course Schedule
  getCourseSchedule: (courseId, includeHomework = false) => {
    const params = includeHomework ? { include_homework: 'true' } : {};
    return api.get(`/courses/${courseId}/schedule/`, { params });
  },

  // My Schedule (all courses)
  getMySchedule: () => api.get('/my-schedule/'),
};

// Stats API
export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard/'),
  getUsersByGrade: () => api.get('/stats/users-by-grade/'),
  getPopularCourses: () => api.get('/stats/popular-courses/'),
  getActiveUsers: () => api.get('/stats/active-users/'),
};

export default api;
