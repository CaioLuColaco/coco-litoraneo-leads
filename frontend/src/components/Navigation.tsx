import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="nav">
      <div className="nav-container">
        <div className="nav-brand">
          🥥 Coco Litorâneo Leads
        </div>
        
        <div className="nav-links">
          <Link
            to="/leads-enviados"
            className={`nav-link ${isActive('/leads-enviados') ? 'active' : ''}`}
          >
            📤 Leads Enviados
          </Link>
          
          <Link
            to="/leads-processados"
            className={`nav-link ${isActive('/leads-processados') ? 'active' : ''}`}
          >
            ✅ Leads Processados
          </Link>
        </div>
        
        <div className="nav-user">
          <span className="nav-greeting">
            Olá, <span className="nav-username">{user?.name}</span>
          </span>
          
          <button
            onClick={handleLogout}
            className="btn btn-logout"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
