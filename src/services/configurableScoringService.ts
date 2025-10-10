import { ScoringConfigRepository } from '../repositories/scoringConfigRepository';
import { CompanyData, PotentialClassification } from '../types/lead';

export class ConfigurableScoringService {
  private scoringConfigRepository: ScoringConfigRepository;

  constructor() {
    this.scoringConfigRepository = new ScoringConfigRepository();
  }

  /**
   * Analisa o potencial usando a configuração ativa do banco de dados
   */
  async analyzePotentialByCompanyData(companyData: CompanyData): Promise<PotentialClassification> {
    // Buscar configuração ativa
    let config = await this.scoringConfigRepository.findActive();
    
    // Se não há configuração ativa, retornar pontuação zero com mensagem
    if (!config) {
      return {
        score: 0,
        level: 'baixo',
        factors: ['Nenhuma configuração de pontuação ativa'],
        confidence: 0,
      };
    }

    let score = 0;
    const factors: string[] = [];

    // Analisar cada categoria da configuração
    for (const category of config.categories) {
      const categoryScore = this.analyzeCategory(category, companyData);
      score += categoryScore.score;
      if (categoryScore.factors.length > 0) {
        factors.push(...categoryScore.factors);
      }
    }

    // Normaliza o score para 0-100
    score = Math.min(100, Math.max(0, score));

    // Determina o nível de potencial
    let level: 'baixo' | 'médio' | 'alto';
    if (score >= 80) {
      level = 'alto';
    } else if (score >= 50) {
      level = 'médio';
    } else {
      level = 'baixo';
    }

    // Calcula confiança baseada na quantidade de dados disponíveis
    const confidence = this.calculateConfidence(companyData);

    return {
      score,
      level,
      factors,
      confidence,
    };
  }

  /**
   * Analisa uma categoria específica
   */
  private analyzeCategory(category: any, companyData: CompanyData): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    switch (category.type) {
      case 'cnae':
        score = this.analyzeCnaeCategory(category, companyData.cnae);
        if (score > 0) {
          factors.push(`${category.name}: ${score} pontos`);
        }
        break;

      case 'region':
        score = this.analyzeRegionCategory(category, companyData.region || companyData.validatedState);
        if (score > 0) {
          factors.push(`${category.name}: ${score} pontos`);
        }
        break;

      case 'capital':
        score = this.analyzeCapitalCategory(category, companyData.capitalSocial);
        if (score > 0) {
          factors.push(`${category.name}: ${score} pontos`);
        }
        break;

      case 'foundation':
        score = this.analyzeFoundationCategory(category, companyData.foundationDate);
        if (score > 0) {
          factors.push(`${category.name}: ${score} pontos`);
        }
        break;

      case 'address':
        score = this.analyzeAddressCategory(category, companyData.addressValidated);
        if (score > 0) {
          factors.push(`${category.name}: ${score} pontos`);
        }
        break;

      case 'partners':
        score = this.analyzePartnersCategory(category, companyData.partners);
        if (score > 0) {
          factors.push(`${category.name}: ${score} pontos`);
        }
        break;

      case 'custom':
        // Categoria customizada - pode ser implementada conforme necessário
        break;
    }

