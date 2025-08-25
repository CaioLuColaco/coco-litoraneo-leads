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
        concurrency: 5, // Processa 5 leads simultaneamente
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

      // Processar leads em lotes de 3 para respeitar o rate limit (5/min)
      const batchSize = 3;
      const batches = [];
      
      for (let i = 0; i < leads.length; i += batchSize) {
        batches.push(leads.slice(i, i + batchSize));
      }

      console.log(`📦 Processando em ${batches.length} lotes de até ${batchSize} leads`);

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
            const delay = batchIndex * 15000; // 15 segundos entre lotes
            
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
          console.log(`⏳ Aguardando 15 segundos antes do próximo lote...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
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

      // 4. Atualizar lead com dados processados (100%)
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
          
          // Potencial calculado
          potentialScore: finalPotential.score,
          potentialLevel: finalPotential.level,
          potentialFactors: finalPotential.factors,
          potentialConfidence: finalPotential.confidence,
          
          // Dados cadastrais da empresa
          cnae: companyData?.cnae || null,
          cnaeDescription: companyData?.cnaeDescription || null,
          capitalSocial: companyData?.capitalSocial || null,
          foundationDate: companyData?.foundationDate ? new Date(companyData.foundationDate) : null,
          partners: companyData?.partners || null,
          
          // Status
          status: 'processado',
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
   * Limpa filas antigas
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

      console.log('🧹 Jobs antigos limpos com sucesso');
    } catch (error) {
      console.error('Erro ao limpar jobs antigos:', error);
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
