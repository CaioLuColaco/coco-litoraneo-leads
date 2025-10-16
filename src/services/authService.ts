import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { User, LoginRequest, RegisterRequest, AuthResponse, RefreshRequest, RefreshResponse } from '../types/lead';
import { prisma } from '../config/database';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresInDays: number;
  private readonly prisma: PrismaClient;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'coco-litoraneo-secret-key-2024';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshExpiresInDays = Number(process.env.REFRESH_EXPIRES_IN_DAYS || 30);
    this.prisma = prisma;
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

      // Revogar refresh tokens antigos (por política de única sessão)
      await this.revokeAllRefreshTokensForUser(newUser.id);

      // Gerar tokens
      const accessToken = this.generateAccessToken(newUser);
      const refreshToken = await this.generateAndStoreRefreshToken(newUser.id);

      // Retornar resposta sem a senha
      const { password, ...userWithoutPassword } = newUser;

      return {
        accessToken,
        refreshToken,
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

      // Política: uma sessão por usuário → revoga anteriores
      await this.revokeAllRefreshTokensForUser(user.id);

      // Gerar tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateAndStoreRefreshToken(user.id);

      // Retornar resposta sem a senha
      const { password, ...userWithoutPassword } = user;

      return {
        accessToken,
        refreshToken,
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
  private generateAccessToken(user: User): string {
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
   * Gera um refresh token aleatório, persiste seu hash e retorna o token em texto puro.
   */
  private async generateAndStoreRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.sha256(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresInDays);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  private sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /** Revoga todos os refresh tokens ativos de um usuário */
  private async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /** Efetua refresh rotacionando o token */
  async refreshToken(payload: RefreshRequest): Promise<RefreshResponse> {
    const { refreshToken } = payload;
    if (!refreshToken) {
      throw new Error('Refresh token não fornecido');
    }

    const tokenHash = this.sha256(refreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, isRevoked: false },
    });

    if (!existing) {
      throw new Error('Refresh token inválido');
    }

    if (existing.expiresAt < new Date()) {
      // expiado → revoga
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { isRevoked: true },
      });
      throw new Error('Refresh token expirado');
    }

    const userDb = await this.prisma.user.findUnique({ where: { id: existing.userId } });
    if (!userDb) {
      throw new Error('Usuário não encontrado');
    }

    // Rotação: revoga o atual e cria um novo apontando para ele
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { isRevoked: true },
    });

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newHash = this.sha256(newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresInDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: newHash,
        expiresAt,
        rotatedFromId: existing.id,
      },
    });

    const user: User = {
      id: userDb.id,
      name: userDb.name,
      email: userDb.email,
      password: userDb.password,
      createdAt: userDb.createdAt.toISOString(),
      updatedAt: userDb.updatedAt.toISOString(),
    };

    const accessToken = this.generateAccessToken(user);
    return { accessToken, refreshToken: newRefreshToken };
  }

  /** Revoga um refresh token específico */
  async logout(payload: RefreshRequest): Promise<void> {
    const { refreshToken } = payload;
    if (!refreshToken) return;
    const tokenHash = this.sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
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
