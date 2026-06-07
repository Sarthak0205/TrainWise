import axios from 'axios';

const api = axios.create({
  baseURL: '' // Vite proxy redirects relative /api paths to http://127.0.0.1:8000
});

// Automatically inject active JWT token in Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const workoutApi = {
  // Ingest workout history CSV file
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/workouts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update user personalization profile settings
  updateProfile: async (profileData) => {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  },

  // Get current workout session fatigue & plateau analysis
  getWorkoutAnalysis: async () => {
    const response = await api.get('/api/workouts/analyze');
    return response.data;
  },

  // Get progressive overload set recommendations (ML-heuristic hybrid)
  getWorkoutRecommendations: async () => {
    const response = await api.get('/api/workouts/recommendations');
    return response.data;
  },

  // Get dashboard summary statistics (sessions, trends, fatigue, balance)
  getDashboardSummary: async () => {
    const response = await api.get('/api/workouts/dashboard/summary');
    return response.data;
  },

  // Get paginated session history list
  getSessionHistory: async (limit = 10, page = 1) => {
    const response = await api.get(`/api/workouts/dashboard/sessions`, {
      params: { limit, page }
    });
    return response.data;
  },

  // Get detailed stats & trends for a specific exercise
  getExerciseAnalytics: async (exerciseName) => {
    const response = await api.get(`/api/workouts/analytics/exercise/${encodeURIComponent(exerciseName)}`);
    return response.data;
  },

  // Get ML feature importance rankings
  getMLFeatureImportance: async () => {
    const response = await api.get('/api/analytics/ml/feature-importance');
    return response.data;
  },

  // Get ML performance validation benchmarks
  getMLPerformance: async () => {
    const response = await api.get('/api/analytics/ml/performance');
    return response.data;
  }
};

export const coachingApi = {
  getSummary: async (date) => {
    const response = await api.get('/api/coaching/summary', { params: { date } });
    return response.data;
  }
};

export const dailyLogApi = {
  createOrUpdateLog: async (logData) => {
    const response = await api.post('/api/daily-log', logData);
    return response.data;
  },
  getTodaysLog: async (date) => {
    const response = await api.get('/api/daily-log/today', { params: { date } });
    return response.data;
  },
  getRecentLogs: async (limit = 7) => {
    const response = await api.get('/api/daily-log/recent', { params: { limit } });
    return response.data;
  },
  getDateRangeLogs: async (start, end) => {
    const response = await api.get('/api/daily-log/range', { params: { start, end } });
    return response.data;
  }
};

export default api;
