import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Eye, CheckSquare, Square } from 'lucide-react';
import { companyMasterAPI } from '../../services/api';
import { Role } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import '../SuperAdmin.css';

interface RoleWithScopes extends Role {
  scopes: string[];
}

const CompanyMasterRoles: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleWithScopes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: '',
    scopes: [] as string[]
  });

  const companyId = user?.companyId;

  // Scopes disponíveis organizados por módulo
  const availableScopes = {
    'COMMERCIAL': [
      'commercial.read',
      'commercial.write',
      'commercial.delete',
      'commercial.export',
      'commercial.assign'
    ],
    'FINANCE': [
      'finance.read',
      'finance.write',
      'finance.delete',
      'finance.export',
      'finance.config'
    ],
    'USERS': [
      'users.read',
      'users.create',
      'users.update',
      'users.delete'
    ],
    'ROLES': [
      'roles.read',
      'roles.create',
      'roles.update',
      'roles.delete'
    ]
  };

  useEffect(() => {
    if (companyId) {
      loadRoles();
    }
  }, [companyId]);

  const loadRoles = async () => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      const rolesData = await companyMasterAPI.getCompanyRoles(companyId);
      setRoles(rolesData);
    } catch (error: any) {
      setError('Erro ao carregar roles: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setIsLoading(true);
    setError('');

    try {
      const newRole = await companyMasterAPI.createRole(companyId, formData);
      setRoles(prev => [newRole, ...prev]);
      setSuccess('Role criada com sucesso!');
      setShowCreateModal(false);
      setFormData({ name: '', scopes: [] });
    } catch (error: any) {
      setError('Erro ao criar role: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !editingRole) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedRole = await companyMasterAPI.updateRole(companyId, editingRole.id, formData);
      setRoles(prev => prev.map(role => 
        role.id === updatedRole.id ? updatedRole : role
      ));
      setSuccess('Role atualizada com sucesso!');
      setShowEditModal(false);
      setEditingRole(null);
      setFormData({ name: '', scopes: [] });
    } catch (error: any) {
      setError('Erro ao atualizar role: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      scopes: role.scopes || []
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingRole(null);
    setFormData({ name: '', scopes: [] });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleScopeChange = (scope: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      scopes: checked 
        ? [...prev.scopes, scope]
        : prev.scopes.filter(s => s !== scope)
    }));
  };

  const handleModuleToggle = (module: string, checked: boolean) => {
    const moduleScopes = availableScopes[module as keyof typeof availableScopes] || [];
    setFormData(prev => ({
      ...prev,
      scopes: checked 
        ? [...prev.scopes, ...moduleScopes.filter(scope => !prev.scopes.includes(scope))]
        : prev.scopes.filter(scope => !moduleScopes.includes(scope))
    }));
  };

  // Paginação
  const totalPages = Math.ceil(roles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRoles = roles.slice(startIndex, startIndex + itemsPerPage);

  if (!companyId) {
    return (
      <div className="superadmin-container">
        <div className="alert alert-error">
          Erro: Usuário não está associado a uma empresa.
        </div>
      </div>
    );
  }

  if (isLoading && roles.length === 0) {
    return (
      <div className="superadmin-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-container">
      <div className="superadmin-header">
        <div className="header-content">
          <div className="header-title">
            <Shield size={32} />
            <h1>Gerenciamento de Roles</h1>
            <span className="company-badge">{user?.company?.name}</span>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            Nova Role
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
        {/* Estatísticas */}
        <div className="companies-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Shield size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">{roles.length}</div>
              <div className="stat-label">Total de Roles</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CheckSquare size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">
                {roles.reduce((sum, role) => sum + (role.scopes?.length || 0), 0)}
              </div>
              <div className="stat-label">Total de Permissões</div>
            </div>
          </div>
        </div>

        {/* Tabela de Roles */}
        <div className="companies-table-container">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Nome da Role</th>
                <th>Permissões</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoles.map(role => (
                <tr key={role.id}>
                  <td>
                    <div className="role-name">
                      <Shield size={20} />
                      <span>{role.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="scopes-info">
                      {role.scopes && role.scopes.length > 0 ? (
                        <div className="scopes-list">
                          {role.scopes.map((scope, index) => (
                            <span key={index} className="scope-badge">
                              {scope}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-scopes">Sem permissões</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEditModal(role)}
                        title="Editar role"
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

          {roles.length === 0 && (
            <div className="empty-state">
              <Shield size={48} />
              <h3>Nenhuma role encontrada</h3>
              <p>Crie sua primeira role para começar.</p>
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
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Criar Nova Role</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleCreateRole} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Nome da Role:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o nome da role"
                />
              </div>

              <div className="form-group">
                <label>Permissões:</label>
                <div className="scopes-editor">
                  {Object.entries(availableScopes).map(([module, scopes]) => (
                    <div key={module} className="scope-module">
                      <label className="module-header">
                        <input
                          type="checkbox"
                          checked={scopes.every(scope => formData.scopes.includes(scope))}
                          onChange={(e) => handleModuleToggle(module, e.target.checked)}
                        />
                        <span className="module-name">{module}</span>
                      </label>
                      <div className="scope-items">
                        {scopes.map(scope => (
                          <label key={scope} className="scope-item">
                            <input
                              type="checkbox"
                              checked={formData.scopes.includes(scope)}
                              onChange={(e) => handleScopeChange(scope, e.target.checked)}
                            />
                            <span>{scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Criando...' : 'Criar Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingRole && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Editar Role</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleEditRole} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Nome da Role:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o nome da role"
                />
              </div>

              <div className="form-group">
                <label>Permissões:</label>
                <div className="scopes-editor">
                  {Object.entries(availableScopes).map(([module, scopes]) => (
                    <div key={module} className="scope-module">
                      <label className="module-header">
                        <input
                          type="checkbox"
                          checked={scopes.every(scope => formData.scopes.includes(scope))}
                          onChange={(e) => handleModuleToggle(module, e.target.checked)}
                        />
                        <span className="module-name">{module}</span>
                      </label>
                      <div className="scope-items">
                        {scopes.map(scope => (
                          <label key={scope} className="scope-item">
                            <input
                              type="checkbox"
                              checked={formData.scopes.includes(scope)}
                              onChange={(e) => handleScopeChange(scope, e.target.checked)}
                            />
                            <span>{scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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

export default CompanyMasterRoles;
