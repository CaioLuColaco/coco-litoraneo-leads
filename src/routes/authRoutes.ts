import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest, RegisterRequest, ApiResponse, RefreshRequest } from '../types/lead';
import { PrismaClient } from '@prisma/client';
import { tenantContext, authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const authService = new AuthService();

// POST /api/auth/register - Registro de novo usuário
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password }: RegisterRequest = req.body;

    // Validações básicas
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

    if (!email.includes('@')) {
      res.status(400).json({
        success: false,
        error: 'Email inválido',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Registrar usuário
    const result = await authService.register({ name, email, password });

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Usuário registrado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Erro no registro:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    const statusCode = errorMessage.includes('já existe') ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/login - Login de usuário
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validações básicas
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Fazer login
    const result = await authService.login({ email, password });

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Login realizado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro no login:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Email ou senha incorretos';
    
    res.status(401).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/auth/me - Obter informações do usuário atual (protegido)
router.get('/me', authenticateToken, tenantContext, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const companyId = (req as any).companyId || null;
    const isSuperAdmin = Boolean((req as any).isSuperAdmin);

    const prisma = new PrismaClient();
    const userDb = await prisma.user.findUnique({ where: { id: user.userId }, include: { company: true } });

    // Carregar roles e scopes da empresa atual
    let roles: Array<{ id: string; name: string }> = [];
    let scopes: string[] = [];
    if (companyId) {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.userId },
        include: { role: true },
      });
      const scopeSet = new Set<string>();
      for (const ur of userRoles) {
        if (ur.role.companyId !== companyId) continue;
        roles.push({ id: ur.role.id, name: ur.role.name });
        const roleScopes = Array.isArray(ur.role.scopes) ? (ur.role.scopes as any[]) : [];
        for (const s of roleScopes) scopeSet.add(String(s));
      }
      scopes = Array.from(scopeSet);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        userId: user.userId,
        userEmail: user.userEmail,
        name: userDb?.name,
        photoUrl: userDb?.photoUrl,
        companyId,
        company: userDb?.company ? { id: userDb.company.id, name: userDb.company.name } : null,
        isSuperAdmin,
        roles,
        scopes,
      },
      message: 'Informações do usuário obtidas com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao obter informações do usuário:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/auth/me - Atualizar perfil (nome, email, photoUrl)
router.put('/me', authenticateToken, tenantContext, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const prisma = new PrismaClient();
    const { name, email, photoUrl } = req.body as { name?: string; email?: string; photoUrl?: string };

    const updates: any = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof email === 'string' && email.trim()) {
      const emailLower = email.toLowerCase().trim();
      // Verificar conflito de email
      const existing = await prisma.user.findUnique({ where: { email: emailLower } });
      if (existing && existing.id !== user.userId) {
        res.status(409).json({ success: false, error: 'Email já em uso', timestamp: new Date().toISOString() });
        return;
      }
      updates.email = emailLower;
    }
    if (typeof photoUrl === 'string') updates.photoUrl = photoUrl.trim();

    const updated = await prisma.user.update({ where: { id: user.userId }, data: updates });
    const { password, ...withoutPassword } = updated as any;

    const response: ApiResponse<typeof withoutPassword> = {
      success: true,
      data: withoutPassword,
      message: 'Perfil atualizado com sucesso',
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', timestamp: new Date().toISOString() });
  }
});

// PUT /api/auth/me/password - Alterar senha (senhaAtual, novaSenha)
router.put('/me/password', authenticateToken, tenantContext, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const prisma = new PrismaClient();
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Senha inválida', timestamp: new Date().toISOString() });
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    if (!dbUser) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado', timestamp: new Date().toISOString() });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const ok = await bcrypt.compare(currentPassword, dbUser.password);
    if (!ok) {
      res.status(401).json({ success: false, error: 'Senha atual incorreta', timestamp: new Date().toISOString() });
      return;
    }

    const saltRounds = 12;
    const hashed = await bcrypt.hash(newPassword, saltRounds);
    await prisma.user.update({ where: { id: user.userId }, data: { password: hashed } });

    res.status(200).json({ success: true, message: 'Senha alterada com sucesso', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor', timestamp: new Date().toISOString() });
  }
});

export { router as authRoutes };

// POST /api/auth/refresh - Troca refresh por novos tokens
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken }: RefreshRequest = req.body;
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token é obrigatório',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await authService.refreshToken({ refreshToken });
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Tokens renovados com sucesso',
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Refresh token inválido';
    res.status(401).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/logout - Revoga o refresh token atual
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken }: RefreshRequest = req.body;
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token é obrigatório',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await authService.logout({ refreshToken });
    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});
