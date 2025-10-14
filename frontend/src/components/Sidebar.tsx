import React, { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SquareCheckBig, MapPinned, Users, Cog, Send } from 'lucide-react';

export interface SidebarItem {
  path: string;
  label: string;
  icon?: ReactElement<any, any>;
  requiredRoles?: string[];
}

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}

const menuItems: SidebarItem[] = [
  { path: '/leads-enviados', label: 'Enviar Leads', icon: <Send /> },
  { path: '/leads-processados', label: 'Leads Processados', icon: <SquareCheckBig /> },
  { path: '/mapa', label: 'Mapa', icon: <MapPinned /> },
  { path: '/vendedores', label: 'Vendedores', icon: <Users /> },
  { path: '/configuracao-pontuacao', label: 'Configuração', icon: <Cog /> }
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, isMobileOpen, onCloseMobile, onToggleCollapse }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isMobileOpen ? 'sidebar--mobile-open' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">🥥</span>
        {!isCollapsed && (
          <span className="sidebar__brand-name">Coco Litorâneo Leads</span>
        )}
      </div>

      <nav className="sidebar__nav" aria-label="Navegação principal">
        {menuItems.map(item => {
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


