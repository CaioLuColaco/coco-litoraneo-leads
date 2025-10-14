import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from './AppLayout';
import Sidebar from './Sidebar';
import useSidebarState from '../hooks/useSidebarState';
import LeadsEnviados from '../pages/LeadsEnviados';
import LeadsProcessados from '../pages/LeadsProcessados';
import { LeadsMap } from '../pages/LeadsMap';
import { ScoringConfig } from '../pages/ScoringConfig';
import Sellers from '../pages/Sellers';
import AuthForm from './AuthForm';

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const sidebarState = useSidebarState({ userId: (user as any)?.id ?? (user as any)?.email ?? undefined });

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {!isAuthenticated ? (
          <AuthForm />
        ) : (
          <AppLayout
            sidebar={<Sidebar
              isCollapsed={sidebarState.isCollapsed}
              isMobileOpen={sidebarState.isMobileOpen}
              onCloseMobile={sidebarState.closeMobile}
              onToggleCollapse={sidebarState.toggleCollapsed}
            />}
            isMobileOpen={sidebarState.isMobileOpen}
            onOpenMobile={sidebarState.openMobile}
            onCloseMobile={sidebarState.closeMobile}
            onToggleCollapse={sidebarState.toggleCollapsed}
            isCollapsed={sidebarState.isCollapsed}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/leads-enviados" replace />} />
              <Route path="/leads-enviados" element={<LeadsEnviados />} />
              <Route path="/leads-processados" element={<LeadsProcessados />} />
              <Route path="/mapa" element={<LeadsMap />} />
              <Route path="/configuracao-pontuacao" element={<ScoringConfig />} />
              <Route path="/vendedores" element={<Sellers />} />
              <Route path="*" element={<Navigate to="/leads-enviados" replace />} />
            </Routes>
          </AppLayout>
        )}
      </div>
    </Router>
  );
};

export default AppRouter;
