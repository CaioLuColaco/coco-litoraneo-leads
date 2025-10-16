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
import Profile from '../pages/Profile';
import AccessDenied from '../pages/AccessDenied';
import ProtectedRoute from './ProtectedRoute';
import SuperAdminCompanies from '../pages/SuperAdmin/Companies';
import SuperAdminUsers from '../pages/SuperAdmin/Users';
import CompanyMasterUsers from '../pages/CompanyMaster/Users';
import CompanyMasterRoles from '../pages/CompanyMaster/Roles';
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
              <Route path="/leads-enviados" element={
                <ProtectedRoute moduleKey="COMMERCIAL">
                  <LeadsEnviados />
                </ProtectedRoute>
              } />
              <Route path="/leads-processados" element={
                <ProtectedRoute moduleKey="COMMERCIAL">
                  <LeadsProcessados />
                </ProtectedRoute>
              } />
              <Route path="/mapa" element={
                <ProtectedRoute moduleKey="COMMERCIAL">
                  <LeadsMap />
                </ProtectedRoute>
              } />
              <Route path="/configuracao-pontuacao" element={
                <ProtectedRoute moduleKey="FINANCE">
                  <ScoringConfig />
                </ProtectedRoute>
              } />
              <Route path="/vendedores" element={
                <ProtectedRoute moduleKey="COMMERCIAL">
                  <Sellers />
                </ProtectedRoute>
              } />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/superadmin/companies" element={
                <ProtectedRoute permission="superadmin.companies">
                  <SuperAdminCompanies />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/users" element={
                <ProtectedRoute permission="superadmin.users">
                  <SuperAdminUsers />
                </ProtectedRoute>
              } />
              <Route path="/company/users" element={
                <ProtectedRoute permission="users.manage">
                  <CompanyMasterUsers />
                </ProtectedRoute>
              } />
              <Route path="/company/roles" element={
                <ProtectedRoute permission="roles.manage">
                  <CompanyMasterRoles />
                </ProtectedRoute>
              } />
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route path="*" element={<Navigate to="/leads-enviados" replace />} />
            </Routes>
          </AppLayout>
        )}
      </div>
    </Router>
  );
};

export default AppRouter;
