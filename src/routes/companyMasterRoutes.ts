import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, tenantContext } from '../middleware/authMiddleware';
import { ApiResponse } from '../types/lead';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// Middleware para verificar se é Master da empresa
const requireMaster = (req: Request, res: Response, next: any): void => {
  const companyId = (req as any).companyId as string | null;
  const userId = (req as any).user?.userId;
  
  if (!companyId || !userId) {
    res.status(403).json({
      success: false,
      error: 'Contexto de empresa inválido',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Verificar se usuário tem role MASTER na empresa
  prisma.userRole.findFirst({
    where: {
      userId,
      role: { companyId, name: 'MASTER' }
    }
  }).then(hasMasterRole => {
    if (!hasMasterRole) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas Master da empresa.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    return next();
  }).catch(error => {
    console.error('Erro ao verificar role Master:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  });
};

// GET /api/companies/:id/users - Listar usuários da empresa
router.get('/:id/users', authenticateToken, tenantContext, requireMaster, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: companyId } = req.params;
    const ctxCompanyId = (req as any).companyId as string | null;
    if (!ctxCompanyId || ctxCompanyId !== companyId) {
      res.status(403).json({
        success: false,
        error: 'Empresa do contexto não corresponde ao parâmetro',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const users = await prisma.user.findMany({
      where: { companyId },
      include: {
        UserRole: {
          include: { role: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response: ApiResponse<typeof users> = {
      success: true,
      data: users,
      message: 'Usuários da empresa listados com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao listar usuários da empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// POST /api/companies/:id/users - Criar usuário na empresa
router.post('/:id/users', authenticateToken, tenantContext, requireMaster, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: companyId } = req.params;
    const ctxCompanyId = (req as any).companyId as string | null;
    if (!ctxCompanyId || ctxCompanyId !== companyId) {
      res.status(403).json({
        success: false,
        error: 'Empresa do contexto não corresponde ao parâmetro',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const { name, email, password, roleIds = [] } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Nome, email e senha são obrigatórios',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'A senha deve ter pelo menos 6 caracteres',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Usuário com este email já existe',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        companyId
      },
      include: {
        UserRole: {
          include: { role: { select: { id: true, name: true } } }
        }
      }
    });

    // Atribuir roles se especificadas
    if (Array.isArray(roleIds) && roleIds.length > 0) {
      for (const roleId of roleIds) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId }
        });
      }
    }

    // Recarregar usuário com roles após atribuição
    const reloaded = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        UserRole: {
          include: { role: { select: { id: true, name: true } } }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = (reloaded as any);

    const response: ApiResponse<typeof userWithoutPassword> = {
      success: true,
      data: userWithoutPassword,
      message: 'Usuário criado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// PUT /api/companies/:id/users/:userId - Atualizar usuário
router.put('/:id/users/:userId', authenticateToken, tenantContext, requireMaster, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: companyId, userId } = req.params;
    const ctxCompanyId = (req as any).companyId as string | null;
    if (!ctxCompanyId || ctxCompanyId !== companyId) {
      res.status(403).json({
        success: false,
        error: 'Empresa do contexto não corresponde ao parâmetro',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const { name, email, password, roleIds } = req.body;

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuário não encontrado nesta empresa',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) {
      const emailLower = email.toLowerCase().trim();
      if (emailLower !== user.email) {
        const existingUser = await prisma.user.findUnique({ where: { email: emailLower } });
        if (existingUser) {
          res.status(409).json({
            success: false,
            error: 'Email já está em uso',
            timestamp: new Date().toISOString(),
          });
          return;
        }
        updateData.email = emailLower;
      }
    }
    if (password) {
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'A senha deve ter pelo menos 6 caracteres',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        UserRole: {
          include: { role: { select: { id: true, name: true } } }
        }
      }
    });

    // Atualizar roles se especificadas
    if (Array.isArray(roleIds)) {
      // Remover roles existentes
      await prisma.userRole.deleteMany({ where: { userId } });
      
      // Adicionar novas roles
      for (const roleId of roleIds) {
        await prisma.userRole.create({
          data: { userId, roleId }
        });
      }
    }

    // Recarregar com roles atualizadas
    const reloaded = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserRole: {
          include: { role: { select: { id: true, name: true } } }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = (reloaded as any);

    const response: ApiResponse<typeof userWithoutPassword> = {
      success: true,
      data: userWithoutPassword,
      message: 'Usuário atualizado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// GET /api/companies/:id/roles - Listar roles da empresa
router.get('/:id/roles', authenticateToken, tenantContext, requireMaster, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: companyId } = req.params;
    const ctxCompanyId = (req as any).companyId as string | null;
    if (!ctxCompanyId || ctxCompanyId !== companyId) {
      res.status(403).json({
        success: false,
        error: 'Empresa do contexto não corresponde ao parâmetro',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const roles = await prisma.role.findMany({
      where: { companyId },
      include: {
        users: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const response: ApiResponse<typeof roles> = {
      success: true,
      data: roles,
      message: 'Roles da empresa listadas com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao listar roles:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// POST /api/companies/:id/roles - Criar role na empresa
router.post('/:id/roles', authenticateToken, tenantContext, requireMaster, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: companyId } = req.params;
    const ctxCompanyId = (req as any).companyId as string | null;
    if (!ctxCompanyId || ctxCompanyId !== companyId) {
      res.status(403).json({
        success: false,
        error: 'Empresa do contexto não corresponde ao parâmetro',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const { name, scopes } = req.body;

    if (!name || !scopes || !Array.isArray(scopes)) {
      res.status(400).json({
        success: false,
        error: 'Nome e escopos são obrigatórios',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const existingRole = await prisma.role.findFirst({
      where: { companyId, name: name.trim() }
    });
    if (existingRole) {
      res.status(409).json({
        success: false,
        error: 'Role com este nome já existe nesta empresa',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const role = await prisma.role.create({
      data: {
        companyId,
        name: name.trim(),
        scopes
      },
      include: {
        users: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    const response: ApiResponse<typeof role> = {
      success: true,
      data: role,
      message: 'Role criada com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Erro ao criar role:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

export { router as companyMasterRoutes };
