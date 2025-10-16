import { User, Company, Role, Module } from '../types';

// Estado de Autenticação
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Estado de Empresas (para Super Admin)
export interface CompaniesState {
  companies: Company[];
  isLoading: boolean;
  error: string | null;
  selectedCompanyId: string | null;
}

// Estado de Usuários da Empresa (para Company Master)
export interface CompanyUsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

// Estado de Roles da Empresa (para Company Master)
export interface CompanyRolesState {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
}

// Estado de Módulos
export interface ModulesState {
  modules: Module[];
  isLoading: boolean;
  error: string | null;
}

// Estado Global da Aplicação
export interface RootState {
  auth: AuthState;
  companies: CompaniesState;
  companyUsers: CompanyUsersState;
  companyRoles: CompanyRolesState;
  modules: ModulesState;
}

// Tipos para Actions
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  roleIds?: string[];
}

export interface CreateRoleData {
  name: string;
  scopes: string[];
}

export interface UpdateRoleData {
  name?: string;
  scopes?: string[];
}

export interface CreateCompanyData {
  name: string;
}
