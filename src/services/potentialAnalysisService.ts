import {
  CompanyData,
  PotentialClassification,
  FacadeAnalysis,
} from '../types/lead';
import { CnpjApiRateLimiter } from './cnpjApiRateLimiter';

// Interface para a resposta da API CNPJA
interface CnpjaApiResponse {
  updated: string;
  taxId: string;
  alias: string | null;
  founded: string;
  head: boolean;
  company: {
    members: Array<{
      since: string;
      person: {
        id: string;
        type: string;
        name: string;
        taxId: string;
        age: string;
      };
      role: {
        id: number;
        text: string;
      };
    }>;
    id: number;
    name: string;
    equity: number;
    nature: {
      id: number;
      text: string;
    };
    size: {
      id: number;
      acronym: string;
      text: string;
    };
    simples: {
      optant: boolean;
      since: string | null;
    };
    simei: {
      optant: boolean;
      since: string | null;
    };
  };
  statusDate: string;
  status: {
    id: number;
    text: string;
  };
  address: {
    municipality: number;
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    details: string;
    zip: string;
    country: {
      id: number;
      name: string;
    };
  };
  mainActivity: {
    id: number;
    text: string;
  };
  phones: any[];
  emails: any[];
  sideActivities: any[];
  registrations: Array<{
    number: string;
    state: string;
    enabled: boolean;
    statusDate: string;
    status: {
      id: number;
      text: string;
    };
    type: {
      id: number;
      text: string;
    };
  }>;
  suframe: any[];
}

export class PotentialAnalysisService {
  private cnpjApiRateLimiter: CnpjApiRateLimiter;

  constructor() {
    this.cnpjApiRateLimiter = new CnpjApiRateLimiter();
  }

