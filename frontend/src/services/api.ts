import axios from 'axios';
import {
  LoginData,
  RegisterData,
  Lead,
  ApiResponse,
  UploadResponse,
  ScoringConfig,
  CreateScoringCategoryRequest,
  Seller,
  CreateSellerRequest
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const apiBaseUrl = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
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

export const authAPI = {
  login: async (data: LoginData): Promise<{ token: string; user: any }> => {
    const response = await api.post<ApiResponse<{ token: string; user: any }>>('/auth/login', data);
    return response.data.data;
  },

  register: async (data: RegisterData): Promise<{ token: string; user: any }> => {
    const response = await api.post<ApiResponse<{ token: string; user: any }>>('/auth/register', data);
    return response.data.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const leadsAPI = {
  // Buscar todos os leads (incluindo erros e pendentes)
  getAllLeads: async (): Promise<Lead[]> => {
    const response = await api.get<ApiResponse<Lead[]>>('/leads');
    return response.data.data;
  },

  // Buscar leads processados (mantido para compatibilidade)
  getProcessedLeads: async (): Promise<Lead[]> => {
    const response = await api.get<ApiResponse<Lead[]>>('/leads?status=processado');
    return response.data.data;
  },

  // Buscar leads enviados (pendentes)
  getPendingLeads: async (): Promise<Lead[]> => {
    const response = await api.get<ApiResponse<Lead[]>>('/leads?status=aguardando');
    return response.data.data;
  },

  // Atualizar lead
  updateLead: async (id: string, updates: Partial<Lead>): Promise<Lead> => {
    const response = await api.put<ApiResponse<Lead>>(`/leads/${id}`, updates);
    return response.data.data;
  },

  // Deletar lead
  deleteLead: async (id: string): Promise<void> => {
    await api.delete(`/leads/${id}`);
  },

  // Upload de planilha
  uploadExcel: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<ApiResponse<UploadResponse>>('/leads/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Exportar leads processados
  exportLeads: async (): Promise<Blob> => {
    const response = await api.post('/leads/export', {}, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Exportar leads selecionados
  exportSelectedLeads: async (data: { filters: { selectedIds: string[] } }): Promise<Blob> => {
    const response = await api.post('/leads/export', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Estatísticas
  getStats: async () => {
    const response = await api.get<ApiResponse<any>>('/leads/stats');
    return response.data.data;
  },
};

export const scoringAPI = {
  // Buscar todas as configurações
  getAllConfigs: async (): Promise<ScoringConfig[]> => {
    const response = await api.get<ApiResponse<ScoringConfig[]>>('/scoring/configs');
    return response.data.data;
  },

  // Buscar configuração ativa
  getActiveConfig: async (): Promise<ScoringConfig> => {
    const response = await api.get<ApiResponse<ScoringConfig>>('/scoring/configs/active');
    return response.data.data;
  },

  // Criar nova configuração
  createConfig: async (data: { name: string; description?: string; categories: CreateScoringCategoryRequest[] }): Promise<ScoringConfig> => {
    const response = await api.post<ApiResponse<ScoringConfig>>('/scoring/configs', data);
    return response.data.data;
  },

  // Ativar configuração
  activateConfig: async (id: string): Promise<ScoringConfig> => {
    const response = await api.post<ApiResponse<ScoringConfig>>(`/scoring/configs/${id}/activate`);
    return response.data.data;
  },

  // Atualizar configuração
  updateConfig: async (id: string, data: { name: string; description?: string; isActive?: boolean; categories: CreateScoringCategoryRequest[] }): Promise<ScoringConfig> => {
    const response = await api.put<ApiResponse<ScoringConfig>>(`/scoring/configs/${id}`, data);
    return response.data.data;
  },

  // Deletar configuração
  deleteConfig: async (id: string): Promise<void> => {
    await api.delete(`/scoring/configs/${id}`);
  },

  // Analisar potencial
  analyzePotential: async (data: any): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/scoring/analyze', data);
    return response.data.data;
  },

  // Obter detalhes da pontuação
  getScoreDetails: async (data: any): Promise<any> => {
    const response = await api.post<ApiResponse<any>>('/scoring/score-details', data);
    return response.data.data;
  },
};

export const sellersAPI = {
  getAll: async (): Promise<Seller[]> => {
    const response = await api.get<ApiResponse<Seller[]>>('/sellers');
    return response.data.data;
  },
  create: async (data: CreateSellerRequest): Promise<Seller> => {
    const response = await api.post<ApiResponse<Seller>>('/sellers', data);
    return response.data.data;
  },
  update: async (id: string, data: Partial<Seller>): Promise<Seller> => {
    const response = await api.put<ApiResponse<Seller>>(`/sellers/${id}`, data);
    return response.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/sellers/${id}`);
  },
};

export default api;
