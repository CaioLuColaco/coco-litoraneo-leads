import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Eye, Mail, Calendar, Shield } from 'lucide-react';
import { companyMasterAPI } from '../../services/api';
import { User, Role } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import '../SuperAdmin.css';

interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  companyId?: string;
  isSuperAdmin: boolean;
  photoUrl?: string;
  company?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  roles?: Array<{
    id: string;
    roleId: string;
    role: Role;
  }>;
}

const CompanyMasterUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleIds: [] as string[]
  });

  const companyId = user?.companyId;

  useEffect(() => {
    if (companyId) {
      loadUsers();
      loadRoles();
    }
  }, [companyId]);

  const loadUsers = async () => {
    if (!companyId) return;
    
    try {
      setIsLoading(true);
      const usersData = await companyMasterAPI.getCompanyUsers(companyId);
      setUsers(usersData);
    } catch (error: any) {
      setError('Erro ao carregar usuários: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async () => {
    if (!companyId) return;
    
    try {
      const rolesData = await companyMasterAPI.getCompanyRoles(companyId);
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Erro ao carregar roles:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setIsLoading(true);
    setError('');

    try {
      const newUser = await companyMasterAPI.createUser(companyId, formData);
      setUsers(prev => [newUser, ...prev]);
      setSuccess('Usuário criado com sucesso!');
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', roleIds: [] });
    } catch (error: any) {
      setError('Erro ao criar usuário: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !editingUser) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedUser = await companyMasterAPI.updateUser(companyId, editingUser.id, formData);
      setUsers(prev => prev.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));
      setSuccess('Usuário atualizado com sucesso!');
      setShowEditModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', roleIds: [] });
    } catch (error: any) {
      setError('Erro ao atualizar usuário: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (user: UserWithRoles) => {
    setEditingUser(user as User);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      roleIds: user.roles?.map(role => role.roleId) || []
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', roleIds: [] });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roleIds: checked 
        ? [...prev.roleIds, roleId]
        : prev.roleIds.filter(id => id !== roleId)
    }));
  };

  // Paginação
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);

  if (!companyId) {
    return (
      <div className="superadmin-container">
        <div className="alert alert-error">
          Erro: Usuário não está associado a uma empresa.
        </div>
      </div>
    );
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="superadmin-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-container">
      <div className="superadmin-header">
        <div className="header-content">
          <div className="header-title">
            <Users size={32} />
            <h1>Gerenciamento de Usuários</h1>
            <span className="company-badge">{user?.company?.name}</span>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} />
            Novo Usuário
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
              <Users size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">{users.length}</div>
              <div className="stat-label">Total de Usuários</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Shield size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">{roles.length}</div>
              <div className="stat-label">Roles Disponíveis</div>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="companies-table-container">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Roles</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt={user.name} />
                        ) : (
                          <span>{user.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">
                          <Mail size={14} />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="roles-info">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((userRole, index) => (
                          <span key={index} className="role-badge">
                            {userRole.role.name}
                          </span>
                        ))
                      ) : (
                        <span className="no-roles">Sem roles</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="date-info">
                      <Calendar size={16} />
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEditModal(user)}
                        title="Editar usuário"
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

          {users.length === 0 && (
            <div className="empty-state">
              <Users size={48} />
              <h3>Nenhum usuário encontrado</h3>
              <p>Crie seu primeiro usuário para começar.</p>
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
              <h2>Criar Novo Usuário</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Nome:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o nome do usuário"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o email do usuário"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Senha:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  placeholder="Digite a senha (mín. 6 caracteres)"
                />
              </div>

              <div className="form-group">
                <label>Roles:</label>
                <div className="role-checkboxes">
                  {roles.map(role => (
                    <label key={role.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(role.id)}
                        onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Editar Usuário</h2>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            <form onSubmit={handleEditUser} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Nome:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o nome do usuário"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite o email do usuário"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Nova Senha (opcional):</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  minLength={6}
                  placeholder="Deixe em branco para manter a senha atual"
                />
              </div>

              <div className="form-group">
                <label>Roles:</label>
                <div className="role-checkboxes">
                  {roles.map(role => (
                    <label key={role.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(role.id)}
                        onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                      />
                      <span>{role.name}</span>
                    </label>
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

export default CompanyMasterUsers;
