import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Eye, Users, Calendar } from 'lucide-react';
import { superAdminAPI } from '../../services/api';
import { Company } from '../../types';
import '../SuperAdmin.css';

interface CompanyWithStats extends Company {
  userCount?: number;
  moduleCount?: number;
}

const SuperAdminCompanies: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const companiesData = await superAdminAPI.getCompanies();
      
      // Simular estatísticas (em uma implementação real, isso viria da API)
      const companiesWithStats = companiesData.map(company => ({
        ...company,
        userCount: Math.floor(Math.random() * 50) + 1,
        moduleCount: Math.floor(Math.random() * 3) + 1
      }));
      
      setCompanies(companiesWithStats);
    } catch (error: any) {
      setError('Erro ao carregar empresas: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const newCompany = await superAdminAPI.createCompany(formData);
      setCompanies(prev => [newCompany, ...prev]);
      setSuccess('Empresa criada com sucesso!');
      setShowCreateModal(false);
      setFormData({ name: '' });
    } catch (error: any) {
      setError('Erro ao criar empresa: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedCompany = await superAdminAPI.updateCompany(editingCompany.id, formData);
      setCompanies(prev => prev.map(company => 
        company.id === updatedCompany.id ? updatedCompany : company
      ));
      setSuccess('Empresa atualizada com sucesso!');
      setShowEditModal(false);
      setEditingCompany(null);
      setFormData({ name: '' });
    } catch (error: any) {
      setError('Erro ao atualizar empresa: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({ name: company.name });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingCompany(null);
    setFormData({ name: '' });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Paginação
  const totalPages = Math.ceil(companies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = companies.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading && companies.length === 0) {
    return (
      <div className="superadmin-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-container">
      <div className="superadmin-header">
        <div className="header-content">
          <div className="header-title">
            <Building2 size={32} />
            <h1>Gerenciamento de Empresas</h1>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            Nova Empresa
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="companies-content">
        <div className="companies-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Building2 size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">{companies.length}</div>
              <div className="stat-label">Total de Empresas</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">
                {companies.reduce((sum, company) => sum + (company.userCount || 0), 0)}
              </div>
              <div className="stat-label">Total de Usuários</div>
            </div>
          </div>
        </div>

        <div className="companies-table-container">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuários</th>
                <th>Módulos</th>
                <th>Criada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCompanies.map(company => (
                <tr key={company.id}>
                  <td>
                    <div className="company-name">
                      <Building2 size={20} />
                      <span>{company.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="stat-badge">
                      <Users size={16} />
                      {company.userCount || 0}
                    </div>
                  </td>
                  <td>
                    <div className="stat-badge">
                      <span>{company.moduleCount || 0}</span>
                    </div>
                  </td>
                  <td>
                    <div className="date-info">
                      <Calendar size={16} />
                      {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEditModal(company)}
                        title="Editar empresa"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn btn-sm btn-primary"
                        title="Visualizar detalhes"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {companies.length === 0 && (
            <div className="empty-state">
              <Building2 size={48} />
              <h3>Nenhuma empresa encontrada</h3>
              <p>Crie sua primeira empresa para começar.</p>
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <span className="pagination-info">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Criar Nova Empresa</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleCreateCompany} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Nome da Empresa:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o nome da empresa"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Criando...' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingCompany && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Editar Empresa</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleEditCompany} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Nome da Empresa:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o nome da empresa"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCompanies;
