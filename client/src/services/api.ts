import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finops_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if invalid
      localStorage.removeItem('finops_auth_token');
    }
    return Promise.reject(error);
  }
);

const buildQuery = (params: Record<string, any> = {}) => {
  const cleanParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== 'undefined' && val !== 'null' && val !== '') {
      cleanParams[key] = String(val);
    }
  });
  const qs = new URLSearchParams(cleanParams).toString();
  return qs ? `?${qs}` : '';
};

// API Service Endpoints
export const FinOpsAPI = {
  // Auth
  login: async (emailOrCreds: string | { email?: string; password?: string }, maybePassword?: string) => {
    let payload: { email?: string; password?: string };
    if (typeof emailOrCreds === 'string') {
      payload = { email: emailOrCreds, password: maybePassword };
    } else {
      payload = emailOrCreds;
    }
    const res = await api.post('/auth/login', payload);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // Dashboard
  getDashboardSummary: async () => {
    const res = await api.get('/dashboard/summary');
    return res.data;
  },
  getDashboardHealth: async () => {
    const res = await api.get('/dashboard/health');
    return res.data;
  },
  getDashboardCharts: async () => {
    const res = await api.get('/dashboard/charts');
    return res.data;
  },
  runStressTest: async (params: {
    revenueDropPercent?: number;
    refundIncreasePercent?: number;
    settlementDelayDays?: number;
    unexpectedExpense?: number;
  }) => {
    const res = await api.post('/dashboard/stress-test', params);
    return res.data;
  },

  // AI Agent Investigator
  investigate: async (question: string) => {
    const res = await api.post('/agent/investigate', { question });
    return res.data;
  },
  getInvestigations: async () => {
    const res = await api.get('/agent/investigations');
    return res.data;
  },
  getInvestigationById: async (id: string) => {
    const res = await api.get(`/agent/investigations/${id}`);
    return res.data;
  },
  getInvestigationActivity: async (id: string) => {
    const res = await api.get(`/agent/investigations/${id}/activity`);
    return res.data;
  },
  getAllAgentActivity: async () => {
    const res = await api.get('/agent/activity');
    return res.data;
  },
  approveResolution: async (investigationId: string) => {
    const res = await api.post(`/agent/investigations/${investigationId}/approve`);
    return res.data;
  },

  // Reconciliation
  getReconciliationSummary: async () => {
    const res = await api.get('/reconciliation/summary');
    return res.data;
  },
  getReconciliationRecords: async (params: { status?: string; mismatchType?: string; page?: number; limit?: number } = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/reconciliation/records${qs}`);
    return res.data;
  },
  getReconciliationPreview: async () => {
    const res = await api.get('/reconciliation/preview');
    return res.data;
  },
  runReconciliation: async () => {
    const res = await api.post('/reconciliation/run');
    return res.data;
  },

  // Anomalies
  getAnomalies: async (params: { severity?: string; status?: string; limit?: number } = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/anomalies${qs}`);
    return res.data;
  },
  getAnomaliesSummary: async () => {
    const res = await api.get('/anomalies/summary');
    return res.data;
  },

  // Payments, Settlements, Disputes, Refunds
  getPayments: async (params: { status?: string; method?: string; limit?: number; page?: number; search?: string } = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/payments${qs}`);
    return res.data;
  },
  getSettlements: async (params: { status?: string; limit?: number; page?: number } = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/settlements${qs}`);
    return res.data;
  },
  getDisputes: async (params: { status?: string; limit?: number } = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/disputes${qs}`);
    return res.data;
  },
  getRefunds: async (params: { status?: string; limit?: number } = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/refunds${qs}`);
    return res.data;
  },

  // Demo Control
  resetDemo: async () => {
    const res = await api.post('/demo/reset');
    return res.data;
  },
  loadDemoScenario: async (scenario: string) => {
    const res = await api.post('/demo/load', { scenario });
    return res.data;
  },

  // Webhooks
  getWebhookSummary: async () => {
    const res = await api.get('/webhooks/summary');
    return res.data;
  },
  getWebhookLogs: async (params: { status?: string; eventType?: string; search?: string; page?: number; limit?: number } = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/webhooks/logs${qs}`);
    return res.data;
  },
  getWebhookById: async (id: string) => {
    const res = await api.get(`/webhooks/logs/${id}`);
    return res.data;
  },
  simulateWebhook: async (scenario: 'SUCCESS' | 'DUPLICATE' | 'INVALID_SIGNATURE' | 'OUT_OF_ORDER' | 'FAILED') => {
    const res = await api.post('/webhooks/simulate', { scenario });
    return res.data;
  },
  retryWebhook: async (id: string) => {
    const res = await api.post(`/webhooks/logs/${id}/retry`);
    return res.data;
  },
};
