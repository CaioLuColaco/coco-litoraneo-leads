import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import './AccessDenied.css';

const AccessDenied: React.FC = () => {
  return (
    <div className="access-denied-container">
      <div className="access-denied-content">
        <div className="access-denied-icon">
          <ShieldX size={64} />
        </div>
        
        <h1>Acesso Negado</h1>
        
        <p className="access-denied-message">
          Você não tem permissão para acessar esta página.
        </p>
        
        <p className="access-denied-submessage">
          Entre em contato com o administrador da sua empresa para solicitar acesso.
        </p>
        
        <div className="access-denied-actions">
          <Link to="/leads-enviados" className="btn btn-primary">
            <ArrowLeft size={20} />
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
