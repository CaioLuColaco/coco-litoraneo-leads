import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Crown, Building2, Mail, Calendar } from 'lucide-react';
import { superAdminAPI } from '../../services/api';
import { User } from '../../types';
import '../SuperAdmin.css';

interface UserWithCompany extends User {
  companyName?: string;
  createdAt?: string;
}

const SuperAdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await superAdminAPI.getAllUsers();
      
      // Adicionar nome da empresa para cada usuário
      const usersWithCompany = usersData.map(user => ({
        ...user,
        companyName: user.company?.name || 'Sem empresa'
      }));
      
      setUsers(usersWithCompany);
    } catch (error: any) {
      setError('Erro ao carregar usuários: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'search') {
      setSearchTerm(value);
      setCurrentPage(1); // Reset para primeira página ao pesquisar
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCompany(e.target.value);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = !filterCompany || user.companyName === filterCompany;
    return matchesSearch && matchesCompany;
  });

  // Obter lista única de empresas para o filtro
  const companies = Array.from(new Set(users.map(user => user.companyName).filter(Boolean)));

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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
            <h1>Gerenciamento Global de Usuários</h1>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="users-content">
        {/* Filtros e Pesquisa */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              name="search"
              placeholder="Pesquisar por nome ou email..."
              value={searchTerm}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="filter-box">
            <Filter size={20} />
            <select value={filterCompany} onChange={handleSelectChange}>
              <option value="">Todas as empresas</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="users-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">{filteredUsers.length}</div>
              <div className="stat-label">Usuários Encontrados</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Crown size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">
                {filteredUsers.filter(user => user.isSuperAdmin).length}
              </div>
              <div className="stat-label">Super Admins</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Building2 size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-number">{companies.length}</div>
              <div className="stat-label">Empresas</div>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Empresa</th>
                <th>Roles</th>
                <th>Tipo</th>
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
                    <div className="company-info">
                      <Building2 size={16} />
                      <span>{user.companyName}</span>
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
                    {user.isSuperAdmin ? (
                      <span className="badge badge-super-admin">
                        <Crown size={14} />
                        Super Admin
                      </span>
                    ) : (
                      <span className="badge badge-user">Usuário</span>
                    )}
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
                        className="btn btn-sm btn-primary"
                        title="Visualizar detalhes"
                      >
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <Users size={48} />
              <h3>Nenhum usuário encontrado</h3>
              <p>Tente ajustar os filtros de pesquisa.</p>
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
    </div>
  );
};

export default SuperAdminUsers;
