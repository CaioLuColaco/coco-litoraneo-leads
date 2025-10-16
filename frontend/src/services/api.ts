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
  CreateSellerRequest,
  AuthResponse,
  ProfileUpdateData,
  PasswordChangeData,
  Company,
  User,
  Role,
  UserRole
} from '../types';
import { TokenService } from './tokenService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const apiBaseUrl = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(async (config) => {
  try {
    // Garantir que temos um token válido
    const accessToken = await TokenService.ensureValidToken();
    config.headers.Authorization = `Bearer ${accessToken}`;
  } catch (error) {
    // Se não conseguiu obter token válido, não adiciona header
    console.warn('Não foi possível obter token válido:', error);
  }
  
  // Adicionar X-Company-Id para Super Admin
  const companyId = localStorage.getItem('activeCompanyId');
  if (companyId) {
    config.headers['X-Company-Id'] = companyId;
  }
  
  return config;
});

// Interceptor para tratar erros de autenticação e refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Se é erro 401 e não é uma tentativa de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Tentar renovar o token
        const newAccessToken = await TokenService.refreshAccessToken();
        
        // Reenviar a requisição original com o novo token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Falha ao renovar token:', refreshError);
        
        // Se falhou ao renovar, limpar tokens e redirecionar
        TokenService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Para outros erros 401 (como refresh falhou), limpar tokens
    if (error.response?.status === 401) {
      TokenService.clearTokens();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
      refreshToken
    });
    return response.data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  updateProfile: async (data: ProfileUpdateData): Promise<User> => {
    const response = await api.put<ApiResponse<User>>('/auth/me', data);
    return response.data.data;
  },

  changePassword: async (data: PasswordChangeData): Promise<void> => {
    await api.put('/auth/me/password', data);
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.warn('Erro ao fazer logout no servidor:', error);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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

// Super Admin API
export const superAdminAPI = {
  // Companies
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<ApiResponse<Company[]>>('/superadmin/companies');
    return response.data.data;
  },

  createCompany: async (data: { name: string }): Promise<Company> => {
    const response = await api.post<ApiResponse<Company>>('/superadmin/companies', data);
    return response.data.data;
  },

  updateCompany: async (id: string, data: { name: string }): Promise<Company> => {
    const response = await api.put<ApiResponse<Company>>(`/superadmin/companies/${id}`, data);
    return response.data.data;
  },

  // Users
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/superadmin/users');
    return response.data.data;
  },
};

// Company Master API
export const companyMasterAPI = {
  // Users
  getCompanyUsers: async (companyId: string): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>(`/companies/${companyId}/users`);
    return response.data.data;
  },

  createUser: async (companyId: string, data: {
    name: string;
    email: string;
    password: string;
    roleIds: string[];
  }): Promise<User> => {
    const response = await api.post<ApiResponse<User>>(`/companies/${companyId}/users`, data);
    return response.data.data;
  },

  updateUser: async (companyId: string, userId: string, data: {
    name?: string;
    email?: string;
    roleIds?: string[];
  }): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/companies/${companyId}/users/${userId}`, data);
    return response.data.data;
  },

  // Roles
  getCompanyRoles: async (companyId: string): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>(`/companies/${companyId}/roles`);
    return response.data.data;
  },

  createRole: async (companyId: string, data: {
    name: string;
    scopes: string[];
  }): Promise<Role> => {
    const response = await api.post<ApiResponse<Role>>(`/companies/${companyId}/roles`, data);
    return response.data.data;
  },

  updateRole: async (companyId: string, roleId: string, data: {
    name?: string;
    scopes?: string[];
  }): Promise<Role> => {
    const response = await api.put<ApiResponse<Role>>(`/companies/${companyId}/roles/${roleId}`, data);
    return response.data.data;
  },
};

export default api;
