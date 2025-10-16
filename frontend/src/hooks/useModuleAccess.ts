import { useAppSelector } from '../store/hooks';
import { 
  selectHasModuleAccess, 
  selectHasPermission, 
  selectHasAnyPermission, 
  selectHasAllPermissions,
  selectIsSuperAdmin,
  selectIsCompanyMaster
} from '../store/selectors';

/**
 * Hook para verificar se a empresa do usuário tem acesso a um módulo específico
 */
export const useModuleAccess = (moduleKey: string) => {
  const hasModuleAccess = useAppSelector(selectHasModuleAccess);
  return hasModuleAccess(moduleKey);
};

/**
 * Hook para verificar se o usuário tem uma permissão específica
 */
export const usePermission = (scope: string) => {
  const hasPermission = useAppSelector(selectHasPermission);
  return hasPermission(scope);
};

/**
 * Hook para verificar se o usuário tem qualquer uma das permissões fornecidas
 */
export const useAnyPermission = (scopes: string[]) => {
  const hasAnyPermission = useAppSelector(selectHasAnyPermission);
  return hasAnyPermission(scopes);
};

/**
 * Hook para verificar se o usuário tem todas as permissões fornecidas
 */
export const useAllPermissions = (scopes: string[]) => {
  const hasAllPermissions = useAppSelector(selectHasAllPermissions);
  return hasAllPermissions(scopes);
};

/**
 * Hook para verificar se o usuário é Company Master
 */
export const useIsCompanyMaster = () => {
  return useAppSelector(selectIsCompanyMaster);
};

/**
 * Hook para verificar se o usuário é Super Admin
 */
export const useIsSuperAdmin = () => {
  return useAppSelector(selectIsSuperAdmin);
};
