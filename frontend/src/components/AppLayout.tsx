import React from 'react';

interface AppLayoutProps {
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  isMobileOpen: boolean;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, header, children, isMobileOpen, onOpenMobile, onCloseMobile, onToggleCollapse, isCollapsed }) => {
  return (
    <div className={`app-shell ${isMobileOpen ? 'app-shell--drawer-open' : ''}`}>
      {sidebar}

      <div className="content">
        <div className="content__header">
          <button
            className="content__hamburger"
            onClick={isMobileOpen ? onCloseMobile : onOpenMobile}
            aria-label={isMobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
            aria-expanded={isMobileOpen}
          >
            ☰
          </button>
          <button
            className="content__sidebar-toggle"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            aria-pressed={!!isCollapsed}
          >
            <span className={`content__sidebar-toggle-icon ${isCollapsed ? 'rotated' : ''}`}>{isCollapsed ? '›' : '‹'}</span>
          </button>
          {header}
        </div>

        <div className="content__body">
          {children}
        </div>
      </div>

      {isMobileOpen && (
        <div className="overlay" role="button" aria-label="Fechar navegação" onClick={onCloseMobile}></div>
      )}
    </div>
  );
};

export default AppLayout;


