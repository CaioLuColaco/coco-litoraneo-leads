import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest, RegisterRequest, ApiResponse } from '../types/lead';

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
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Verificar se o usuário está autenticado
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const response: ApiResponse<{ userId: string; userEmail: string }> = {
      success: true,
      data: {
        userId: user.userId,
        userEmail: user.userEmail,
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

export { router as authRoutes };
