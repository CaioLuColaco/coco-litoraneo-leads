import { Router } from 'express';
import { ConfigurableScoringService } from '../services/configurableScoringService';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const scoringService = new ConfigurableScoringService();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

/**
 * GET /api/scoring/configs
 * Lista todas as configurações de pontuação
 */
router.get('/configs', async (_req, res) => {
  try {
    const configs = await scoringService.getAllConfigs();
    return res.json({
      success: true,
      data: configs,
      message: 'Configurações de pontuação listadas com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao listar configurações:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/scoring/configs/active
 * Busca a configuração ativa
 */
router.get('/configs/active', async (_req, res) => {
  try {
    const config = await scoringService.getActiveConfig();
    return res.json({
      success: true,
      data: config,
      message: 'Configuração ativa encontrada',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar configuração ativa:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/scoring/configs/:id
 * Busca uma configuração específica
 */
router.get('/configs/:id', async (req, res) => {
  try {
    const { id: _id } = req.params;
    const config = await scoringService.getActiveConfig(); // Por enquanto, sempre retorna a ativa
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: config,
      message: 'Configuração encontrada',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/scoring/configs
 * Cria uma nova configuração de pontuação
 */
router.post('/configs', async (req, res) => {
  try {
    const { name, description, categories } = req.body;
    const userId = (req as any).user?.id;

    if (!name || !categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        error: 'Nome e categorias são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }

    const config = await scoringService.createConfig({
      name,
      description,
      categories
    }, userId);

    return res.status(201).json({
      success: true,
      data: config,
      message: 'Configuração criada com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao criar configuração:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/scoring/configs/:id
 * Atualiza uma configuração de pontuação
 */
router.put('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, categories } = req.body;

    const config = await scoringService.updateConfig(id, {
      name,
      description,
      isActive,
      categories
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: config,
      message: 'Configuração atualizada com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/scoring/configs/:id
 * Remove uma configuração de pontuação
 */
router.delete('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await scoringService.deleteConfig(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'Configuração removida com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao remover configuração:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/scoring/configs/:id/activate
 * Ativa uma configuração específica
 */
router.post('/configs/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const config = await scoringService.activateConfig(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: config,
      message: 'Configuração ativada com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao ativar configuração:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/scoring/analyze
 * Analisa o potencial de um lead usando a configuração ativa
 */
router.post('/analyze', async (req, res) => {
  try {
    const companyData = req.body;

    if (!companyData) {
      return res.status(400).json({
        success: false,
        error: 'Dados da empresa são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }

    const analysis = await scoringService.analyzePotentialByCompanyData(companyData);

    return res.json({
      success: true,
      data: analysis,
      message: 'Análise de potencial realizada com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao analisar potencial:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/scoring/score-details
 * Retorna os detalhes da pontuação para exibição
 */
router.post('/score-details', async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Dados são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }

    const scoreDetails = await scoringService.getPotentialScoreDetails(data);

    return res.json({
      success: true,
      data: scoreDetails,
      message: 'Detalhes da pontuação calculados com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao calcular detalhes da pontuação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/scoring/recalculate-scores
 * Recalcula pontuações de todos os leads
 */
router.post('/recalculate-scores', async (_req, res) => {
  try {
    const result = await scoringService.recalculateAllLeadScores();
    
    return res.json({
      success: true,
      message: `Recálculo concluído: ${result.updated} leads atualizados, ${result.errors} erros`,
      data: result
    });
  } catch (error) {
    console.error('❌ Erro ao recalcular pontuações:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao recalcular pontuações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export { router as scoringRoutes };