  /**
   * Analisa o potencial de um lead baseado em dados cadastrais
   * 
   * DISTRIBUIÇÃO DE PESOS:
   * - CNAE: 45-25 pontos (fator mais importante - alinhamento com coco ralado)
   * - Capital Social: 3-8 pontos (peso reduzido - dados frequentemente desatualizados)
   * - Região: 10-20 pontos (potencial de consumo regional)
   * - Segmento: 15-25 pontos (tipo de negócio)
   * - Tempo no mercado: 5-15 pontos (estabilidade da empresa)
   */
  analyzePotentialByCompanyData(companyData: CompanyData): PotentialClassification {
    let score = 0;
    const factors: string[] = [];

    // Se não há dados suficientes, usa análise básica
    if (!companyData.cnae && !companyData.capitalSocial && !companyData.marketSegment) {
      return this.analyzeBasicPotential(companyData);
    }

    // Análise do capital social (peso reduzido - dados frequentemente desatualizados)
    if (companyData.capitalSocial) {
      if (companyData.capitalSocial > 1000000) {
        score += 8;
        factors.push('Capital social alto (>R$ 1M)');
      } else if (companyData.capitalSocial > 100000) {
        score += 5;
        factors.push('Capital social médio (R$ 100K - 1M)');
      } else if (companyData.capitalSocial > 10000) {
        score += 3;
        factors.push('Capital social baixo (R$ 10K - 100K)');
      }
    }

    // Análise do CNAE (peso aumentado - fator mais importante para alinhamento)
    if (companyData.cnae) {
      const cnaeScore = this.analyzeCnae(companyData.cnae);
      score += cnaeScore.score;
      if (cnaeScore.factors.length > 0) {
        factors.push(...cnaeScore.factors);
      }
    }

    // Análise da região
    if (companyData.region) {
      const regionScore = this.analyzeRegion(companyData.region);
      score += regionScore.score;
      if (regionScore.factors.length > 0) {
        factors.push(...regionScore.factors);
      }
    }

    // Análise do segmento de mercado
    if (companyData.marketSegment) {
      const segmentScore = this.analyzeMarketSegment(companyData.marketSegment);
      score += segmentScore.score;
      if (segmentScore.factors.length > 0) {
        factors.push(...segmentScore.factors);
      }
    }

    // Análise da data de fundação
    if (companyData.foundationDate) {
      const foundationScore = this.analyzeFoundationDate(companyData.foundationDate);
      score += foundationScore.score;
      if (foundationScore.factors.length > 0) {
        factors.push(...foundationScore.factors);
      }
    }

    // Normaliza o score para 0-100
    score = Math.min(100, Math.max(0, score));

    // Determina o nível de potencial
    let level: 'baixo' | 'médio' | 'alto';
    if (score >= 70) {
      level = 'alto';
    } else if (score >= 40) {
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
   * Análise de potencial básica para o novo formato (dados limitados)
   */
  analyzeBasicPotential(companyData: CompanyData): PotentialClassification {
    let score = 20; // Score base
    const factors: string[] = ['Análise baseada em dados limitados'];

    // Análise da região (peso maior na análise básica)
    if (companyData.region) {
      const regionScore = this.analyzeRegion(companyData.region);
      score += regionScore.score * 1.5; // Peso aumentado
      if (regionScore.factors.length > 0) {
        factors.push(...regionScore.factors);
      }
    }

    // Análise do nome da empresa para inferir tipo de negócio
    const businessTypeScore = this.analyzeCompanyName(companyData.companyName, companyData.tradeName);
    score += businessTypeScore.score;
    if (businessTypeScore.factors.length > 0) {
      factors.push(...businessTypeScore.factors);
    }

    // Normaliza o score para 0-100
    score = Math.min(100, Math.max(0, score));

    // Determina o nível de potencial (com limites mais baixos para dados limitados)
    let level: 'baixo' | 'médio' | 'alto';
    if (score >= 60) {
      level = 'alto';
    } else if (score >= 35) {
      level = 'médio';
    } else {
      level = 'baixo';
    }

    return {
      score,
      level,
      factors,
      confidence: 40, // Confiança menor devido aos dados limitados
    };
  }

  /**
   * Analisa o potencial baseado na análise da fachada
   */
  analyzePotentialByFacade(
    facadeAnalysis: FacadeAnalysis
  ): PotentialClassification {
    let score = 0;
    const factors: string[] = [];

    // Análise do tipo de negócio
    if (facadeAnalysis.businessType) {
      const businessTypeScore = this.analyzeBusinessType(
        facadeAnalysis.businessType
      );
      score += businessTypeScore.score;
      if (businessTypeScore.factors.length > 0) {
        factors.push(...businessTypeScore.factors);
      }
    }

    // Análise do tamanho do estabelecimento
    if (facadeAnalysis.buildingSize) {
      switch (facadeAnalysis.buildingSize) {
        case 'large':
          score += 20;
          factors.push('Estabelecimento grande');
          break;
        case 'medium':
          score += 15;
          factors.push('Estabelecimento médio');
          break;
        case 'small':
          score += 10;
          factors.push('Estabelecimento pequeno');
          break;
      }
    }

    // Análise da aparência comercial
    if (facadeAnalysis.commercialAppearance) {
      score += 15;
      factors.push('Aparência comercial profissional');
    }

    // Normaliza o score para 0-100
    score = Math.min(100, Math.max(0, score));

    // Determina o nível de potencial
    let level: 'baixo' | 'médio' | 'alto';
    if (score >= 70) {
      level = 'alto';
    } else if (score >= 40) {
      level = 'médio';
    } else {
      level = 'baixo';
    }

    return {
      score,
      level,
      factors,
      confidence: facadeAnalysis.confidence,
    };
  }

  /**
   * Combina análises de dados cadastrais e fachada
   */
  combineAnalysis(
    companyDataAnalysis: PotentialClassification,
    facadeAnalysis?: PotentialClassification
  ): PotentialClassification {
    if (!facadeAnalysis) {
      return companyDataAnalysis;
    }

    // Peso: 70% dados cadastrais, 30% análise de fachada
    const combinedScore = Math.round(
      companyDataAnalysis.score * 0.7 + facadeAnalysis.score * 0.3
    );

    // Combina fatores
    const allFactors = [
      ...companyDataAnalysis.factors,
      ...facadeAnalysis.factors,
    ];

    // Determina o nível de potencial
    let level: 'baixo' | 'médio' | 'alto';
    if (combinedScore >= 70) {
      level = 'alto';
    } else if (combinedScore >= 40) {
      level = 'médio';
    } else {
      level = 'baixo';
    }

    // Calcula confiança média ponderada
    const confidence = Math.round(
      companyDataAnalysis.confidence * 0.7 + facadeAnalysis.confidence * 0.3
    );

    return {
      score: combinedScore,
      level,
      factors: allFactors,
      confidence,
    };
  }

  private analyzeCnae(cnae: string): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // CNAEs relacionados a alimentação e varejo têm maior potencial
    const highPotentialCnaes = [
      '4721100', // Comércio varejista de produtos de padaria, laticínio, doces, balas e semelhantes
      '4721102', // Padaria e confeitaria com predominância de revenda
      '4721104', // Comércio varejista de doces, balas, bombons e semelhantes
      '4724500', // Comércio varejista de hortifrutigranjeiros
      '4729699', // Comércio varejista de produtos alimentícios em geral ou especializado em produtos alimentícios não especificados anteriormente
      '4721102', // Padaria e confeitaria com predominância de revenda
      '1091102', // Padaria e confeitaria com predominância de produção própria
      '5611203', // Lanchonetes, casas de chá, de sucos e similares
      '1053800', // Fabricação de sorvetes e outros gelados comestíveis
      '1092900', // Fabricação de biscoitos e bolachas
      '1093701', // Fabricação de produtos derivados do cacau e de chocolates
      '1099602', // Fabricação de pós-alimentícios - misturas para bolos, sobremesas e outros produtos em pó.
      '1099607', // Fabricação de alimentos dietéticos e complementos alimentares
      '1095300', // Fabricação de especiarias, molhos, temperos e condimentos
      '1099699', // Fabricação de outros produtos alimentícios não especificados anteriormente(doces, cocadas, etc)
      '4637199', // Comércio atacadista especializado em outros produtos alimentícios não especificados anteriormente
      '4639701', // Comércio atacadista de produtos alimentícios em geral
      '4691500', // Comércio atacadista de mercadorias em geral, com predominância de produtos alimentícios
    ];

    if (highPotentialCnaes.includes(cnae)) {
      score += 45;        // CNAE de alto potencial = 45 pontos (peso aumentado)
      factors.push('CNAE de alto potencial (alimentação/varejo)');
    } else if (cnae.startsWith('47') || cnae.startsWith('10')) {
      score += 25;        // CNAE relacionado ao setor = 25 pontos (peso aumentado)
      factors.push('CNAE relacionado ao setor alimentício');
    }

    return { score, factors };
  }

  private analyzeRegion(region: string): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Regiões com maior potencial de consumo
    const highPotentialRegions = ['sudeste', 'sul'];
    const mediumPotentialRegions = ['centro-oeste', 'nordeste'];

    const normalizedRegion = region.toLowerCase();

    if (highPotentialRegions.some(r => normalizedRegion.includes(r))) {
      score += 20;
      factors.push('Região de alto potencial de consumo');
    } else if (mediumPotentialRegions.some(r => normalizedRegion.includes(r))) {
      score += 15;
      factors.push('Região de médio potencial de consumo');
    } else {
      score += 10;
      factors.push('Região de baixo potencial de consumo');
    }

    return { score, factors };
  }

