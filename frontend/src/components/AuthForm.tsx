import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginData, RegisterData } from '../types';

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<LoginData | RegisterData>({
    email: '',
    password: '',
    ...(isLogin ? {} : { name: '' }),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formData as LoginData);
      } else {
        await register(formData as RegisterData);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      ...(!isLogin ? {} : { name: '' }),
    });
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '28rem', width: '100%' }}>
        <div>
          <h2 style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '1.875rem', fontWeight: '800', color: '#111827' }}>
            {isLogin ? 'Entrar na sua conta' : 'Criar nova conta'}
          </h2>
          <p style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
            {isLogin ? 'Ou ' : 'Já tem uma conta? '}
            <button
              type="button"
              onClick={toggleMode}
              style={{ fontWeight: '500', color: '#4f46e5' }}
            >
              {isLogin ? 'criar uma conta' : 'faça login'}
            </button>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '1.5rem' }}>
            {!isLogin && (
              <div style={{ marginBottom: '0.5rem' }}>
                <label htmlFor="name" style={{ display: 'none' }}>
                  Nome completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={!isLogin}
                  className="form-input"
                  placeholder="Nome completo"
                  value={(formData as RegisterData).name || ''}
                  onChange={handleInputChange}
                />
              </div>
            )}
            
            <div style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="email" style={{ display: 'none' }}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label htmlFor="password" style={{ display: 'none' }}>
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="form-input"
                placeholder="Senha"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="spinner"></div>
                  {isLogin ? 'Entrando...' : 'Criando conta...'}
                </span>
              ) : (
                isLogin ? 'Entrar' : 'Criar conta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForm;
