import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthMiddleware } from '../types/lead';

const authService = new AuthService();

/**
 * Middleware para verificar autenticação JWT
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token de acesso não fornecido',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      // Verificar e decodificar token
      const decoded = authService.verifyToken(token);
      
      // Adicionar informações do usuário à requisição
      (req as any).user = decoded as AuthMiddleware;
      
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Middleware opcional para autenticação (não bloqueia se não autenticado)
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        (req as any).user = decoded as AuthMiddleware;
      } catch (error) {
        // Token inválido, mas não bloqueia a requisição
        console.log('Token inválido no middleware opcional:', error);
      }
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação opcional:', error);
    next();
  }
};
