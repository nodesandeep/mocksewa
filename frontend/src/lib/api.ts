import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });

// ── Request interceptor: attach access token ──────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-refresh on 401 ─────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },
  register: (email: string, password: string, full_name?: string) =>
    api.post('/auth/register', { email, password, full_name }),
  me: () => api.get('/auth/me'),
  logout: (refresh_token: string) => api.post('/auth/logout', { refresh_token }),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  modules: { list: () => api.get('/admin/modules'), create: (d: object) => api.post('/admin/modules', d), delete: (id: number) => api.delete(`/admin/modules/${id}`) },
  courses: { list: (moduleId?: number) => api.get('/admin/courses', { params: moduleId ? { module_id: moduleId } : {} }), create: (d: object) => api.post('/admin/courses', d), delete: (id: number) => api.delete(`/admin/courses/${id}`) },
  chapters: { list: (courseId?: number) => api.get('/admin/chapters', { params: courseId ? { course_id: courseId } : {} }), create: (d: object) => api.post('/admin/chapters', d), delete: (id: number) => api.delete(`/admin/chapters/${id}`) },
  dryRun: (chapterId: number, file: File) => { const f = new FormData(); f.append('file', file); return api.post(`/admin/questions/upload/dry-run?chapter_id=${chapterId}`, f, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  commitCsv: (chapterId: number, file: File) => { const f = new FormData(); f.append('file', file); return api.post(`/admin/questions/upload/commit?chapter_id=${chapterId}`, f, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  users: {
    pending: () => api.get('/admin/users/pending'),
    approve: (userId: number, moduleId: number, makeAdmin: boolean = false) => 
      api.patch(`/admin/users/${userId}/approve`, null, { params: { module_id: moduleId, make_admin: makeAdmin } })
  }
};

// ── Quiz ──────────────────────────────────────────────────────────────────
export const quizApi = {
  start: (chapterId: number) => api.post('/quiz/start', { chapter_id: chapterId }),
  submit: (sessionId: number, answers: object[]) => api.post('/quiz/submit', { session_id: sessionId, answers }),
  history: () => api.get('/quiz/history'),
};

// ── Student ───────────────────────────────────────────────────────────────
export const studentApi = {
  dashboard: () => api.get('/student/dashboard'),
  radar: () => api.get('/student/radar'),
};

// ── Video ─────────────────────────────────────────────────────────────────
export const videoApi = {
  updateProgress: (chapterId: number, watchPercent: number, lastPositionSeconds: number) =>
    api.post('/video/progress', { chapter_id: chapterId, watch_percent: watchPercent, last_position_seconds: lastPositionSeconds }),
  getProgress: (chapterId: number) => api.get(`/video/progress/${chapterId}`),
};

// ── Leaderboard ───────────────────────────────────────────────────────────
export const leaderboardApi = {
  top: () => api.get('/leaderboard/top'),
};
