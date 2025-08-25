import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('🔗 Conectado ao Redis');
});

redis.on('error', (error) => {
  console.error('❌ Erro na conexão com Redis:', error);
});

redis.on('close', () => {
  console.log('🔌 Conexão com Redis fechada');
});

export default redis;
