import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/lead';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly prisma: PrismaClient;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'coco-litoraneo-secret-key-2024';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.prisma = new PrismaClient();
  }

  /**
   * Registra um novo usuário
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // Verificar se o usuário já existe
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('Usuário com este email já existe');
      }

      // Hash da senha
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Criar usuário
      const newUser: User = {
        id: this.generateUserId(),
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Salvar usuário (por enquanto em memória, depois implementar repositório)
      await this.saveUser(newUser);

      // Gerar token JWT
      const token = this.generateToken(newUser);

      // Retornar resposta sem a senha
      const { password, ...userWithoutPassword } = newUser;

      return {
        token,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  }

  /**
   * Autentica um usuário existente
   */
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Buscar usuário por email
      const user = await this.findUserByEmail(loginData.email.toLowerCase());
      if (!user) {
        throw new Error('Email ou senha incorretos');
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Email ou senha incorretos');
      }

      // Gerar token JWT
      const token = this.generateToken(user);

      // Retornar resposta sem a senha
      const { password, ...userWithoutPassword } = user;

      return {
        token,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  /**
   * Verifica e decodifica um token JWT
   */
  verifyToken(token: string): { userId: string; userEmail: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        userId: decoded.userId,
        userEmail: decoded.userEmail,
      };
    } catch (error) {
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Gera um token JWT para um usuário
   */
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      userEmail: user.email,
      name: user.name,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as any,
    });
  }

  /**
   * Gera um ID único para usuário
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Busca usuário por email no banco de dados
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) return null;
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Salva usuário no banco de dados
   */
  private async saveUser(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
      },
    });
  }

}