    return { score, factors };
  }

  /**
   * Analisa categoria de CNAE
   */
  private analyzeCnaeCategory(category: any, cnae?: string): number {
    if (!cnae) return 0;

    // Buscar critério que corresponde ao CNAE
    const matchingCriteria = category.criteria.find((criteria: any) => criteria.value === cnae);
    if (matchingCriteria) {
      return matchingCriteria.points;
    }

    // Se não encontrou critério específico, retornar 0 (não pontuar)
    return 0;
  }

  /**
   * Analisa categoria de região
   */
  private analyzeRegionCategory(category: any, region?: string): number {
    if (!region) return 0;

    // Mapeamento de estados para regiões
    const stateToRegion: { [key: string]: string } = {
      'SP': 'sudeste',
      'RJ': 'sudeste', 
      'MG': 'sudeste',
      'ES': 'sudeste',
      'RS': 'sul',
      'SC': 'sul',
      'PR': 'sul',
      'GO': 'centro-oeste',
      'MT': 'centro-oeste',
      'MS': 'centro-oeste',
      'DF': 'centro-oeste',
      'BA': 'nordeste',
      'PE': 'nordeste',
      'CE': 'nordeste',
      'PB': 'nordeste',
      'RN': 'nordeste',
      'AL': 'nordeste',
      'SE': 'nordeste',
      'MA': 'nordeste',
      'PI': 'nordeste',
      'TO': 'norte',
      'PA': 'norte',
      'AP': 'norte',
      'AM': 'norte',
      'AC': 'norte',
      'RO': 'norte',
      'RR': 'norte'
    };

    // Converter estado para região
    const regionValue = stateToRegion[region.toUpperCase()];
    
    if (!regionValue) {
      return 0;
    }

    // Buscar critério que corresponde à região
    const matchingCriteria = category.criteria.find((criteria: any) => 
      criteria.value.toLowerCase() === regionValue.toLowerCase()
    );
    
    if (matchingCriteria) {
      return matchingCriteria.points;
    }

    return 0;
  }

  /**
   * Analisa categoria de capital social
   */
  private analyzeCapitalCategory(category: any, capitalSocial?: number): number {
    if (!capitalSocial) return 0;

    let value = '';
    if (capitalSocial > 1000000) {
      value = 'high';
    } else if (capitalSocial > 100000) {
      value = 'medium';
    } else if (capitalSocial > 10000) {
      value = 'low';
    } else {
      value = 'very_low';
    }

    // Buscar critério que corresponde ao valor
    const matchingCriteria = category.criteria.find((criteria: any) => criteria.value === value);
    if (matchingCriteria) {
      return matchingCriteria.points;
    }

    return 0;
  }

  /**
   * Analisa categoria de data de fundação
   */
  private analyzeFoundationCategory(category: any, foundationDate?: string): number {
    if (!foundationDate) return 0;

    try {
      const foundation = new Date(foundationDate);
      const now = new Date();
      const yearsInBusiness = now.getFullYear() - foundation.getFullYear();

      let value = '';
      if (yearsInBusiness > 10) {
        value = '10+';
      } else if (yearsInBusiness > 5) {
        value = '5-10';
      } else if (yearsInBusiness > 2) {
        value = '2-5';
      } else {
        value = '0-2';
      }

      // Buscar critério que corresponde ao valor
      const matchingCriteria = category.criteria.find((criteria: any) => criteria.value === value);
      if (matchingCriteria) {
        return matchingCriteria.points;
      }
    } catch (error) {
      // Data inválida
    }

    return 0;
  }

  /**
   * Analisa categoria de endereço
   */
  private analyzeAddressCategory(category: any, addressValidated?: boolean): number {
    if (!addressValidated) return 0;

    const matchingCriteria = category.criteria.find((criteria: any) => criteria.value === 'validated');
    if (matchingCriteria) {
      return matchingCriteria.points;
    }

    return category.points;
  }

  /**
   * Analisa categoria de sócios
   */
  private analyzePartnersCategory(category: any, partners?: any[]): number {
    if (!partners || partners.length === 0) return 0;

    const matchingCriteria = category.criteria.find((criteria: any) => criteria.value === 'identified');
    if (matchingCriteria) {
      return matchingCriteria.points;
    }

    return category.points;
  }

  /**
   * Calcula confiança baseada na quantidade de dados disponíveis
   */
  private calculateConfidence(companyData: CompanyData): number {
    let availableFields = 0;
    const totalFields = 8;

    if (companyData.cnpj) availableFields++;
    if (companyData.cnae) availableFields++;
    if (companyData.capitalSocial) availableFields++;
    if (companyData.foundationDate) availableFields++;
    if (companyData.partners && companyData.partners.length > 0) availableFields++;
    if (companyData.region || companyData.validatedState) availableFields++;
    if (companyData.addressValidated) availableFields++;
    if (companyData.validatedCoordinates || companyData.coordinates) availableFields++;

    return Math.round((availableFields / totalFields) * 100);
  }

  /**
   * Retorna os detalhes da pontuação para exibição no frontend
   */
  async getPotentialScoreDetails(data: {
    cnpj?: string;
    companyName?: string;
    cnae?: string;
    capitalSocial?: number;
    foundationDate?: string;
    partners?: any[];
    region?: string;
    addressValidated?: boolean;
    coordinates?: string;
    validatedState?: string;
    validatedCoordinates?: boolean;
  }): Promise<{
    totalScore: number;
    level: 'baixo' | 'médio' | 'alto';
    factors: Array<{ factor: string; points: number; description: string }>;
    confidence: number;
  }> {
    // Buscar configuração ativa
    let config = await this.scoringConfigRepository.findActive();
    
    if (!config) {
      return {
        totalScore: 0,
        level: 'baixo',
        factors: [{ 
          factor: 'Configuração', 
          points: 0, 
          description: 'Nenhuma configuração de pontuação ativa' 
        }],
        confidence: 0,
      };
    }

    const factors: Array<{ factor: string; points: number; description: string }> = [];
    let totalScore = 0;

    // Analisar cada categoria
    for (const category of config.categories) {
      const categoryScore = this.analyzeCategory(category, data as CompanyData);
      
      if (categoryScore.score > 0) {
        factors.push({
          factor: category.name,
          points: categoryScore.score,
          description: category.description || `Pontuação da categoria ${category.name}`
        });
        totalScore += categoryScore.score;
      }
    }

    totalScore = Math.min(100, Math.max(0, totalScore));

    let level: 'baixo' | 'médio' | 'alto';
    if (totalScore >= 80) {
      level = 'alto';
    } else if (totalScore >= 50) {
      level = 'médio';
    } else {
      level = 'baixo';
    }

    const confidence = this.calculateConfidence(data as CompanyData);

    return {
      totalScore,
      level,
      factors,
      confidence,
    };
  }

  /**
   * Busca a configuração ativa
   */
  async getActiveConfig() {
    let config = await this.scoringConfigRepository.findActive();
    
    if (!config) {
      // Verificar se já existe uma configuração padrão antes de criar
      const allConfigs = await this.scoringConfigRepository.findAll();
      const defaultConfig = allConfigs.find(c => c.name === 'Configuração Padrão');
      
      if (defaultConfig) {
        // Se existe uma configuração padrão mas não está ativa, ativá-la
        config = await this.scoringConfigRepository.activate(defaultConfig.id);
      } else {
        // Se não existe nenhuma configuração, criar a padrão
        config = await this.scoringConfigRepository.createDefaultConfig();
      }
    }

    return config;
  }

  /**
   * Busca todas as configurações
   */
  async getAllConfigs() {
    return await this.scoringConfigRepository.findAll();
  }

  /**
   * Cria uma nova configuração
   */
  async createConfig(data: any, userId?: string) {
    return await this.scoringConfigRepository.create(data, userId);
  }

  /**
   * Atualiza uma configuração
   */
  async updateConfig(id: string, data: any) {
    return await this.scoringConfigRepository.update(id, data);
  }

  /**
   * Remove uma configuração
   */
  async deleteConfig(id: string) {
    return await this.scoringConfigRepository.delete(id);
  }

  /**
   * Ativa uma configuração
   */
  async activateConfig(id: string) {
    return await this.scoringConfigRepository.activate(id);
  }

  /**
   * Recalcula pontuações de todos os leads processados
   * Usado quando configurações são alteradas ou excluídas
   */
  async recalculateAllLeadScores(): Promise<{ updated: number; errors: number }> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      console.log('🔄 Iniciando recálculo de pontuações para todos os leads...');
      
      // Buscar todos os leads processados
      const leads = await prisma.lead.findMany({
        where: { status: 'processado' },
        select: {
          id: true,
          cnpj: true,
          cnae: true,
          cnaeDescription: true,
          capitalSocial: true,
          foundationDate: true,
          validatedState: true,
          addressValidated: true,
          validatedCoordinates: true,
          partners: true,
        }
      });

      console.log(`📊 ${leads.length} leads encontrados para recálculo`);

      let updated = 0;
      let errors = 0;

      // Processar leads em lotes para evitar sobrecarga
      const batchSize = 50;
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        
        for (const lead of batch) {
          try {
            // Converter dados do lead para o formato CompanyData
            const companyData: CompanyData = {
              cnpj: lead.cnpj,
              companyName: '', // Não usado no cálculo
              cnae: lead.cnae || '',
              cnaeDescription: lead.cnaeDescription || '',
              capitalSocial: lead.capitalSocial || 0,
              foundationDate: lead.foundationDate ? lead.foundationDate.toISOString().split('T')[0] : '',
              region: lead.validatedState || '',
              addressValidated: lead.addressValidated || false,
              validatedCoordinates: !!lead.validatedCoordinates,
              partners: lead.partners ? JSON.parse(JSON.stringify(lead.partners)) : [],
            };

            // Calcular nova pontuação
            const newScore = await this.analyzePotentialByCompanyData(companyData);

            // Atualizar lead no banco
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                potentialScore: newScore.score,
                potentialLevel: newScore.level,
                potentialFactors: newScore.factors,
                potentialConfidence: newScore.confidence,
                updatedAt: new Date(),
              }
            });

            updated++;
            
            if (updated % 100 === 0) {
              console.log(`✅ ${updated} leads atualizados...`);
            }
          } catch (error) {
            console.error(`❌ Erro ao recalcular lead ${lead.id}:`, error);
            errors++;
          }
        }

        // Pequena pausa entre lotes para não sobrecarregar o banco
        if (i + batchSize < leads.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Recálculo concluído: ${updated} leads atualizados, ${errors} erros`);
      return { updated, errors };
    } catch (error) {
      console.error('❌ Erro no recálculo em massa:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Fecha conexões
   */
  async close(): Promise<void> {
    await this.scoringConfigRepository.close();
  }
}
