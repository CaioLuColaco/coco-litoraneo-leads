import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { AddressValidationService } from './addressValidationService';
import { PotentialAnalysisService } from './potentialAnalysisService';

export class QueueService {
  private redis: Redis;
  private prisma: PrismaClient;
  private addressValidationService: AddressValidationService;
  private potentialAnalysisService: PotentialAnalysisService;
  
  // Filas
  private leadProcessingQueue!: Queue;
  private leadProcessingWorker!: Worker;

  constructor() {
    // Configuração específica para BullMQ - sem opções que causam conflito
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.prisma = new PrismaClient();
    this.addressValidationService = new AddressValidationService();
    this.potentialAnalysisService = new PotentialAnalysisService();
    
    this.initializeQueues();
  }

  /**
   * Inicializa as filas e workers
   */
  private initializeQueues(): void {
    // Fila para processamento de leads
    this.leadProcessingQueue = new Queue('lead-processing', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Worker para processar leads
    this.leadProcessingWorker = new Worker(
      'lead-processing',
      async (job: Job) => {
        return await this.processLead(job);
      },
      {
        connection: this.redis,
        concurrency: 3, // Reduzido para 3 leads simultaneamente
        lockDuration: 30000, // 30 segundos de lock
        stalledInterval: 30000, // Verifica jobs travados a cada 30 segundos
        maxStalledCount: 1, // Máximo 1 tentativa para jobs travados
      }
    );

    // Eventos do worker
    this.leadProcessingWorker.on('completed', async (job: Job, result: any) => {
      console.log(`✅ Job ${job.id} completado para lead ${result.leadId}`);
      await this.updateLeadStatus(result.leadId, 'processado');
    });

    this.leadProcessingWorker.on('failed', async (job: Job | undefined, err: Error) => {
      if (job) {
        console.error(`❌ Job ${job.id} falhou para lead ${job.data.leadId}:`, err.message);
        await this.updateLeadStatus(job.data.leadId, 'erro', err.message);
      }
    });

    this.leadProcessingWorker.on('progress', async (job: Job, progress: any) => {
      console.log(`📊 Job ${job.id} progresso: ${progress}%`);
      await this.updateJobProgress(job.id as string, typeof progress === 'number' ? progress : 0);
    });
  }

  /**
   * Adiciona leads à fila de processamento
   */
  async addLeadsToQueue(leads: any[]): Promise<{ created: number; skipped: number; total: number }> {
    try {
      console.log(`🚀 Adicionando ${leads.length} leads à fila de processamento...`);

      let created = 0;
      let skipped = 0;

      // Processar leads em lotes para respeitar rate limit da API
      const batchSize = 3; // Reduzido de 3 para 2 leads por lote
      const batches = [];
      
      for (let i = 0; i < leads.length; i += batchSize) {
        batches.push(leads.slice(i, i + batchSize));
      }

      console.log(`📦 Processando ${leads.length} leads em ${batches.length} lotes de ${batchSize}`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Processando lote ${batchIndex + 1}/${batches.length} com ${batch.length} leads`);

        for (const leadData of batch) {
          try {
            // Verificar se já existe um lead com este CNPJ
            const existingLead = await this.prisma.lead.findFirst({
              where: { cnpj: leadData.CNPJ }
            });

            if (existingLead) {
              console.log(`⚠️ Lead com CNPJ ${leadData.CNPJ} já existe, pulando...`);
              skipped++;
              continue;
            }

            // Criar lead no banco com status "aguardando"
            const lead = await this.prisma.lead.create({
              data: {
                cnpj: leadData.CNPJ,
                companyName: leadData['Razão social'],
                tradeName: leadData['Nome Fantasia'] || null,
                matrixName: leadData['Nome matriz'],
                city: leadData.Município,
                district: leadData.Distrito,
                subdistrict: leadData.Subdistrito,
                zipCode: leadData.CEP,
                neighborhood: leadData.Bairro,
                streetAddress: leadData['Endereço cadastral'],
                suggestedAddress: leadData['Endereço sugerido'],
                coordinates: leadData.Coordenadas,
                streetViewUrl: leadData['Street View'],
                status: 'aguardando',
                // Campos obrigatórios com valores padrão
                potentialFactors: [],
                potentialScore: 0,
                potentialLevel: 'baixo',
                potentialConfidence: 0,
              },
            });

            // Delay progressivo para respeitar rate limit
            const delay = batchIndex * 30000; // 30 segundos
            
            // Criar job de processamento
            const job = await this.leadProcessingQueue.add(
              'process-lead',
              { leadId: lead.id, leadData },
              {
                priority: 1,
                delay: 1000 + delay, // Delay base + delay progressivo
              }
            );

            // Criar registro de job no banco
            await this.prisma.processingJob.create({
              data: {
                leadId: lead.id,
                status: 'pending',
                redisJobId: job.id as string,
              },
            });

            created++;
            console.log(`✅ Lead ${lead.id} criado e adicionado à fila (delay: ${delay}ms)`);
          } catch (error) {
            console.error(`❌ Erro ao processar lead ${leadData.CNPJ}:`, error);
            skipped++;
          }
        }

        // Aguardar entre lotes para respeitar rate limit
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ Aguardando 30 segundos antes do próximo lote...`);
          await new Promise(resolve => setTimeout(resolve, 30000)); // Aumentado de 15s para 30s
        }
      }

      console.log(`✅ ${created} leads criados, ${skipped} pulados, total: ${leads.length}`);
      return { created, skipped, total: leads.length };
    } catch (error) {
      console.error('❌ Erro ao adicionar leads à fila:', error);
      throw error;
    }
  }

  /**
   * Processa um lead individual
   */
  private async processLead(job: Job): Promise<any> {
    const { leadId, leadData } = job.data;
    
    try {
      console.log(`🔄 Processando lead ${leadId}...`);
      
      // Atualizar status para "processando"
      await this.updateLeadStatus(leadId, 'processando');
      await this.updateJobStatus(job.id as string, 'processing');

      // 1. Validação de endereço (25%)
      await job.updateProgress(25);
      const validatedAddress = await this.addressValidationService.validateAddress({
        street: leadData['Endereço cadastral'],
        zipCode: leadData.CEP,
        city: leadData.Município,
        state: leadData.Município.split(' - ')[0] || '',
      });

      // 2. Análise de potencial por CNPJ (50%)
      await job.updateProgress(50);
      const potentialAnalysis = await this.potentialAnalysisService.analyzePotentialByCnpj(
        leadData.CNPJ
      );

      // 3. Cálculo de potencial final (75%)
      await job.updateProgress(75);
      const finalPotential = this.potentialAnalysisService.calculateFinalPotential(
        validatedAddress,
        potentialAnalysis
      );

      // 4. Buscar dados cadastrais da empresa (85%)
      await job.updateProgress(85);
      const companyData = await this.potentialAnalysisService.fetchCompanyData(leadData.CNPJ);

      // Log do resultado do enriquecimento
      if (companyData) {
        console.log(`✅ Dados enriquecidos para CNPJ ${leadData.CNPJ}: CNAE ${companyData.cnae}, Capital R$ ${companyData.capitalSocial}`);
      } else {
        console.log(`⚠️ Falha no enriquecimento para CNPJ ${leadData.CNPJ} - usando dados básicos`);
      }

      // 5. Calcular detalhes da pontuação usando a nova função centralizada
      const potentialDetails = this.potentialAnalysisService.getPotentialScoreDetails({
        cnpj: leadData.CNPJ,
        cnae: companyData?.cnae || undefined,
        capitalSocial: companyData?.capitalSocial || undefined,
        region: validatedAddress.state || undefined,
        foundationDate: companyData?.foundationDate || undefined,
        addressValidated: true,
        coordinates: leadData.Coordenadas || (validatedAddress.coordinates ? 'disponível' : undefined),
        partners: companyData?.partners || undefined,
        validatedState: validatedAddress.state || undefined,
        validatedCoordinates: (leadData.Coordenadas || validatedAddress.coordinates) ? true : false,
      });

      // 6. Atualizar lead com dados processados (100%)
      await job.updateProgress(100);
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          // Endereço validado
          validatedStreet: validatedAddress.street,
          validatedNumber: validatedAddress.number,
          validatedComplement: validatedAddress.complement,
          validatedNeighborhood: validatedAddress.neighborhood,
          validatedCity: validatedAddress.city,
          validatedState: validatedAddress.state,
          validatedZipCode: validatedAddress.zipCode,
          validatedCoordinates: validatedAddress.coordinates,
          addressValidated: true,
          addressValidationDate: new Date(),
          addressValidationSource: 'viacep',
          
          // Potencial calculado usando a nova função centralizada
          potentialScore: potentialDetails.totalScore,
          potentialLevel: potentialDetails.level,
          potentialFactors: potentialDetails.factors, // Agora são fatores estruturados
          potentialConfidence: potentialDetails.confidence,
          
          // Dados cadastrais da empresa (com fallback para dados básicos)
          cnae: companyData?.cnae || null,
          cnaeDescription: companyData?.cnaeDescription || null,
          capitalSocial: companyData?.capitalSocial || null,
          foundationDate: companyData?.foundationDate ? new Date(companyData.foundationDate) : null,
          partners: companyData?.partners ? JSON.parse(JSON.stringify(companyData.partners)) : null,
          
          // Status (sempre processado, mesmo sem enriquecimento)
          status: 'processado',
          // Campo adicional para indicar se foi enriquecido
          processingError: companyData ? null : 'Falha no enriquecimento de dados cadastrais',
        },
      });

      // Atualizar job como completado
      await this.updateJobStatus(job.id as string, 'completed');

      console.log(`✅ Lead ${leadId} processado com sucesso`);
      
      return {
        leadId,
        success: true,
        validatedAddress,
        potentialAnalysis: finalPotential,
      };
    } catch (error) {
      console.error(`❌ Erro ao processar lead ${leadId}:`, error);
      
      // Atualizar job como falhou
      await this.updateJobStatus(job.id as string, 'failed', error instanceof Error ? error.message : 'Erro desconhecido');
      
      throw error;
    }
  }

  /**
   * Atualiza status do lead
   */
  private async updateLeadStatus(leadId: string, status: string, error?: string): Promise<void> {
    try {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          status,
          processingError: error || null,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Erro ao atualizar status do lead ${leadId}:`, error);
    }
  }

  /**
   * Atualiza status do job
   */
  private async updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
    try {
      // Verificar se o job existe antes de atualizar
      const existingJob = await this.prisma.processingJob.findUnique({
        where: { id: jobId },
      });

      if (!existingJob) {
        console.warn(`⚠️ Job ${jobId} não encontrado no banco de dados, ignorando atualização de status`);
        return;
      }

      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status,
          error: error || null,
          startedAt: status === 'processing' ? new Date() : undefined,
          completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error(`Erro ao atualizar status do job ${jobId}:`, error);
    }
  }

  /**
   * Atualiza progresso do job
   */
  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    try {
      // Verificar se o job existe antes de atualizar
      const existingJob = await this.prisma.processingJob.findUnique({
        where: { id: jobId },
      });

      if (!existingJob) {
        console.warn(`⚠️ Job ${jobId} não encontrado no banco de dados, ignorando atualização de progresso`);
        return;
      }

      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          progress,
          currentStep: this.getCurrentStep(progress),
        },
      });
    } catch (error) {
      console.error(`Erro ao atualizar progresso do job ${jobId}:`, error);
    }
  }

  /**
   * Determina o passo atual baseado no progresso
   */
  private getCurrentStep(progress: number): string {
    if (progress <= 25) return 'address_validation';
    if (progress <= 50) return 'cnpj_analysis';
    if (progress <= 75) return 'potential_calculation';
    return 'finalizing';
  }

  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats(): Promise<any> {
    try {
      const waiting = await this.leadProcessingQueue.getWaiting();
      const active = await this.leadProcessingQueue.getActive();
      const completed = await this.leadProcessingQueue.getCompleted();
      const failed = await this.leadProcessingQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas da fila:', error);
      return null;
    }
  }

  /**
   * Limpa filas antigas e jobs travados
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      // Limpar jobs completados com mais de 7 dias
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      await this.prisma.processingJob.deleteMany({
        where: {
          status: 'completed',
          completedAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      // Limpar jobs travados (processando há mais de 30 minutos)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const stuckJobs = await this.prisma.processingJob.findMany({
        where: {
          status: 'processing',
          startedAt: {
            lt: thirtyMinutesAgo,
          },
        },
      });

      for (const job of stuckJobs) {
        await this.prisma.processingJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: 'Job travado - timeout de processamento',
            completedAt: new Date(),
          },
        });
      }

      if (stuckJobs.length > 0) {
        console.log(`🧹 ${stuckJobs.length} jobs travados limpos`);
      }

      // Sincronizar jobs órfãos
      await this.syncOrphanJobs();

      console.log('🧹 Jobs antigos limpos com sucesso');
    } catch (error) {
      console.error('Erro ao limpar jobs antigos:', error);
    }
  }

  /**
   * Sincroniza jobs órfãos entre Redis e banco de dados
   */
  private async syncOrphanJobs(): Promise<void> {
    try {
      // Buscar todos os jobs ativos no Redis
      const redisJobs = await this.leadProcessingQueue.getActive();
      const redisJobIds = new Set(redisJobs.map(job => job.id));

      // Buscar todos os jobs no banco de dados
      const dbJobs = await this.prisma.processingJob.findMany({
        where: {
          status: {
            in: ['pending', 'processing']
          }
        },
        select: {
          id: true,
          redisJobId: true,
        }
      });

      // Encontrar jobs que estão no Redis mas não no banco
      const orphanRedisJobs = redisJobs.filter(redisJob => 
        !dbJobs.some((dbJob: { id: string; redisJobId: string | null }) => dbJob.redisJobId === redisJob.id)
      );

      // Encontrar jobs que estão no banco mas não no Redis
      const orphanDbJobs = dbJobs.filter((dbJob: { id: string; redisJobId: string | null }) => 
        dbJob.redisJobId && !redisJobIds.has(dbJob.redisJobId)
      );

      // Remover jobs órfãos do Redis
      for (const job of orphanRedisJobs) {
        await job.remove();
        console.log(`🧹 Job órfão ${job.id} removido do Redis`);
      }

      // Marcar jobs órfãos do banco como falhados
      for (const job of orphanDbJobs) {
        await this.prisma.processingJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: 'Job órfão - não encontrado no Redis',
            completedAt: new Date(),
          },
        });
        console.log(`🧹 Job órfão ${job.id} marcado como falhado no banco`);
      }

      if (orphanRedisJobs.length > 0 || orphanDbJobs.length > 0) {
        console.log(`🔄 Sincronização concluída: ${orphanRedisJobs.length} jobs órfãos do Redis removidos, ${orphanDbJobs.length} jobs órfãos do banco marcados como falhados`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar jobs órfãos:', error);
    }
  }

  /**
   * Fecha conexões
   */
  async close(): Promise<void> {
    await this.leadProcessingQueue.close();
    await this.leadProcessingWorker.close();
    await this.redis.quit();
    await this.prisma.$disconnect();
  }
}
