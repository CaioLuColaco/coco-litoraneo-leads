import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, tenantContext } from '../middleware/authMiddleware';
import { ApiResponse } from '../types/lead';

const router = Router();
const prisma = new PrismaClient();

// Middleware para verificar se é Super Admin
const requireSuperAdmin = (req: Request, res: Response, next: any): void => {
  const isSuperAdmin = Boolean((req as any).isSuperAdmin);
  if (!isSuperAdmin) {
    res.status(403).json({
      success: false,
      error: 'Acesso negado. Apenas Super Admin.',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
};

// GET /api/superadmin/companies - Listar todas as empresas
router.get('/companies', authenticateToken, tenantContext, requireSuperAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        users: { select: { id: true, name: true, email: true, isSuperAdmin: true } },
        _count: { select: { users: true, leads: true, sellers: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response: ApiResponse<typeof companies> = {
      success: true,
      data: companies,
      message: 'Empresas listadas com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
    return;
  } catch (error) {
    console.error('❌ Erro ao listar empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// POST /api/superadmin/companies - Criar nova empresa
router.post('/companies', authenticateToken, tenantContext, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Nome da empresa é obrigatório',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const existingCompany = await prisma.company.findUnique({ where: { name: name.trim() } });
    if (existingCompany) {
      res.status(409).json({
        success: false,
        error: 'Empresa com este nome já existe',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const company = await prisma.company.create({
      data: { name: name.trim() },
      include: { users: { select: { id: true, name: true, email: true, isSuperAdmin: true } } }
    });

    const response: ApiResponse<typeof company> = {
      success: true,
      data: company,
      message: 'Empresa criada com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
    return;
  } catch (error) {
    console.error('❌ Erro ao criar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// PUT /api/superadmin/companies/:id - Atualizar empresa
router.put('/companies/:id', authenticateToken, tenantContext, requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Nome da empresa é obrigatório',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const existingCompany = await prisma.company.findUnique({ where: { id } });
    if (!existingCompany) {
      res.status(404).json({
        success: false,
        error: 'Empresa não encontrada',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const nameConflict = await prisma.company.findFirst({
      where: { name: name.trim(), id: { not: id } }
    });
    if (nameConflict) {
      res.status(409).json({
        success: false,
        error: 'Empresa com este nome já existe',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const company = await prisma.company.update({
      where: { id },
      data: { name: name.trim() },
      include: { users: { select: { id: true, name: true, email: true, isSuperAdmin: true } } }
    });

    const response: ApiResponse<typeof company> = {
      success: true,
      data: company,
      message: 'Empresa atualizada com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
    return;
  } catch (error) {
    console.error('❌ Erro ao atualizar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// GET /api/superadmin/users - Listar todos os usuários
router.get('/users', authenticateToken, tenantContext, requireSuperAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        company: { select: { id: true, name: true } },
        UserRole: {
          include: { role: { select: { id: true, name: true, companyId: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response: ApiResponse<typeof users> = {
      success: true,
      data: users,
      message: 'Usuários listados com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
    return;
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

export { router as superAdminRoutes };
