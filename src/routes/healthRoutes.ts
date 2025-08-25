import { Router, Request, Response } from 'express';

const router = Router();

// Health check básico
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API Coco Litorâneo Leads está funcionando! 🥥',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Health check detalhado
router.get('/detailed', (_req: Request, res: Response) => {
  const healthCheck = {
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    pid: process.pid,
  };

  res.status(200).json(healthCheck);
});

export { router as healthRoutes };
