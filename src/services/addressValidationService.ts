import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Address } from '../types/lead';

export class AddressValidationService {
  private readonly viaCepBaseUrl: string;
  private readonly googleMapsApiKey: string | undefined;
  private prisma: PrismaClient;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1000; // 1 segundo entre requisições

  constructor() {
    this.viaCepBaseUrl =
      process.env.VIACEP_BASE_URL || 'https://viacep.com.br/ws';
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.prisma = new PrismaClient();
  }

  /**
   * Valida e corrige um endereço usando ViaCEP com rate limiting
   */
  async validateAddress(address: Partial<Address>): Promise<Address> {
    try {
      if (!address.zipCode) {
        throw new Error('CEP é obrigatório para validação');
      }

      // Extrair número do endereço se não foi fornecido
      if (!address.number && address.street) {
        address.number = this.extractNumberFromAddress(address.street);
        // Se encontrou número, limpar a rua
        if (address.number) {
          address.street = this.extractStreetFromAddress(address.street);
        }
      }

      // Verifica cache primeiro
      const cachedCep = await this.prisma.cepCache.findFirst({
        where: {
          cep: address.zipCode,
          expiresAt: {
            gt: new Date(),
          },
        },
      });
      if (cachedCep) {
        console.log(`📋 CEP ${address.zipCode} encontrado no cache do banco`);
        return this.buildAddressFromCep(cachedCep.data, address);
      }

      // Rate limiting: aguarda intervalo mínimo entre requisições
      await this.enforceRateLimit();

      // Busca informações do CEP
      const cepInfo = await this.getCepInfo(address.zipCode);

      // Busca coordenadas se tiver API key do Google
      let coordinates: { latitude: number; longitude: number } | undefined;
      if (this.googleMapsApiKey && cepInfo) {
        coordinates = await this.getCoordinates(cepInfo);
      }

      const result = this.buildAddressFromCep(cepInfo, address, coordinates);
      return result;
    } catch (error) {
      console.error('Erro na validação de endereço:', error);
      
      // Fallback: usa dados fornecidos sem validação
      console.log(`⚠️ Usando dados fornecidos como fallback para CEP ${address.zipCode}`);
      return this.buildAddressFromFallback(address);
    }
  }

  /**
   * Valida múltiplos endereços com rate limiting inteligente
   */
  async validateAddressesBatch(addresses: Partial<Address>[]): Promise<Address[]> {
    const results: Address[] = [];
    
    for (let i = 0; i < addresses.length; i++) {
      try {
        const address = addresses[i];
        if (!address.zipCode) {
          results.push(this.buildAddressFromFallback(address));
          continue;
        }

        // Verifica cache primeiro
        const cachedCep = await this.prisma.cepCache.findFirst({
          where: {
            cep: address.zipCode,
            expiresAt: {
              gt: new Date(),
            },
          },
        });
        if (cachedCep) {
          results.push(this.buildAddressFromCep(cachedCep.data, address));
          continue;
        }

        // Rate limiting: aguarda intervalo mínimo entre requisições
        await this.enforceRateLimit();

        // Busca informações do CEP
        const cepInfo = await this.getCepInfo(address.zipCode);
        
        // Busca coordenadas se tiver API key do Google
        let coordinates: { latitude: number; longitude: number } | undefined;
        if (this.googleMapsApiKey && cepInfo) {
          coordinates = await this.getCoordinates(cepInfo);
        }

        results.push(this.buildAddressFromCep(cepInfo, address, coordinates));
        
        // Log de progresso para lotes grandes
        if (addresses.length > 10 && (i + 1) % 5 === 0) {
          console.log(`📊 Processados ${i + 1}/${addresses.length} endereços`);
        }
      } catch (error) {
        console.error(`❌ Erro ao validar endereço ${i + 1}:`, error);
        // Fallback: usa dados fornecidos
        results.push(this.buildAddressFromFallback(addresses[i]));
      }
    }
    
    return results;
  }

  /**
   * Enforce rate limiting entre requisições
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Aguardando ${waitTime}ms para respeitar rate limit do ViaCEP`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Busca informações do CEP usando ViaCEP
   */
  private async getCepInfo(cep: string): Promise<any> {
    const cleanCep = cep.replace(/\D/g, '');
    
    // Verifica se já está no cache do banco
    const cachedCep = await this.prisma.cepCache.findFirst({
      where: {
        cep: cleanCep,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (cachedCep) {
      console.log(`📋 CEP ${cleanCep} encontrado no cache do banco`);
      return cachedCep.data;
    }

    console.log(`🔍 Buscando CEP ${cleanCep} no ViaCEP...`);
    
    try {
      const response = await axios.get(`${this.viaCepBaseUrl}/${cleanCep}/json`, {
        timeout: 10000
      });
      
      if (response.data.erro) {
        throw new Error('CEP não encontrado');
      }

      // Salva no cache do banco (expira em 24 horas)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.prisma.cepCache.upsert({
        where: { cep: cleanCep },
        update: {
          data: response.data,
          expiresAt,
        },
        create: {
          cep: cleanCep,
          data: response.data,
          expiresAt,
        },
      });

      console.log(`✅ CEP ${cleanCep} validado e cacheado no banco`);
      
      return response.data;
    } catch (error) {
      console.error(`❌ Erro ao buscar CEP ${cep}:`, error);
      
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        console.log(`🚫 Possível bloqueio por rate limiting do ViaCEP para CEP ${cep}`);
      }
      
      return null;
    }
  }

