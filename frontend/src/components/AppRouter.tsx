import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './Navigation';
import LeadsEnviados from '../pages/LeadsEnviados';
import LeadsProcessados from '../pages/LeadsProcessados';
import { LeadsMap } from '../pages/LeadsMap';
import { ScoringConfig } from '../pages/ScoringConfig';
import Sellers from '../pages/Sellers';
import AuthForm from './AuthForm';

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

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
          <>
            <Navigation />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/leads-enviados" replace />} />
                <Route path="/leads-enviados" element={<LeadsEnviados />} />
                <Route path="/leads-processados" element={<LeadsProcessados />} />
                <Route path="/mapa" element={<LeadsMap />} />
                <Route path="/configuracao-pontuacao" element={<ScoringConfig />} />
                <Route path="/vendedores" element={<Sellers />} />
                <Route path="*" element={<Navigate to="/leads-enviados" replace />} />
              </Routes>
            </main>
          </>
        )}
      </div>
    </Router>
  );
};

export default AppRouter;
