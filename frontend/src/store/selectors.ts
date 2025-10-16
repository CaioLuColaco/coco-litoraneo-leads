import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './index';

// Seletores para autenticação
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

// Seletores para empresas
export const selectCompanies = (state: RootState) => state.companies.companies;
export const selectCompaniesLoading = (state: RootState) => state.companies.isLoading;
export const selectCompaniesError = (state: RootState) => state.companies.error;
export const selectSelectedCompanyId = (state: RootState) => state.companies.selectedCompanyId;

// Seletores para usuários da empresa
export const selectCompanyUsers = (state: RootState) => state.companyUsers.users;
export const selectCompanyUsersLoading = (state: RootState) => state.companyUsers.isLoading;
export const selectCompanyUsersError = (state: RootState) => state.companyUsers.error;

// Seletores para roles da empresa
export const selectCompanyRoles = (state: RootState) => state.companyRoles.roles;
export const selectCompanyRolesLoading = (state: RootState) => state.companyRoles.isLoading;
export const selectCompanyRolesError = (state: RootState) => state.companyRoles.error;

// Seletores para módulos
export const selectModules = (state: RootState) => state.modules.modules;
export const selectModulesLoading = (state: RootState) => state.modules.isLoading;
export const selectModulesError = (state: RootState) => state.modules.error;

// Seletores computados
export const selectIsSuperAdmin = createSelector(
  [selectUser],
  (user) => user?.isSuperAdmin || false
);

export const selectIsCompanyMaster = createSelector(
  [selectUser],
  (user) => {
    if (!user?.roles) return false;
    return user.roles.some((role: any) => role.role?.name === 'MASTER');
  }
);

export const selectUserScopes = createSelector(
  [selectUser],
  (user) => user?.scopes || []
);

export const selectUserCompany = createSelector(
  [selectUser],
  (user) => user?.company
);

export const selectUserCompanyId = createSelector(
  [selectUser],
  (user) => user?.companyId
);

// Seletores para verificação de acesso a módulos
export const selectHasModuleAccess = createSelector(
  [selectUser, selectModules],
  (user, modules) => (moduleKey: string) => {
    // Super Admin sempre tem acesso a todos os módulos
    if (user?.isSuperAdmin) {
      return true;
    }

    // Por enquanto, vamos assumir que todas as empresas têm acesso aos módulos
    // Em uma implementação real, isso viria de uma API que retorna os módulos ativos da empresa
    const moduleMapping: Record<string, boolean> = {
      'COMMERCIAL': true,  // Módulo comercial sempre disponível
      'FINANCE': true,     // Módulo financeiro sempre disponível
      'USERS': true,       // Módulo de usuários sempre disponível
      'ROLES': true,       // Módulo de roles sempre disponível
    };

    return moduleMapping[moduleKey] || false;
  }
);

// Seletores para verificação de permissões
export const selectHasPermission = createSelector(
  [selectUser],
  (user) => (permission: string) => {
    // Super Admin sempre tem todas as permissões
    if (user?.isSuperAdmin) {
      return true;
    }

    // Se não há usuário ou scopes, não tem permissão
    if (!user?.scopes || user.scopes.length === 0) {
      return false;
    }

    // Verificar se o usuário tem a permissão específica
    return user.scopes.includes(permission);
  }
);

export const selectHasAnyPermission = createSelector(
  [selectUser],
  (user) => (permissions: string[]) => {
    // Super Admin sempre tem todas as permissões
    if (user?.isSuperAdmin) {
      return true;
    }

    // Se não há usuário ou scopes, não tem permissão
    if (!user?.scopes || user.scopes.length === 0) {
      return false;
    }

    // Verificar se o usuário tem pelo menos uma das permissões
    return permissions.some(permission => user.scopes?.includes(permission));
  }
);

export const selectHasAllPermissions = createSelector(
  [selectUser],
  (user) => (permissions: string[]) => {
    // Super Admin sempre tem todas as permissões
    if (user?.isSuperAdmin) {
      return true;
    }

    // Se não há usuário ou scopes, não tem permissão
    if (!user?.scopes || user.scopes.length === 0) {
      return false;
    }

    // Verificar se o usuário tem todas as permissões
    return permissions.every(permission => user.scopes?.includes(permission));
  }
);