  /**
   * Extrai número do endereço de um campo de endereço completo
   */
  private extractNumberFromAddress(addressField: string): string {
    if (!addressField) return '';
    
    // Padrões comuns para números de endereço
    const numberPatterns = [
      /(\d+)/,                    // Qualquer número
      /n[º°]?\s*(\d+)/i,         // Nº, N°, N, seguido de número
      /número\s*(\d+)/i,          // "número" seguido de número
      /(\d+)\s*-\s*[a-zA-Z]/,    // Número seguido de hífen e letra
      /[a-zA-Z]\s*(\d+)/,        // Letra seguida de número
    ];
    
    for (const pattern of numberPatterns) {
      const match = addressField.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Busca por números no final do endereço (padrão mais comum)
    const endNumberMatch = addressField.match(/(\d+)\s*$/);
    if (endNumberMatch) {
      return endNumberMatch[1];
    }
    
    // Busca por números no início do endereço
    const startNumberMatch = addressField.match(/^(\d+)/);
    if (startNumberMatch) {
      return startNumberMatch[1];
    }
    
    return '';
  }

  /**
   * Extrai rua limpa (sem número) de um campo de endereço completo
   */
  private extractStreetFromAddress(addressField: string): string {
    if (!addressField) return '';
    
    // Remove números e padrões comuns de endereço
    let cleanStreet = addressField
      .replace(/\d+/g, '')                    // Remove números
      .replace(/n[º°]?\s*/gi, '')             // Remove Nº, N°, N
      .replace(/número\s*/gi, '')             // Remove "número"
      .replace(/,\s*$/g, '')                  // Remove vírgula no final
      .replace(/^\s*,\s*/g, '')               // Remove vírgula no início
      .replace(/\s+/g, ' ')                   // Normaliza espaços
      .trim();
    
    return cleanStreet;
  }

  /**
   * Constrói endereço a partir dos dados do CEP
   */
  private buildAddressFromCep(cepInfo: any, originalAddress: Partial<Address>, coordinates?: { latitude: number; longitude: number }): Address {
    return {
      street: cepInfo?.logradouro || originalAddress.street || '',
      number: originalAddress.number || '', // Número extraído do endereço original
      complement: originalAddress.complement || '',
      neighborhood: cepInfo?.bairro || originalAddress.neighborhood || '',
      city: cepInfo?.localidade || originalAddress.city || '',
      state: cepInfo?.uf || originalAddress.state || '',
      zipCode: originalAddress.zipCode || '',
      coordinates,
    };
  }

  /**
   * Constrói endereço usando dados fornecidos (fallback)
   */
  private buildAddressFromFallback(address: Partial<Address>): Address {
    return {
      street: address.street || '',
      number: address.number || '',
      complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      coordinates: address.coordinates,
    };
  }

  /**
   * Busca coordenadas geográficas usando Google Maps Geocoding API
   */
  private async getCoordinates(
    addressInfo: any
  ): Promise<{ latitude: number; longitude: number } | undefined> {
    if (!this.googleMapsApiKey) {
      return undefined;
    }

    try {
      const address = `${addressInfo.logradouro}, ${addressInfo.localidade}, ${addressInfo.uf}, ${addressInfo.cep}`;
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleMapsApiKey}`,
        { timeout: 10000 }
      );

      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
    }

    return undefined;
  }

  /**
   * Verifica se um endereço é válido
   */
  isAddressValid(address: Address): boolean {
    return !!(
      address.street &&
      address.city &&
      address.state &&
      address.zipCode &&
      address.zipCode.replace(/\D/g, '').length === 8
    );
  }

  /**
   * Formata endereço para exibição
   */
  formatAddress(address: Address): string {
    const parts = [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      address.city,
      address.state,
      address.zipCode,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Limpa o cache de CEPs expirados
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const deleted = await this.prisma.cepCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      console.log(`🧹 ${deleted.count} CEPs expirados removidos do cache`);
    } catch (error) {
      console.error('Erro ao limpar cache expirado:', error);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  async getCacheStats(): Promise<{ total: number; expired: number }> {
    try {
      const total = await this.prisma.cepCache.count();
      const expired = await this.prisma.cepCache.count({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      
      return { total, expired };
    } catch (error) {
      console.error('Erro ao obter estatísticas do cache:', error);
      return { total: 0, expired: 0 };
    }
  }


}