  private analyzeMarketSegment(segment: string): {
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;

    const normalizedSegment = segment.toLowerCase();

    if (
      normalizedSegment.includes('varejo') ||
      normalizedSegment.includes('supermercado')
    ) {
      score += 25;
      factors.push('Segmento varejista de alto potencial');
    } else if (
      normalizedSegment.includes('indústria') ||
      normalizedSegment.includes('alimentícia')
    ) {
      score += 20;
      factors.push('Indústria alimentícia');
    } else if (
      normalizedSegment.includes('restaurante') ||
      normalizedSegment.includes('lanchonete')
    ) {
      score += 15;
      factors.push('Estabelecimento de alimentação');
    }

    return { score, factors };
  }

  private analyzeFoundationDate(foundationDate: string): {
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;

    try {
      const foundation = new Date(foundationDate);
      const now = new Date();
      const yearsInBusiness = now.getFullYear() - foundation.getFullYear();

      if (yearsInBusiness > 10) {
        score += 15;
        factors.push('Empresa estabelecida há mais de 10 anos');
      } else if (yearsInBusiness > 5) {
        score += 10;
        factors.push('Empresa estabelecida há 5-10 anos');
      } else if (yearsInBusiness > 2) {
        score += 5;
        factors.push('Empresa estabelecida há 2-5 anos');
      }
    } catch (error) {
      // Data inválida, não adiciona pontos
    }

    return { score, factors };
  }

