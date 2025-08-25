import { ILeadRepository, Lead, LeadFilters } from '../types/lead';
import { promises as fs } from 'fs';
import path from 'path';

export class JsonFileRepository implements ILeadRepository {
  private leads: Map<string, Lead> = new Map();
  private cnpjIndex: Map<string, string> = new Map(); // CNPJ -> Lead ID
  private nextId: number = 1;
  private readonly dataFilePath: string;
  private readonly cnpjIndexPath: string;

  constructor() {
    this.dataFilePath = path.join(process.cwd(), 'data', 'leads.json');
    this.cnpjIndexPath = path.join(process.cwd(), 'data', 'cnpj_index.json');
    this.initializeDataDirectory();
  }

  private async initializeDataDirectory(): Promise<void> {
    try {
      const dataDir = path.dirname(this.dataFilePath);
      await fs.mkdir(dataDir, { recursive: true });
      await this.loadFromFile();
      console.log(`📁 Repositório JSON inicializado: ${this.dataFilePath}`);
      console.log(`📊 Total de leads carregados: ${this.leads.size}`);
      console.log(`🔍 Índice de CNPJs: ${this.cnpjIndex.size} entradas`);
    } catch (error) {
      console.log('📥 Arquivo de dados não encontrado, iniciando com dados vazios');
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      // Carrega leads
      const data = await fs.readFile(this.dataFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.leads = new Map(parsed.leads || []);
      this.nextId = parsed.nextId || 1;

      // Reconstrói índice de CNPJs
      this.rebuildCnpjIndex();

      // Carrega índice de CNPJs se existir
      try {
        const indexData = await fs.readFile(this.cnpjIndexPath, 'utf-8');
        const parsedIndex = JSON.parse(indexData);
        this.cnpjIndex = new Map(parsedIndex);
      } catch {
        // Índice não existe, reconstrói
        this.rebuildCnpjIndex();
        await this.saveCnpjIndex();
      }
    } catch (error) {
      // Arquivo não existe ou está corrompido, inicia com dados vazios
      this.leads = new Map();
      this.nextId = 1;
      this.cnpjIndex = new Map();
    }
  }

  private rebuildCnpjIndex(): void {
    this.cnpjIndex.clear();
    for (const [id, lead] of this.leads) {
      if (lead.companyData.cnpj) {
        this.cnpjIndex.set(lead.companyData.cnpj, id);
      }
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const data = {
        leads: Array.from(this.leads.entries()),
        nextId: this.nextId
      };
      await fs.writeFile(this.dataFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Erro ao salvar arquivo de leads:', error);
    }
  }

  private async saveCnpjIndex(): Promise<void> {
    try {
      const indexData = Array.from(this.cnpjIndex.entries());
      await fs.writeFile(this.cnpjIndexPath, JSON.stringify(indexData, null, 2));
    } catch (error) {
      console.error('❌ Erro ao salvar índice de CNPJs:', error);
    }
  }

  /**
   * Verifica se um CNPJ já existe
   */
  async cnpjExists(cnpj: string): Promise<boolean> {
    return this.cnpjIndex.has(cnpj);
  }

  /**
   * Busca lead por CNPJ
   */
  async findByCnpj(cnpj: string): Promise<Lead | null> {
    const leadId = this.cnpjIndex.get(cnpj);
    if (!leadId) return null;
    return this.leads.get(leadId) || null;
  }

  /**
   * Cria lead com verificação de duplicação
   */
  async create(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    // Verifica se CNPJ já existe
    if (lead.companyData.cnpj && await this.cnpjExists(lead.companyData.cnpj)) {
      throw new Error(`Lead com CNPJ ${lead.companyData.cnpj} já existe`);
    }

    const newLead: Lead = {
      ...lead,
      id: this.nextId.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.nextId++;
    this.leads.set(newLead.id, newLead);
    
    // Adiciona ao índice de CNPJs
    if (newLead.companyData.cnpj) {
      this.cnpjIndex.set(newLead.companyData.cnpj, newLead.id);
    }
    
    await this.saveToFile();
    await this.saveCnpjIndex();
    
    return newLead;
  }

  /**
   * Cria ou atualiza lead (upsert)
   */
  async createOrUpdate(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    if (!lead.companyData.cnpj) {
      return this.create(lead);
    }

    const existingLead = await this.findByCnpj(lead.companyData.cnpj);
    if (existingLead) {
      // Atualiza lead existente
      const updatedLead: Lead = {
        ...existingLead,
        ...lead,
        updatedAt: new Date().toISOString()
      };
      
      this.leads.set(existingLead.id, updatedLead);
      await this.saveToFile();
      return updatedLead;
    } else {
      // Cria novo lead
      return this.create(lead);
    }
  }

  /**
   * Processa leads em lote com deduplicação
   */
  async processBatch(leads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      total: leads.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    console.log(`🔄 Processando lote de ${leads.length} leads...`);

    for (let i = 0; i < leads.length; i++) {
      try {
        const lead = leads[i];
        
        if (!lead.companyData.cnpj) {
          result.errors.push(`Lead ${i + 1}: CNPJ não informado`);
          continue;
        }

        // Verifica se já existe
        if (await this.cnpjExists(lead.companyData.cnpj)) {
          result.skipped++;
          if (i % 100 === 0) {
            console.log(`⏭️  Skipped ${i + 1}/${leads.length} (CNPJ já existe)`);
          }
          continue;
        }

        // Cria novo lead
        await this.create(lead);
        result.created++;
        
        // Log de progresso para lotes grandes
        if (leads.length > 1000 && (i + 1) % 100 === 0) {
          console.log(`✅ Processados ${i + 1}/${leads.length} leads`);
          // Salva checkpoint a cada 100 leads
          await this.saveToFile();
          await this.saveCnpjIndex();
        }
      } catch (error) {
        const errorMsg = `Lead ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Salva final
    await this.saveToFile();
    await this.saveCnpjIndex();

    console.log(`✅ Lote processado: ${result.created} criados, ${result.updated} atualizados, ${result.skipped} ignorados`);
    
    return result;
  }

  /**
   * Obtém estatísticas de processamento
   */
  async getProcessingStats(): Promise<{
    total: number;
    uniqueCnpjs: number;
    duplicates: number;
    lastProcessed: string | null;
  }> {
    const total = this.leads.size;
    const uniqueCnpjs = this.cnpjIndex.size;
    const duplicates = total - uniqueCnpjs;
    
    let lastProcessed: string | null = null;
    if (total > 0) {
      const leadsArray = Array.from(this.leads.values());
      leadsArray.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      lastProcessed = leadsArray[0].updatedAt;
    }

    return {
      total,
      uniqueCnpjs,
      duplicates,
      lastProcessed
    };
  }

  async findById(id: string): Promise<Lead | null> {
    return this.leads.get(id) || null;
  }

  async findAll(filters?: LeadFilters): Promise<Lead[]> {
    let results = Array.from(this.leads.values());

    if (filters) {
      results = results.filter(lead => {
        if (filters.status && lead.status !== filters.status) return false;
        if (filters.potentialLevel && lead.potential.level !== filters.potentialLevel) return false;
        if (filters.city && lead.address.city !== filters.city) return false;
        if (filters.state && lead.address.state !== filters.state) return false;
        if (filters.industry && lead.businessInfo.industry !== filters.industry) return false;
        return true;
      });
    }

    return results;
  }

  async update(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const lead = this.leads.get(id);
    if (!lead) return null;

    const updatedLead: Lead = { 
      ...lead, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    this.leads.set(id, updatedLead);
    
    // Atualiza índice de CNPJs se necessário
    if (updates.companyData?.cnpj && updates.companyData.cnpj !== lead.companyData.cnpj) {
      // Remove CNPJ antigo
      if (lead.companyData.cnpj) {
        this.cnpjIndex.delete(lead.companyData.cnpj);
      }
      // Adiciona novo CNPJ
      this.cnpjIndex.set(updates.companyData.cnpj, id);
    }
    
    await this.saveToFile();
    await this.saveCnpjIndex();
    
    return updatedLead;
  }

  async delete(id: string): Promise<boolean> {
    const lead = this.leads.get(id);
    if (!lead) return false;

    // Remove do índice de CNPJs
    if (lead.companyData.cnpj) {
      this.cnpjIndex.delete(lead.companyData.cnpj);
    }

    const deleted = this.leads.delete(id);
    if (deleted) {
      await this.saveToFile();
      await this.saveCnpjIndex();
    }
    return deleted;
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPotentialLevel: Record<string, number>;
    byRegion: Record<string, number>;
  }> {
    const leads = Array.from(this.leads.values());
    
    const byStatus: Record<string, number> = {};
    const byPotential: Record<string, number> = {};
    const byRegion: Record<string, number> = {};

    leads.forEach(lead => {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      byPotential[lead.potential.level] = (byPotential[lead.potential.level] || 0) + 1;
      if (lead.companyData.region) {
        byRegion[lead.companyData.region] = (byRegion[lead.companyData.region] || 0) + 1;
      }
    });

    return {
      total: leads.length,
      byStatus,
      byPotentialLevel: byPotential,
      byRegion
    };
  }

  async forceSave(): Promise<void> {
    await this.saveToFile();
    await this.saveCnpjIndex();
  }

  async reload(): Promise<void> {
    await this.loadFromFile();
  }

  /**
   * Limpa dados duplicados
   */
  async cleanupDuplicates(): Promise<number> {
    const cnpjCounts = new Map<string, string[]>();
    
    // Conta ocorrências de cada CNPJ
    for (const [id, lead] of this.leads) {
      if (lead.companyData.cnpj) {
        if (!cnpjCounts.has(lead.companyData.cnpj)) {
          cnpjCounts.set(lead.companyData.cnpj, []);
        }
        cnpjCounts.get(lead.companyData.cnpj)!.push(id);
      }
    }

    let duplicatesRemoved = 0;
    
    // Remove duplicatas, mantendo o mais recente
    for (const [_cnpj, ids] of cnpjCounts) {
      if (ids.length > 1) {
        // Ordena por data de atualização (mais recente primeiro)
        const leads = ids.map(id => this.leads.get(id)!);
        leads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        // Remove duplicatas, mantendo apenas o primeiro (mais recente)
        for (let i = 1; i < leads.length; i++) {
          this.leads.delete(leads[i].id);
          duplicatesRemoved++;
        }
      }
    }

    if (duplicatesRemoved > 0) {
      this.rebuildCnpjIndex();
      await this.saveToFile();
      await this.saveCnpjIndex();
      console.log(`🧹 Removidos ${duplicatesRemoved} leads duplicados`);
    }

    return duplicatesRemoved;
  }
}
