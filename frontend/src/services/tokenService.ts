import { authAPI } from './api';

export class TokenService {
  /**
   * Verifica se um token JWT está expirado
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Erro ao verificar expiração do token:', error);
      return true; // Considera expirado se houver erro
    }
  }

  /**
   * Recupera os tokens armazenados no localStorage
   */
  static getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken')
    };
  }

  /**
   * Renova o access token usando o refresh token
   */
  static async refreshAccessToken(): Promise<string> {
    const { refreshToken } = this.getStoredTokens();
    
    if (!refreshToken) {
      throw new Error('Refresh token não encontrado');
    }

    try {
      const response = await authAPI.refreshToken(refreshToken);
      
      // Armazenar novos tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      return response.accessToken;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      
      // Limpar tokens em caso de erro
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('activeCompanyId');
      
      throw error;
    }
  }

  /**
   * Verifica se o access token está válido e o renova se necessário
   */
  static async ensureValidToken(): Promise<string> {
    const { accessToken, refreshToken } = this.getStoredTokens();
    
    if (!accessToken || !refreshToken) {
      throw new Error('Tokens não encontrados');
    }

    // Se o token não está expirado, retorna ele
    if (!this.isTokenExpired(accessToken)) {
      return accessToken;
    }

    // Se está expirado, tenta renovar
    console.log('🔄 Token expirado, renovando...');
    return await this.refreshAccessToken();
  }

  /**
   * Limpa todos os tokens do localStorage
   */
  static clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('activeCompanyId');
  }
}