  private analyzeBusinessType(businessType: string): {
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;

    const normalizedType = businessType.toLowerCase();

    if (
      normalizedType.includes('supermercado') ||
      normalizedType.includes('hipermercado')
    ) {
      score += 25;
      factors.push('Supermercado/Hipermercado');
    } else if (
      normalizedType.includes('padaria') ||
      normalizedType.includes('confeitaria')
    ) {
      score += 20;
      factors.push('Padaria/Confeitaria');
    } else if (
      normalizedType.includes('restaurante') ||
      normalizedType.includes('lanchonete')
    ) {
      score += 15;
      factors.push('Restaurante/Lanchonete');
    } else if (
      normalizedType.includes('indústria') ||
      normalizedType.includes('fábrica')
    ) {
      score += 20;
      factors.push('Indústria/Fábrica');
    }

    return { score, factors };
  }

  /**
   * Analisa o nome da empresa para inferir tipo de negócio
   */
  private analyzeCompanyName(companyName: string, tradeName?: string): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    const fullName = `${companyName} ${tradeName || ''}`.toLowerCase();

    // Palavras-chave que indicam potencial para coco ralado
    const highPotentialKeywords = [
      'supermercado', 'hipermercado', 'mercado', 'varejo',
      'padaria', 'confeitaria', 'doces', 'bolos',
      'restaurante', 'lanchonete', 'alimentacao', 'alimentos',
      'industria', 'fabrica', 'producao',
      'distribuidora', 'atacado', 'comercio'
    ];

    const mediumPotentialKeywords = [
      'cafe', 'bar', 'sorveteria', 'pizzaria',
      'hotel', 'pousada', 'catering',
      'mercearia', 'quitanda', 'emporio'
    ];

    // Verifica palavras de alto potencial
    const highMatches = highPotentialKeywords.filter(keyword => fullName.includes(keyword));
    if (highMatches.length > 0) {
      score += 25;
      factors.push(`Tipo de negócio identificado: ${highMatches.join(', ')}`);
    }

    // Verifica palavras de médio potencial
    const mediumMatches = mediumPotentialKeywords.filter(keyword => fullName.includes(keyword));
    if (mediumMatches.length > 0 && highMatches.length === 0) {
      score += 15;
      factors.push(`Possível segmento relacionado: ${mediumMatches.join(', ')}`);
    }

    // Se não encontrou nada específico
    if (highMatches.length === 0 && mediumMatches.length === 0) {
      score += 5;
      factors.push('Tipo de negócio não identificado pelo nome');
    }

