import React, { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SquareCheckBig, MapPinned, Users, Cog, Send, User, Crown, Building2, Shield } from 'lucide-react';
import { useModuleAccess, useIsSuperAdmin, useIsCompanyMaster } from '../hooks/useModuleAccess';
import CompanySelector from './CompanySelector';

export interface SidebarItem {
  path: string;
  label: string;
  icon?: ReactElement<any, any>;
  requiredRoles?: string[];
  requiredModule?: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}

const menuItems: SidebarItem[] = [
  { path: '/leads-enviados', label: 'Enviar Leads', icon: <Send />, requiredModule: 'COMMERCIAL' },
  { path: '/leads-processados', label: 'Leads Processados', icon: <SquareCheckBig />, requiredModule: 'COMMERCIAL' },
  { path: '/mapa', label: 'Mapa', icon: <MapPinned />, requiredModule: 'COMMERCIAL' },
  { path: '/vendedores', label: 'Vendedores', icon: <Users />, requiredModule: 'COMMERCIAL' },
  { path: '/configuracao-pontuacao', label: 'Configuração', icon: <Cog />, requiredModule: 'FINANCE' },
  { path: '/perfil', label: 'Meu Perfil', icon: <User /> }
];

const superAdminItems: SidebarItem[] = [
  { path: '/superadmin/companies', label: 'Empresas', icon: <Building2 /> },
  { path: '/superadmin/users', label: 'Usuários Globais', icon: <Users /> }
];

const companyMasterItems: SidebarItem[] = [
  { path: '/company/users', label: 'Usuários', icon: <Users /> },
  { path: '/company/roles', label: 'Permissões', icon: <Shield /> }
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, isMobileOpen, onCloseMobile, onToggleCollapse }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  // Verificar acesso aos módulos
  const hasCommercialAccess = useModuleAccess('COMMERCIAL');
  const hasFinanceAccess = useModuleAccess('FINANCE');
  const isSuperAdmin = useIsSuperAdmin();
  const isCompanyMaster = useIsCompanyMaster();

  // Filtrar itens do menu baseado no acesso aos módulos
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.requiredModule) {
      return true; // Itens sem módulo obrigatório sempre aparecem
    }
    
    // Verificar se o usuário tem acesso ao módulo
    if (item.requiredModule === 'COMMERCIAL') {
      return hasCommercialAccess;
    }
    if (item.requiredModule === 'FINANCE') {
      return hasFinanceAccess;
    }
    
    return false;
  });

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isMobileOpen ? 'sidebar--mobile-open' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">🥥</span>
        {!isCollapsed && (
          <span className="sidebar__brand-name">Coco Litorâneo Leads</span>
        )}
      </div>

      {/* Company Selector para Super Admin */}
      {isSuperAdmin && !isCollapsed && (
        <div className="sidebar__company-selector">
          <CompanySelector />
        </div>
      )}

      <nav className="sidebar__nav" aria-label="Navegação principal">
        {/* Seção Super Admin */}
        {isSuperAdmin && (
          <>
            <div className="sidebar__section-title">
              <Crown size={16} />
              <span>Super Admin</span>
            </div>
            {superAdminItems.map(item => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar__link sidebar__link--superadmin ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={isMobileOpen ? onCloseMobile : undefined}
                >
                  <span className="sidebar__icon" aria-hidden="true">{item.icon ?? '•'}</span>
                  {!isCollapsed && <span className="sidebar__label">{item.label}</span>}
                </Link>
              );
            })}
            <div className="sidebar__divider"></div>
          </>
        )}

        {/* Seção Company Master */}
        {isCompanyMaster && !isSuperAdmin && (
          <>
            <div className="sidebar__section-title">
              <Shield size={16} />
              <span>Gerenciamento</span>
            </div>
            {companyMasterItems.map(item => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar__link sidebar__link--master ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={isMobileOpen ? onCloseMobile : undefined}
                >
                  <span className="sidebar__icon" aria-hidden="true">{item.icon ?? '•'}</span>
                  {!isCollapsed && <span className="sidebar__label">{item.label}</span>}
                </Link>
              );
            })}
            <div className="sidebar__divider"></div>
          </>
        )}

        {/* Menu principal */}
        {filteredMenuItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar__link ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={isMobileOpen ? onCloseMobile : undefined}
            >
              <span className="sidebar__icon" aria-hidden="true">{item.icon ?? '•'}</span>
              {!isCollapsed && <span className="sidebar__label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar__spacer"></div>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__user-info">
            {!isCollapsed && (
              <>
                <span className="sidebar__greeting">Olá,</span>
                <span className="sidebar__username">{" " + user?.name}</span>
              </>
            )}
          </div>
          <button className="sidebar__logout" onClick={handleLogout}>Sair</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


