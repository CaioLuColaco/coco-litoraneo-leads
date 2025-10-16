import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthMiddleware } from '../types/lead';
import { PrismaClient } from '@prisma/client';

const authService = new AuthService();
const prisma = new PrismaClient();

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

/**
 * Middleware de contexto de empresa (tenant)
 * - Usuário comum: companyId vem do próprio usuário (lookup no banco)
 * - Super Admin: aceita header X-Company-Id opcional para atuar em nome de uma empresa
 */
export const tenantContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auth = (req as any).user as AuthMiddleware | undefined;
    if (!auth) {
      res.status(401).json({
        success: false,
        error: 'Não autenticado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userDb = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!userDb) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let companyId = userDb.companyId || undefined;
    const isSuperAdmin = Boolean((userDb as any).isSuperAdmin);

    // Super Admin pode sobrepor via header
    const headerCompany = req.header('X-Company-Id') || req.header('x-company-id');
    if (isSuperAdmin && headerCompany) {
      const company = await prisma.company.findUnique({ where: { id: headerCompany } });
      if (!company) {
        res.status(400).json({
          success: false,
          error: 'X-Company-Id inválido',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      companyId = company.id;
    }

    (req as any).companyId = companyId || null;
    (req as any).isSuperAdmin = isSuperAdmin;
    next();
  } catch (error) {
    console.error('Erro no middleware de tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Middleware para checar se a empresa atual possui um módulo ativo
 */
export const requireModule = (moduleKey: 'COMMERCIAL' | 'FINANCE') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isSuperAdmin = Boolean((req as any).isSuperAdmin);
      if (isSuperAdmin) return next();

      const companyId = (req as any).companyId as string | null;
      if (!companyId) {
        return res.status(403).json({
          success: false,
          error: 'Empresa não definida no contexto',
          timestamp: new Date().toISOString(),
        });
      }

      const mod = await prisma.module.findUnique({ where: { key: moduleKey } });
      if (!mod) {
        return res.status(403).json({
          success: false,
          error: 'Módulo não encontrado',
          timestamp: new Date().toISOString(),
        });
      }

      const companyModule = await prisma.companyModule.findUnique({
        where: { companyId_moduleId: { companyId, moduleId: mod.id } },
      });

      if (!companyModule || !companyModule.active) {
        return res.status(403).json({
          success: false,
          error: 'Módulo não contratado/ativo para esta empresa',
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware requireModule:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString(),
      });
    }
  };
};

/**
 * Middleware de autorização por escopos (RBAC)
 */
export const authorize = (requiredScopes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isSuperAdmin = Boolean((req as any).isSuperAdmin);
      if (isSuperAdmin) return next();

      const auth = (req as any).user as AuthMiddleware | undefined;
      const companyId = (req as any).companyId as string | null;
      if (!auth || !companyId) {
        return res.status(403).json({
          success: false,
          error: 'Contexto de usuário/empresa inválido',
          timestamp: new Date().toISOString(),
        });
      }

      // Coleta escopos agregados das roles do usuário na empresa
      const userRoles = await prisma.userRole.findMany({
        where: { userId: auth.userId },
        include: { role: true },
      });

      const scopes = new Set<string>();
      for (const ur of userRoles) {
        if (ur.role.companyId !== companyId) continue;
        const roleScopes = Array.isArray(ur.role.scopes) ? (ur.role.scopes as any[]) : [];
        for (const s of roleScopes) scopes.add(String(s));
      }

      const hasScope = (scope: string) => scopes.has(scope) || scopes.has(scope.split('.')[0] + '.*');
      const ok = requiredScopes.every(hasScope);
      if (!ok) {
        return res.status(403).json({
          success: false,
          error: 'Permissão negada',
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware authorize:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString(),
      });
    }
  };
};