    return { score, factors };
  }

  private calculateConfidence(companyData: CompanyData): number {
    let availableFields = 0;
    const totalFields = 8; // CNPJ, nome, CNAE, capital, fundação, sócios, região, segmento

    if (companyData.cnpj) availableFields++;
    if (companyData.companyName) availableFields++;
    if (companyData.cnae) availableFields++;
    if (companyData.capitalSocial) availableFields++;
    if (companyData.foundationDate) availableFields++;
    if (companyData.partners && companyData.partners.length > 0)
      availableFields++;
    if (companyData.region) availableFields++;
    if (companyData.marketSegment) availableFields++;

    return Math.round((availableFields / totalFields) * 100);
  }

  /**
   * Analisa potencial por CNPJ usando APIs externas
   */
  async analyzePotentialByCnpj(cnpj: string): Promise<any> {
    try {
      console.log(`🔍 Analisando CNPJ ${cnpj}...`);
      
      // Limpar CNPJ (remover caracteres especiais)
      const cleanCnpj = cnpj.replace(/\D/g, '');
      
      // Buscar dados da empresa (implementar integração com Receita Federal ou similar)
      const companyData = await this.fetchCompanyData(cleanCnpj);
      
      if (!companyData) {
        return {
          score: 0,
          level: 'baixo',
          factors: ['CNPJ não encontrado ou inválido'],
          confidence: 0,
        };
      }

      // Analisar potencial baseado nos dados obtidos
      return this.analyzePotentialByCompanyData(companyData);
    } catch (error) {
      console.error(`❌ Erro ao analisar CNPJ ${cnpj}:`, error);
      
      return {
        score: 0,
        level: 'baixo',
        factors: ['Erro na análise do CNPJ'],
        confidence: 0,
      };
    }
  }

  /**
   * Calcula potencial final combinando validação de endereço e análise de CNPJ
   */
  calculateFinalPotential(validatedAddress: any, cnpjAnalysis: any): any {
    let finalScore = cnpjAnalysis.score || 0;
    const factors = [...(cnpjAnalysis.factors || [])];
    
    // Bônus para endereço validado
    if (validatedAddress && validatedAddress.street) {
      finalScore += 10;
      factors.push('Endereço validado com sucesso');
    }
    
    // Bônus para coordenadas precisas
    if (validatedAddress && validatedAddress.coordinates) {
      finalScore += 5;
      factors.push('Coordenadas geográficas precisas');
    }
    
    // Normalizar score final
    finalScore = Math.min(Math.max(finalScore, 0), 100);
    
    // Determinar nível final
    let level: 'baixo' | 'médio' | 'alto';
    if (finalScore >= 70) {
      level = 'alto';
    } else if (finalScore >= 40) {
      level = 'médio';
    } else {
      level = 'baixo';
    }
    
    return {
      score: finalScore,
      level,
      factors,
      confidence: Math.min(cnpjAnalysis.confidence + 20, 100), // Aumenta confiança com validação
    };
  }

  /**
   * Busca dados da empresa por CNPJ usando API gratuita
   * 
   * IMPLEMENTAÇÃO DE RETRY INTELIGENTE:
   * - Máximo de 5 tentativas (aumentado de 3 para 5)
   * - Backoff exponencial: 90s, 180s, 360s, 720s, 1440s
   * - Tratamento específico para rate limit (429)
   * - Retry automático para erros de servidor (5xx)
   * - Logs detalhados de cada tentativa
   * 
   * GARANTIA: Todos os leads serão processados, mesmo com falhas temporárias da API
   */
  public async fetchCompanyData(cnpj: string): Promise<CompanyData | null> {
    const maxRetries = 5; // Aumentado de 3 para 5
    const baseDelay = 90000; // 90 segundos base (1.5 minuto) - aumentado de 60s
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Tentativa ${attempt}/${maxRetries} - Buscando dados da empresa ${cnpj} na API...`);
        
        // Verificar rate limit antes de fazer a consulta
        if (!(await this.cnpjApiRateLimiter.canMakeRequest())) {
          console.log(`⏳ Rate limit atingido para CNPJ ${cnpj}, aguardando...`);
          await this.cnpjApiRateLimiter.waitForAvailability();
        }
        
        // Limpar CNPJ (remover caracteres especiais)
        const cleanCnpj = cnpj.replace(/\D/g, '');
        console.log(`🔍 CNPJ limpo: ${cleanCnpj}`); 
        
        // Fazer requisição para a API gratuita
        const response = await fetch(`https://open.cnpja.com/office/${cleanCnpj}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CocoLitoraneoLeads/1.0'
          }
        });
        
        console.log(`🔍 Resposta da API: ${response.status} para CNPJ ${cnpj}`);
        
        // Verificar se é rate limit (429) - precisa de retry
        if (response.status === 429) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Backoff exponencial: 90s, 180s, 360s, 720s, 1440s
          console.log(`⚠️ Rate limit (429) para CNPJ ${cnpj}. Tentativa ${attempt}/${maxRetries}. Aguardando ${delay/1000}s...`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Tentar novamente
          } else {
            console.error(`❌ Rate limit persistente após ${maxRetries} tentativas para CNPJ ${cnpj}`);
            return null;
          }
        }
        
        // Verificar outros erros HTTP
        if (!response.ok) {
          console.warn(`⚠️ API retornou status ${response.status} para CNPJ ${cnpj}`);
          if (attempt < maxRetries && response.status >= 500) {
            // Erros de servidor podem ser temporários
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`🔄 Erro de servidor (${response.status}). Tentativa ${attempt}/${maxRetries}. Aguardando ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return null;
        }

        // Sucesso! Processar dados
        const apiData = await response.json() as CnpjaApiResponse;
        console.log(`✅ Dados recebidos da API para CNPJ ${cnpj} na tentativa ${attempt}`);

        // Mapear dados da API para nosso formato
        const companyData: CompanyData = {
          cnpj: cleanCnpj,
          companyName: apiData.company?.name || '',
          tradeName: apiData.alias || '',
          cnae: apiData.mainActivity?.id?.toString() || '',
          cnaeDescription: apiData.mainActivity?.text || '',
          capitalSocial: apiData.company?.equity || 0,
          foundationDate: apiData.founded || '',
          partners: apiData.company?.members?.map((member) => ({
            name: member.person?.name || '',
            cpf: member.person?.taxId || '',
            participation: 0, // API não fornece percentual
            role: member.role?.text || ''
          })) || [],
          region: this.extractRegionFromState(apiData.address?.state),
          marketSegment: this.extractMarketSegment(apiData.mainActivity?.text || ''),
        };

        console.log(`📊 Dados mapeados: CNAE ${companyData.cnae}, Capital R$ ${companyData.capitalSocial}`);
        return companyData;

      } catch (error) {
        console.error(`❌ Erro na tentativa ${attempt}/${maxRetries} para CNPJ ${cnpj}:`, error);
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`🔄 Erro de rede. Tentativa ${attempt}/${maxRetries}. Aguardando ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error(`❌ Falha definitiva após ${maxRetries} tentativas para CNPJ ${cnpj}`);
          return null;
        }
      }
    }
    
    return null; // Nunca deve chegar aqui, mas por segurança
  }

  /**
   * Extrai região do estado
   */
  private extractRegionFromState(state: string): string {
    const regions: { [key: string]: string } = {
      'SP': 'sudeste', 'RJ': 'sudeste', 'MG': 'sudeste', 'ES': 'sudeste',
      'RS': 'sul', 'SC': 'sul', 'PR': 'sul',
      'BA': 'nordeste', 'PE': 'nordeste', 'CE': 'nordeste', 'MA': 'nordeste',
      'PB': 'nordeste', 'RN': 'nordeste', 'AL': 'nordeste', 'SE': 'nordeste', 'PI': 'nordeste',
      'GO': 'centro-oeste', 'MT': 'centro-oeste', 'MS': 'centro-oeste', 'DF': 'centro-oeste',
      'AM': 'norte', 'PA': 'norte', 'AC': 'norte', 'RO': 'norte', 'RR': 'norte', 'AP': 'norte', 'TO': 'norte'
    };
    return regions[state] || 'não informado';
  }

  /**
   * Extrai segmento de mercado baseado no CNAE
   */
  private extractMarketSegment(cnaeText: string): string {
    const lowerText = cnaeText.toLowerCase();
    
    if (lowerText.includes('padaria') || lowerText.includes('confeitaria') || lowerText.includes('panificadora')) {
      return 'padaria';
    } else if (lowerText.includes('supermercado') || lowerText.includes('varejo') || lowerText.includes('comércio')) {
      return 'varejo';
    } else if (lowerText.includes('restaurante') || lowerText.includes('lanchonete') || lowerText.includes('bar')) {
      return 'alimentação';
    } else if (lowerText.includes('indústria') || lowerText.includes('fabricação') || lowerText.includes('produção')) {
      return 'indústria';
    } else {
      return 'outros';
    }
  }

  /**
   * Obtém informações sobre o rate limit da API de CNPJ
   */
  public async getCnpjApiRateLimitInfo(): Promise<{
    remaining: number;
    resetTime: number;
    isBlocked: boolean;
  }> {
    return await this.cnpjApiRateLimiter.getRateLimitInfo();
  }

  /**
   * Fecha conexões do rate limiter
   */
  public async close(): Promise<void> {
    await this.cnpjApiRateLimiter.close();
  }
}
