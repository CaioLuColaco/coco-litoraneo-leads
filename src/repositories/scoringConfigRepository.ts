import { PrismaClient } from '@prisma/client';
import {
  ScoringConfig,
  CreateScoringConfigRequest,
  UpdateScoringConfigRequest,
} from '../types/lead';

export class ScoringConfigRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Cria uma nova configuração de pontuação
   */
  async create(data: CreateScoringConfigRequest, userId?: string): Promise<ScoringConfig> {
    // Sempre desativa outras configurações quando criar uma nova
    await this.prisma.scoringConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    const config = await this.prisma.scoringConfig.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: true,
        createdBy: userId,
        categories: {
          create: data.categories.map(category => ({
            name: category.name,
            type: category.type,
            points: category.points,
            description: category.description,
            criteria: {
              create: category.criteria.map(criteria => ({
                name: criteria.name,
                value: criteria.value,
                points: criteria.points,
                description: criteria.description,
              }))
            }
          }))
        }
      },
      include: {
        categories: {
          include: {
            criteria: true
          }
        }
      }
    });

    return this.mapToScoringConfig(config);
  }

  /**
   * Busca todas as configurações de pontuação
   */
  async findAll(): Promise<ScoringConfig[]> {
    const configs = await this.prisma.scoringConfig.findMany({
      include: {
        categories: {
          include: {
            criteria: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return configs.map(config => this.mapToScoringConfig(config));
  }

  /**
   * Busca uma configuração específica por ID
   */
  async findById(id: string): Promise<ScoringConfig | null> {
    const config = await this.prisma.scoringConfig.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            criteria: true
          }
        }
      }
    });

    return config ? this.mapToScoringConfig(config) : null;
  }

  /**
   * Busca a configuração ativa
   */
  async findActive(): Promise<ScoringConfig | null> {
    const config = await this.prisma.scoringConfig.findFirst({
      where: { isActive: true },
      include: {
        categories: {
          include: {
            criteria: true
          }
        }
      }
    });

    return config ? this.mapToScoringConfig(config) : null;
  }

  /**
   * Atualiza uma configuração de pontuação
   */
  async update(id: string, data: UpdateScoringConfigRequest): Promise<ScoringConfig | null> {
    // Verificar se a configuração que será atualizada está ativa
    const configToUpdate = await this.prisma.scoringConfig.findUnique({
      where: { id },
      select: { isActive: true }
    });

    const wasActive = configToUpdate?.isActive || false;
    const willBeActive = data.isActive !== undefined ? data.isActive : wasActive;

    // Se esta configuração será ativa, desativa as outras
    if (willBeActive) {
      await this.prisma.scoringConfig.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    // Se há categorias para atualizar, remove as antigas e cria novas
    if (data.categories) {
      await this.prisma.scoringCriteria.deleteMany({
        where: {
          category: {
            configId: id
          }
        }
      });

      await this.prisma.scoringCategory.deleteMany({
        where: { configId: id }
      });
    }

    const config = await this.prisma.scoringConfig.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        ...(data.categories && {
          categories: {
            create: data.categories.map(category => ({
              name: category.name,
              type: category.type,
              points: category.points,
              description: category.description,
              criteria: {
                create: category.criteria.map(criteria => ({
                  name: criteria.name,
                  value: criteria.value,
                  points: criteria.points,
                  description: criteria.description,
                }))
              }
            }))
          }
        })
      },
      include: {
        categories: {
          include: {
            criteria: true
          }
        }
      }
    });

    // Se a configuração está ativa e foi atualizada, recalcular pontuações
    if (willBeActive && (data.categories || data.name || data.description)) {
      console.log('🔄 Configuração ativa atualizada. Iniciando recálculo de pontuações...');
      
      // Importar o serviço de pontuação configurável
      const { ConfigurableScoringService } = await import('../services/configurableScoringService');
      const scoringService = new ConfigurableScoringService();
      
      try {
        const result = await scoringService.recalculateAllLeadScores();
        console.log(`✅ Recálculo concluído após atualização: ${result.updated} leads atualizados`);
      } catch (error) {
        console.error('❌ Erro no recálculo após atualização:', error);
      } finally {
        await scoringService.close();
      }
    }

    return this.mapToScoringConfig(config);
  }

  /**
   * Remove uma configuração de pontuação
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Verificar se a configuração que será excluída está ativa
      const configToDelete = await this.prisma.scoringConfig.findUnique({
        where: { id },
        select: { isActive: true }
      });

      const wasActive = configToDelete?.isActive || false;

      // Excluir a configuração
      await this.prisma.scoringConfig.delete({
        where: { id }
      });

      // Se a configuração excluída estava ativa, recalcular pontuações
      if (wasActive) {
        console.log('🔄 Configuração ativa excluída. Iniciando recálculo de pontuações...');
        
        // Importar o serviço de pontuação configurável
        const { ConfigurableScoringService } = await import('../services/configurableScoringService');
        const scoringService = new ConfigurableScoringService();
        
        try {
          const result = await scoringService.recalculateAllLeadScores();
          console.log(`✅ Recálculo concluído após exclusão: ${result.updated} leads atualizados`);
        } catch (error) {
          console.error('❌ Erro no recálculo após exclusão:', error);
        } finally {
          await scoringService.close();
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir configuração:', error);
      return false;
    }
  }

  /**
   * Ativa uma configuração específica (desativa as outras)
   */
  async activate(id: string): Promise<ScoringConfig | null> {
    // Desativa todas as outras configurações
    await this.prisma.scoringConfig.updateMany({
      where: { 
        isActive: true,
        id: { not: id }
      },
      data: { isActive: false }
    });

    // Ativa a configuração especificada
    const config = await this.prisma.scoringConfig.update({
      where: { id },
      data: { isActive: true },
      include: {
        categories: {
          include: {
            criteria: true
          }
        }
      }
    });

    // Recalcular pontuações quando uma nova configuração é ativada
    console.log('🔄 Nova configuração ativada. Iniciando recálculo de pontuações...');
    
    // Importar o serviço de pontuação configurável
    const { ConfigurableScoringService } = await import('../services/configurableScoringService');
    const scoringService = new ConfigurableScoringService();
    
    try {
      const result = await scoringService.recalculateAllLeadScores();
      console.log(`✅ Recálculo concluído após ativação: ${result.updated} leads atualizados`);
    } catch (error) {
      console.error('❌ Erro no recálculo após ativação:', error);
    } finally {
      await scoringService.close();
    }

    return this.mapToScoringConfig(config);
  }

  /**
   * Cria uma configuração padrão se não existir nenhuma
   */
  async createDefaultConfig(): Promise<ScoringConfig> {
    const defaultConfig: CreateScoringConfigRequest = {
      name: 'Configuração Padrão',
      description: 'Configuração padrão do sistema de pontuação',
      categories: [
        {
          name: 'CNAEs de Alto Potencial',
          type: 'cnae',
          points: 45,
          description: 'CNAEs relacionados a alimentação e varejo',
          criteria: [
            {
              name: '4721100 - Comércio varejista de produtos de padaria',
              value: '4721100',
              points: 45,
              description: 'Padaria e confeitaria'
            },
            {
              name: '4721102 - Padaria e confeitaria com predominância de revenda',
              value: '4721102',
              points: 45,
              description: 'Padaria e confeitaria'
            },
          ]
        },
        {
          name: 'CNAEs de Médio Potencial',
          type: 'cnae',
          points: 25,
          description: 'CNAEs relacionados ao setor alimentício',
          criteria: [
            {
              name: '1091102 - Padaria e confeitaria com predominância de produção própria',
              value: '1091102',
              points: 25,
              description: 'Produção própria'
            },
            {
              name: '1053800 - Fabricação de sorvetes e outros gelados',
              value: '1053800',
              points: 25,
              description: 'Sorvetes e gelados'
            },
            {
              name: '1093701 - Fabricação de produtos derivados do cacau',
              value: '1093701',
              points: 25,
              description: 'Chocolates e derivados'
            }
          ]
        },
        {
          name: 'Regiões de Alto Potencial',
          type: 'region',
          points: 25,
          description: 'Regiões com maior potencial de consumo',
          criteria: [
            {
              name: 'Sudeste',
              value: 'sudeste',
              points: 25,
              description: 'Região Sudeste'
            },
            {
              name: 'Sul',
              value: 'sul',
              points: 25,
              description: 'Região Sul'
            }
          ]
        },
        {
          name: 'Regiões de Médio Potencial',
          type: 'region',
          points: 10,
          description: 'Regiões com médio potencial de consumo',
          criteria: [
            {
              name: 'Centro-Oeste',
              value: 'centro-oeste',
              points: 10,
              description: 'Região Centro-Oeste'
            },
            {
              name: 'Nordeste',
              value: 'nordeste',
              points: 10,
              description: 'Região Nordeste'
            }
          ]
        },
        {
          name: 'Capital Social',
          type: 'capital',
          points: 8,
          description: 'Pontuação baseada no capital social',
          criteria: [
            {
              name: 'Alto (>R$ 1M)',
              value: 'high',
              points: 8,
              description: 'Capital social alto'
            },
            {
              name: 'Médio (R$ 100K - 1M)',
              value: 'medium',
              points: 5,
              description: 'Capital social médio'
            },
            {
              name: 'Baixo (R$ 10K - 100K)',
              value: 'low',
              points: 3,
              description: 'Capital social baixo'
            }
          ]
        },
        {
          name: 'Tempo no Mercado',
          type: 'foundation',
          points: 10,
          description: 'Pontuação baseada na data de fundação',
          criteria: [
            {
              name: 'Mais de 10 anos',
              value: '10+',
              points: 10,
              description: 'Empresa estabelecida há mais de 10 anos'
            },
            {
              name: '5-10 anos',
              value: '5-10',
              points: 5,
              description: 'Empresa estabelecida há 5-10 anos'
            },
            {
              name: '2-5 anos',
              value: '2-5',
              points: 3,
              description: 'Empresa estabelecida há 2-5 anos'
            }
          ]
        },
        {
          name: 'Endereço Validado',
          type: 'address',
          points: 12,
          description: 'Bônus para endereço validado',
          criteria: [
            {
              name: 'Endereço Validado',
              value: 'validated',
              points: 12,
              description: 'Endereço validado e confirmado'
            }
          ]
        },
        {
          name: 'Sócios Identificados',
          type: 'partners',
          points: 5,
          description: 'Bônus para sócios identificados',
          criteria: [
            {
              name: 'Sócios Identificados',
              value: 'identified',
              points: 5,
              description: 'Sócios identificados na empresa'
            }
          ]
        }
      ]
    };

    return this.create(defaultConfig);
  }

  /**
   * Mapeia dados do Prisma para interface TypeScript
   */
  private mapToScoringConfig(data: any): ScoringConfig {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      createdBy: data.createdBy,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
      categories: data.categories.map((category: any) => ({
        id: category.id,
        configId: category.configId,
        name: category.name,
        type: category.type,
        points: category.points,
        description: category.description,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
        criteria: category.criteria.map((criteria: any) => ({
          id: criteria.id,
          categoryId: criteria.categoryId,
          name: criteria.name,
          value: criteria.value,
          points: criteria.points,
          description: criteria.description,
          createdAt: criteria.createdAt.toISOString(),
          updatedAt: criteria.updatedAt.toISOString(),
        }))
      }))
    };
  }

  /**
   * Fecha conexão com o banco
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
