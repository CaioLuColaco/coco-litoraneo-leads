import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

export class CnpjApiRateLimiter {
  private rateLimiter: RateLimiterRedis;
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Limite: 5 consultas por minuto
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'cnpj_api_rate_limit',
      points: 5, // 5 consultas
      duration: 60, // por minuto
      blockDuration: 60, // bloquear por 1 minuto se exceder
    });
  }

  /**
   * Verifica se pode fazer consulta à API
   */
  async canMakeRequest(): Promise<boolean> {
    try {
      await this.rateLimiter.consume('global');
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Too Many Requests')) {
        return false;
      }
      // Se for outro erro, permite a consulta
      return true;
    }
  }

  /**
   * Aguarda até poder fazer uma consulta
   */
  async waitForAvailability(): Promise<void> {
    while (!(await this.canMakeRequest())) {
      console.log('⏳ Rate limit atingido, aguardando 60 segundos...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // 60 segundos
    }
  }

  /**
   * Obtém informações sobre o rate limit atual
   */
  async getRateLimitInfo(): Promise<{
    remaining: number;
    resetTime: number;
    isBlocked: boolean;
  }> {
    try {
      const res = await this.rateLimiter.get('global');
      if (res) {
        return {
          remaining: res.remainingPoints,
          resetTime: res.msBeforeNext,
          isBlocked: res.msBeforeNext > 0 && res.remainingPoints === 0,
        };
      }
      return {
        remaining: 0,
        resetTime: 0,
        isBlocked: true,
      };
    } catch (error) {
      return {
        remaining: 0,
        resetTime: 0,
        isBlocked: true,
      };
    }
  }

  /**
   * Fecha conexões
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
