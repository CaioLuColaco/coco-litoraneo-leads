import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { superAdminAPI } from '../services/api';
import { Company } from '../types';
import './CompanySelector.css';

interface CompanySelectorProps {
  onCompanyChange?: (companyId: string) => void;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ onCompanyChange }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
    
    // Carregar empresa ativa do localStorage
    const activeCompanyId = localStorage.getItem('activeCompanyId');
    if (activeCompanyId) {
      // Encontrar empresa pelo ID quando as empresas carregarem
      const company = companies.find(c => c.id === activeCompanyId);
      if (company) {
        setSelectedCompany(company);
      }
    }
  }, []);

  useEffect(() => {
    // Quando as empresas carregarem, verificar se há empresa ativa
    if (companies.length > 0) {
      const activeCompanyId = localStorage.getItem('activeCompanyId');
      if (activeCompanyId) {
        const company = companies.find(c => c.id === activeCompanyId);
        if (company) {
          setSelectedCompany(company);
        }
      }
    }
  }, [companies]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const companiesData = await superAdminAPI.getCompanies();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setIsOpen(false);
    
    // Salvar empresa ativa no localStorage
    localStorage.setItem('activeCompanyId', company.id);
    
    // Notificar componente pai
    if (onCompanyChange) {
      onCompanyChange(company.id);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  if (isLoading) {
    return (
      <div className="company-selector">
        <div className="selector-loading">
          <div className="spinner"></div>
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="company-selector">
      <div className="selector-label">
        <Building2 size={16} />
        <span>Empresa Ativa:</span>
      </div>
      
      <div className="selector-dropdown">
        <button 
          className="selector-button"
          onClick={toggleDropdown}
        >
          <div className="selector-content">
            <Building2 size={20} />
            <span className="selector-text">
              {selectedCompany ? selectedCompany.name : 'Selecionar empresa'}
            </span>
          </div>
          <ChevronDown size={20} className={`chevron ${isOpen ? 'open' : ''}`} />
        </button>

        {isOpen && (
          <div className="selector-menu">
            {companies.length === 0 ? (
              <div className="menu-empty">
                <span>Nenhuma empresa encontrada</span>
              </div>
            ) : (
              companies.map(company => (
                <button
                  key={company.id}
                  className={`menu-item ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                  onClick={() => handleCompanySelect(company)}
                >
                  <Building2 size={16} />
                  <span>{company.name}</span>
                  {selectedCompany?.id === company.id && (
                    <span className="checkmark">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySelector;
