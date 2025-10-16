import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { ProfileUpdateData, PasswordChangeData } from '../types';
import './Profile.css';

interface PasswordFormData extends PasswordChangeData {
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para edição de perfil
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    name: '',
    email: '',
    photoUrl: ''
  });

  // Estados para troca de senha
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl || ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await authAPI.updateProfile(profileData);
      
      // Atualizar dados do usuário no contexto
      const updatedUserData = { ...user, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      
      setSuccess('Perfil atualizado com sucesso!');
      setIsEditingProfile(false);
      
      // Recarregar página para atualizar contexto
      window.location.reload();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validações
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('Senha alterada com sucesso!');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('password')) {
      setPasswordData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (!user) {
    return <div className="profile-container">Carregando...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Meu Perfil</h1>
        <div className="profile-badges">
          {user.isSuperAdmin && (
            <span className="badge badge-super-admin">Super Admin</span>
          )}
          {user.company && (
            <span className="badge badge-company">{user.company.name}</span>
          )}
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

      <div className="profile-content">
        {/* Informações do Perfil */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Informações Pessoais</h2>
            {!isEditingProfile && (
              <button 
                className="btn btn-primary"
                onClick={() => setIsEditingProfile(true)}
              >
                Editar
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="profile-info">
              <div className="profile-photo">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="Foto do usuário" />
                ) : (
                  <div className="photo-placeholder">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-details">
                <div className="detail-item">
                  <label>Nome:</label>
                  <span>{user.name}</span>
                </div>
                <div className="detail-item">
                  <label>Email:</label>
                  <span>{user.email}</span>
                </div>
                <div className="detail-item">
                  <label>Empresa:</label>
                  <span>{user.company?.name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Roles:</label>
                  <span>
                    {user.roles?.map((role: any) => role.role.name).join(', ') || 'Nenhuma'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="name">Nome:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="photoUrl">URL da Foto:</label>
                <input
                  type="url"
                  id="photoUrl"
                  name="photoUrl"
                  value={profileData.photoUrl}
                  onChange={handleInputChange}
                  placeholder="https://exemplo.com/foto.jpg"
                />
                {profileData.photoUrl && (
                  <div className="photo-preview">
                    <img src={profileData.photoUrl} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Troca de Senha */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Segurança</h2>
            {!isChangingPassword && (
              <button 
                className="btn btn-primary"
                onClick={() => setIsChangingPassword(true)}
              >
                Alterar Senha
              </button>
            )}
          </div>

          {isChangingPassword && (
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Senha Atual:</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Nova Senha:</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Nova Senha:</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
