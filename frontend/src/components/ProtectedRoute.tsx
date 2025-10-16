import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModuleAccess, usePermission, useAnyPermission, useAllPermissions } from '../hooks/useModuleAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  moduleKey?: string;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
}

/**
 * Componente para proteger rotas baseadas em módulos e permissões
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  moduleKey,
  permission,
  permissions,
  requireAll = false,
  fallbackPath = '/leads-enviados'
}) => {
  // Verificar acesso ao módulo se especificado
  const hasModuleAccess = useModuleAccess(moduleKey || '');
  
  // Verificar permissão específica se especificada
  const hasPermission = usePermission(permission || '');
  
  // Verificar múltiplas permissões se especificadas
  const hasAnyPermission = useAnyPermission(permissions || []);
  const hasAllPermissions = useAllPermissions(permissions || []);

  // Determinar se o usuário tem acesso
  let hasAccess = true;

  if (moduleKey && !hasModuleAccess) {
    hasAccess = false;
  }

  if (permission && !hasPermission) {
    hasAccess = false;
  }

  if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAccess && hasAllPermissions;
    } else {
      hasAccess = hasAccess && hasAnyPermission;
    }
  }

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
