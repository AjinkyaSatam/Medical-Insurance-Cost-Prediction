import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const api = {
  checkHealth: async () => {
    const res = await apiClient.get('/api/health');
    return res.data;
  },

  predictCost: async (payload) => {
    const res = await apiClient.post('/api/predict', payload);
    return res.data;
  },

  getWhatif: async (payload) => {
    const res = await apiClient.post('/api/whatif', payload);
    return res.data;
  },

  calculateBmi: async (payload) => {
    const res = await apiClient.post('/api/bmi-calculate', payload);
    return res.data;
  },

  predictBatch: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/api/predict-batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
    return res.data;
  },

  getSampleBulkCsvUrl: () => `${API_BASE_URL}/api/sample-bulk-csv`,

  getEdaData: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.region && params.region.length) {
      params.region.forEach((r) => query.append('region', r));
    }
    if (params.smoker && params.smoker.length) {
      params.smoker.forEach((s) => query.append('smoker', s));
    }
    if (params.age_min !== undefined && params.age_min !== null) {
      query.append('age_min', params.age_min);
    }
    if (params.age_max !== undefined && params.age_max !== null) {
      query.append('age_max', params.age_max);
    }
    const res = await apiClient.get(`/api/eda?${query.toString()}`);
    return res.data;
  },

  getMetrics: async () => {
    const res = await apiClient.get('/api/metrics');
    return res.data;
  },

  getInsights: async () => {
    const res = await apiClient.get('/api/insights');
    return res.data;
  },
};

export default apiClient;
