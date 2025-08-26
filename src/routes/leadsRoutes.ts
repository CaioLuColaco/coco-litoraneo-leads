import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { QueueService } from '../services/queueService';
import { ExcelProcessingService } from '../services/excelProcessingService';
import { AddressValidationService } from '../services/addressValidationService';
import { PotentialAnalysisService } from '../services/potentialAnalysisService';
import { PrismaLead, LeadFilters, ApiResponse } from '../types/lead';

const router = Router();
const prisma = new PrismaClient();
let queueService: QueueService;
let excelProcessingService: ExcelProcessingService;
let addressValidationService: AddressValidationService;
let potentialAnalysisService: PotentialAnalysisService;

// Função para inicializar os serviços
export const initializeServices = (
  _queueService: QueueService,
  _excelProcessingService: ExcelProcessingService,
  _addressValidationService: AddressValidationService,
  _potentialAnalysisService: PotentialAnalysisService
) => {
  queueService = _queueService;
  excelProcessingService = _excelProcessingService;
  addressValidationService = _addressValidationService;
  potentialAnalysisService = _potentialAnalysisService;
};

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel são permitidos'));
    }
  },
});

// GET /api/leads - Lista todos os leads com filtros opcionais
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: LeadFilters = {
      status: req.query.status as string,
      potentialLevel: req.query.potentialLevel as string,
      city: req.query.city as string,
      state: req.query.state as string,
      industry: req.query.industry as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset
        ? parseInt(req.query.offset as string) : undefined,
    };

    // Construir query do Prisma
    const where: any = {};
    
    if (filters.status) where.status = filters.status;
    if (filters.potentialLevel) where.potentialLevel = filters.potentialLevel;
    if (filters.city) where.validatedCity = { contains: filters.city, mode: 'insensitive' };
    if (filters.state) where.validatedState = { contains: filters.state, mode: 'insensitive' };
    if (filters.industry) where.industry = { contains: filters.industry, mode: 'insensitive' };
    
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const leads = await prisma.lead.findMany({
      where,
      take: filters.limit || 100,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.lead.count({ where });

    const response: ApiResponse<PrismaLead[]> = {
      success: true,
      data: leads,
      message: `${leads.length} leads encontrados`,
      timestamp: new Date().toISOString(),
    };

    res.setHeader('X-Total-Count', total.toString());
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar leads:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/leads/stats - Estatísticas dos leads
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, byStatus, byPotentialLevel, byRegion] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.lead.groupBy({
        by: ['potentialLevel'],
        _count: { potentialLevel: true },
      }),
      prisma.lead.groupBy({
        by: ['validatedState'],
        _count: { validatedState: true },
      }),
    ]);

    // Contadores específicos para os cards
    const [processed, pending, highPotential] = await Promise.all([
      prisma.lead.count({ where: { status: 'processado' } }),
      prisma.lead.count({ where: { status: 'aguardando' } }),
      prisma.lead.count({ where: { potentialLevel: 'alto' } }),
    ]);

    const stats = {
      total,
      processed,
      pending,
      highPotential,
      byStatus: byStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as any),
      byPotentialLevel: byPotentialLevel.reduce((acc: any, item: any) => {
        acc[item.potentialLevel] = item._count.potentialLevel;
        return acc;
      }, {} as any),
      byRegion: byRegion.reduce((acc: any, item: any) => {
        acc[item.validatedState || 'Não informado'] = item._count.validatedState;
        return acc;
      }, {} as any),
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Estatísticas obtidas com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/leads/processing-stats - Estatísticas de processamento
router.get('/processing-stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalJobs, waitingJobs, processingJobs, completedJobs, failedJobs] = await Promise.all([
      prisma.processingJob.count(),
      prisma.processingJob.count({ where: { status: 'pending' } }),
      prisma.processingJob.count({ where: { status: 'processing' } }),
      prisma.processingJob.count({ where: { status: 'completed' } }),
      prisma.processingJob.count({ where: { status: 'failed' } }),
    ]);

    const stats = {
      totalJobs,
      waitingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      queueStats: await queueService.getQueueStats(),
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Estatísticas de processamento obtidas com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de processamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/leads/cnpj-api-status - Status da API de CNPJ
router.get('/cnpj-api-status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rateLimitInfo = await potentialAnalysisService.getCnpjApiRateLimitInfo();
    
    const status = {
      rateLimit: rateLimitInfo,
      apiUrl: 'https://open.cnpja.com/office/CNPJ',
      limit: '5 consultas por minuto',
      status: rateLimitInfo.isBlocked ? 'Bloqueado' : 'Disponível',
      remainingQueries: rateLimitInfo.remaining,
      nextResetIn: rateLimitInfo.resetTime > 0 ? `${Math.ceil(rateLimitInfo.resetTime / 1000)}s` : 'Agora',
    };

    const response: ApiResponse<typeof status> = {
      success: true,
      data: status,
      message: 'Status da API de CNPJ obtido com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar status da API de CNPJ:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/leads/cleanup-duplicates - Remove leads duplicados
router.post('/cleanup-duplicates', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Buscar leads duplicados por CNPJ
    const duplicates = await prisma.$queryRaw`
      SELECT cnpj, COUNT(*) as count
      FROM leads
      GROUP BY cnpj
      HAVING COUNT(*) > 1
    `;

    let duplicatesRemoved = 0;
    
    if (Array.isArray(duplicates)) {
      for (const duplicate of duplicates) {
        const { cnpj } = duplicate as any;
        // Manter o primeiro lead e remover os demais
        const leadsToDelete = await prisma.lead.findMany({
          where: { cnpj },
          orderBy: { createdAt: 'asc' },
          skip: 1,
        });
        
        if (leadsToDelete.length > 0) {
          await prisma.lead.deleteMany({
            where: { id: { in: leadsToDelete.map((l: any) => l.id) } },
          });
          duplicatesRemoved += leadsToDelete.length;
        }
      }
    }

    const response: ApiResponse<{ duplicatesRemoved: number }> = {
      success: true,
      data: { duplicatesRemoved },
      message: `Limpeza concluída. ${duplicatesRemoved} leads duplicados removidos.`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao limpar duplicatas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/leads/cnpj/:cnpj - Busca lead por CNPJ
router.get('/cnpj/:cnpj', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cnpj } = req.params;
    const lead = await prisma.lead.findFirst({
      where: { cnpj },
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        error: 'Lead não encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const response: ApiResponse<PrismaLead> = {
      success: true,
      data: lead,
      message: 'Lead encontrado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar lead por CNPJ:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/leads/salesforce-webhook - Endpoint para Salesforce importar leads
router.get('/salesforce-webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar apenas leads processados
    const leads = await prisma.lead.findMany({
      where: { status: 'processado' },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limite para evitar sobrecarga
    });

    if (leads.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Nenhum lead processado encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Formatar dados para Salesforce
    const salesforceLeads = leads.map((lead: PrismaLead) => ({
      Company: lead.companyName || '',
      CNPJ__c: lead.cnpj || '',
      City: lead.validatedCity || lead.city || '',
      State: lead.validatedState || '',
      PostalCode: lead.validatedZipCode || lead.zipCode || '',
      Street: lead.validatedStreet || lead.streetAddress || '',
      Neighborhood: lead.validatedNeighborhood || lead.neighborhood || '',
      Lead_Score__c: lead.potentialScore || 0,
      Lead_Quality__c: lead.potentialLevel || 'baixo',
      Industry: lead.industry || lead.cnaeDescription || '',
      CNAE__c: lead.cnae || '',
      Annual_Revenue__c: lead.capitalSocial || 0,
      Foundation_Date__c: lead.foundationDate ? lead.foundationDate.toISOString().split('T')[0] : '',
      Address_Validated__c: lead.addressValidated || false,
      Coordinates__c: lead.validatedCoordinates ? 'Sim' : 'Não',
      Partners_Count__c: lead.partners && Array.isArray(lead.partners) ? lead.partners.length : 0,
      Processing_Date__c: lead.updatedAt.toISOString().split('T')[0],
      Notes__c: lead.userNotes || '',
      Source__c: 'Coco Litorâneo - Processamento Automático',
    }));

    const response = {
      success: true,
      totalLeads: leads.length,
      lastUpdate: new Date().toISOString(),
      leads: salesforceLeads,
      format: 'Salesforce Compatible',
      instructions: 'Use este endpoint no Salesforce Data Import Wizard ou External Data Source',
    };

    // Headers para CORS e cache
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Total-Count', leads.length.toString());

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao gerar webhook para Salesforce:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});


// GET /api/leads/:id - Busca lead por ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        error: 'Lead não encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const response: ApiResponse<PrismaLead> = {
      success: true,
      data: lead,
      message: 'Lead encontrado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar lead:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/leads/:id/potential-details - Retorna detalhes da pontuação de potencial
router.get('/:id/potential-details', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        error: 'Lead não encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Busca detalhes da pontuação usando o serviço centralizado
    const potentialDetails = potentialAnalysisService.getPotentialScoreDetails({
      cnpj: lead.cnpj,
      cnae: lead.cnae || undefined,
      capitalSocial: lead.capitalSocial || undefined,
      region: lead.validatedState || undefined,
      foundationDate: lead.foundationDate ? lead.foundationDate.toISOString() : undefined,
      addressValidated: lead.addressValidated || false,
      coordinates: lead.coordinates || undefined,
      partners: lead.partners || undefined,
    });

    const response: ApiResponse<typeof potentialDetails> = {
      success: true,
      data: potentialDetails,
      message: 'Detalhes da pontuação obtidos com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes da pontuação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/leads - Cria novo lead manualmente
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const leadData = req.body;

    // Valida endereço se fornecido
    if (leadData.address) {
      leadData.address = await addressValidationService.validateAddress(
        leadData.address
      );
    }

    // Analisa potencial se dados da empresa fornecidos
    if (leadData.companyData) {
      leadData.potential =
        potentialAnalysisService.analyzePotentialByCompanyData(
          leadData.companyData
        );
    }

    const newLead = await prisma.lead.create({
      data: leadData,
    });

    const response: ApiResponse<PrismaLead> = {
      success: true,
      data: newLead,
      message: 'Lead criado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Erro ao criar lead:', error);
    res.status(400).json({
      success: false,
      error: `Erro ao criar lead: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/leads/upload - Upload e processamento de planilha do Datlo
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Verifica se o arquivo foi enviado
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado. Certifique-se de enviar o arquivo no campo "file"',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verifica se é um arquivo Excel válido
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Alguns sistemas enviam como octet-stream
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: `Tipo de arquivo não suportado: ${req.file.mimetype}. Apenas arquivos Excel (.xlsx, .xls) são aceitos.`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`📁 Arquivo recebido: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`📋 Tipo MIME: ${req.file.mimetype}`);

    // VALIDAÇÃO RÁPIDA DO FORMATO (sem processar dados)
    const formatValidation = await excelProcessingService.validateExcelFormat(req.file.buffer);
    
    if (!formatValidation.isValid) {
      res.status(400).json({
        success: false,
        error: `Formato da planilha inválido: ${formatValidation.error}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // RESPOSTA IMEDIATA - Planilha aceita e será processada
    const immediateResponse: ApiResponse<any> = {
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        estimatedLeads: formatValidation.estimatedLeads,
        status: 'aceita',
        message: 'Planilha aceita e será processada em background',
        processingStarted: new Date().toISOString(),
      },
      message: 'Planilha aceita com sucesso! O processamento será iniciado em breve.',
      timestamp: new Date().toISOString(),
    };

    // Envia resposta imediata
    res.status(202).json(immediateResponse);

    // PROCESSAMENTO EM BACKGROUND (não bloqueia a resposta)
    setImmediate(async () => {
      try {
        const fileName = req.file!.originalname;
        const fileBuffer = req.file!.buffer;
        
        console.log(`🚀 Iniciando processamento em background para: ${fileName}`);
        
        // Processa a planilha para extrair dados
        const rawData = await excelProcessingService.extractExcelData(fileBuffer);
        
        if (!rawData || rawData.length === 0) {
          console.warn(`⚠️ Nenhum dado válido encontrado na planilha: ${fileName}`);
          return;
        }

        console.log(`📊 ${rawData.length} leads extraídos da planilha: ${fileName}`);

        // Adiciona leads à fila de processamento
        const uploadResult = await queueService.addLeadsToQueue(rawData);

        console.log(`✅ Processamento em background concluído: ${uploadResult.created} leads criados, ${uploadResult.skipped} duplicados`);
        
      } catch (error) {
        console.error(`❌ Erro no processamento em background:`, error);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao processar planilha:', error);
    
    // Tratamento específico para erros do Multer
    if (error instanceof Error && error.message.includes('Field name missing')) {
      res.status(400).json({
        success: false,
        error: 'Campo "file" não encontrado. Certifique-se de enviar o arquivo com o nome de campo correto.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: `Erro ao processar planilha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/leads/export - Exporta leads para Excel
router.post('/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filters = {} } = req.body; // Valor padrão para filters

    // Busca leads com filtros
    const where: any = {};
    
    // Se IDs específicos foram fornecidos, exportar apenas esses
    if (filters.selectedIds && Array.isArray(filters.selectedIds) && filters.selectedIds.length > 0) {
      where.id = { in: filters.selectedIds };
    } else {
      // Filtros normais se não houver IDs específicos
      if (filters.status) where.status = filters.status;
      if (filters.potentialLevel) where.potentialLevel = filters.potentialLevel;
      if (filters.city) where.validatedCity = { contains: filters.city, mode: 'insensitive' };
      if (filters.state) where.validatedState = { contains: filters.state, mode: 'insensitive' };
      if (filters.industry) where.industry = { contains: filters.industry, mode: 'insensitive' };
      
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      take: filters.limit || 1000,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    if (leads.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Nenhum lead encontrado para exportação',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Exporta para Excel
    const excelBuffer = await excelProcessingService.exportLeadsToExcel(leads);

    // Define headers para download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    
    // Nome do arquivo baseado no tipo de exportação
    const fileName = filters.selectedIds ? 'leads_selecionados' : 'leads_export';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    res.setHeader('Content-Length', excelBuffer.length.toString());

    res.status(200).send(excelBuffer);
  } catch (error) {
    console.error('❌ Erro ao exportar leads:', error);
    res.status(500).json({
      success: false,
      error: `Erro ao exportar leads: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/leads/:id - Atualiza lead existente
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Valida endereço se fornecido
    if (updates.address) {
      updates.address = await addressValidationService.validateAddress(
        updates.address
      );
    }

    // Reanalisa potencial se dados da empresa foram alterados
    if (updates.companyData) {
      updates.potential =
        potentialAnalysisService.analyzePotentialByCompanyData(
          updates.companyData
        );
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updates,
    });

          // Lead sempre será encontrado se chegou até aqui

    const response: ApiResponse<PrismaLead> = {
      success: true,
      data: updatedLead,
      message: 'Lead atualizado com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao atualizar lead:', error);
    res.status(400).json({
      success: false,
      error: `Erro ao atualizar lead: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/leads/:id - Remove lead
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verificar se o lead existe
    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      res.status(404).json({
        success: false,
        error: 'Lead não encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Deletar lead (agora com cascata automática)
    await prisma.lead.delete({
      where: { id },
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Lead removido com sucesso',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao remover lead:', error);
    
    // Tratamento específico para erros de constraint
    if (error instanceof Error && 'code' in error && error.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'Não é possível deletar este lead pois possui registros relacionados',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/leads/:id/validate-address - Valida endereço de um lead específico
router.post(
  '/:id/validate-address',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const lead = await prisma.lead.findUnique({
        where: { id },
      });

      if (!lead) {
        res.status(404).json({
          success: false,
          error: 'Lead não encontrado',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Valida o endereço
      const addressToValidate = {
        street: lead.streetAddress || '',
        number: '',
        complement: '',
        neighborhood: lead.neighborhood || '',
        city: lead.city || '',
        state: '',
        zipCode: lead.zipCode || '',
      };
      
      const validatedAddress = await addressValidationService.validateAddress(
        addressToValidate
      );

      // Atualiza o lead com o endereço validado
      const updatedLead = await prisma.lead.update({
        where: { id },
        data: {
          validatedStreet: validatedAddress.street,
          validatedNumber: validatedAddress.number,
          validatedComplement: validatedAddress.complement,
          validatedNeighborhood: validatedAddress.neighborhood,
          validatedCity: validatedAddress.city,
          validatedState: validatedAddress.state,
          validatedZipCode: validatedAddress.zipCode,
          validatedCoordinates: validatedAddress.coordinates,
          addressValidated: addressValidationService.isAddressValid(validatedAddress),
          addressValidationDate: new Date(),
          addressValidationSource: 'viacep',
        },
      });

      const response: ApiResponse<PrismaLead> = {
        success: true,
        data: updatedLead!,
        message: 'Endereço validado com sucesso',
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Erro ao validar endereço:', error);
      res.status(400).json({
        success: false,
        error: `Erro ao validar endereço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// POST /api/leads/:id/recalculate-confidence - Recalcula confiança de um lead existente
router.post('/:id/recalculate-confidence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        error: 'Lead não encontrado',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Recalcula confiança usando o serviço centralizado
    const potentialDetails = potentialAnalysisService.getPotentialScoreDetails({
      cnpj: lead.cnpj,
      cnae: lead.cnae || undefined,
      capitalSocial: lead.capitalSocial || undefined,
      region: lead.validatedState || undefined,
      foundationDate: lead.foundationDate ? lead.foundationDate.toISOString() : undefined,
      addressValidated: lead.addressValidated || false,
      coordinates: lead.coordinates || undefined,
      partners: lead.partners || undefined,
    });

    // Atualiza o lead com a nova confiança
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        potentialConfidence: potentialDetails.confidence,
        updatedAt: new Date(),
      },
    });

    const response: ApiResponse<PrismaLead> = {
      success: true,
      data: updatedLead,
      message: `Confiança recalculada: ${potentialDetails.confidence}%`,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Erro ao recalcular confiança:', error);
    res.status(500).json({
      success: false,
      error: `Erro ao recalcular confiança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as leadsRoutes };
