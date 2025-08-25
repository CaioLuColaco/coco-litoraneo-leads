import { Lead, LeadFilters } from '../types/lead';

export class LeadRepository {
  private leads: Map<string, Lead> = new Map();
  private nextId = 1;

  /**
   * Cria um novo lead
   */
  async create(
    lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Lead> {
    const id = `lead_${this.nextId++}_${Date.now()}`;
    const now = new Date().toISOString();

    const newLead: Lead = {
      ...lead,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.leads.set(id, newLead);
    console.log(`✅ Lead criado com ID: ${id}`);

    return newLead;
  }

  /**
   * Busca um lead por ID
   */
  async findById(id: string): Promise<Lead | null> {
    return this.leads.get(id) || null;
  }

  /**
   * Busca todos os leads com filtros opcionais
   */
  async findAll(filters?: LeadFilters): Promise<Lead[]> {
    let filteredLeads = Array.from(this.leads.values());

    if (filters) {
      filteredLeads = this.applyFilters(filteredLeads, filters);
    }

    // Ordena por data de criação (mais recentes primeiro)
    filteredLeads.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return filteredLeads;
  }

  /**
   * Atualiza um lead existente
   */
  async update(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const existingLead = this.leads.get(id);
    if (!existingLead) {
      return null;
    }

    const updatedLead: Lead = {
      ...existingLead,
      ...updates,
      id, // Garante que o ID não seja alterado
      updatedAt: new Date().toISOString(),
    };

    this.leads.set(id, updatedLead);
    console.log(`✅ Lead atualizado: ${id}`);

    return updatedLead;
  }

  /**
   * Remove um lead
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.leads.delete(id);
    if (deleted) {
      console.log(`✅ Lead removido: ${id}`);
    }
    return deleted;
  }

  /**
   * Busca leads por status
   */
  async findByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(
      lead => lead.status === status
    );
  }

  /**
   * Busca leads por nível de potencial
   */
  async findByPotentialLevel(level: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(
      lead => lead.potential.level === level
    );
  }

  /**
   * Busca leads por cidade
   */
  async findByCity(city: string): Promise<Lead[]> {
    const normalizedCity = city.toLowerCase();
    return Array.from(this.leads.values()).filter(lead =>
      lead.address.city.toLowerCase().includes(normalizedCity)
    );
  }

  /**
   * Busca leads por estado
   */
  async findByState(state: string): Promise<Lead[]> {
    const normalizedState = state.toLowerCase();
    return Array.from(this.leads.values()).filter(lead =>
      lead.address.state.toLowerCase().includes(normalizedState)
    );
  }

  /**
   * Busca leads por indústria
   */
  async findByIndustry(industry: string): Promise<Lead[]> {
    const normalizedIndustry = industry.toLowerCase();
    return Array.from(this.leads.values()).filter(lead =>
      lead.businessInfo.industry.toLowerCase().includes(normalizedIndustry)
    );
  }

  /**
   * Busca leads por CNPJ
   */
  async findByCnpj(cnpj: string): Promise<Lead | null> {
    const normalizedCnpj = cnpj.replace(/\D/g, '');
    return (
      Array.from(this.leads.values()).find(
        lead => lead.companyData.cnpj.replace(/\D/g, '') === normalizedCnpj
      ) || null
    );
  }

  /**
   * Conta total de leads
   */
  async count(): Promise<number> {
    return this.leads.size;
  }

  /**
   * Conta leads por status
   */
  async countByStatus(status: string): Promise<number> {
    return Array.from(this.leads.values()).filter(
      lead => lead.status === status
    ).length;
  }

  /**
   * Conta leads por nível de potencial
   */
  async countByPotentialLevel(level: string): Promise<number> {
    return Array.from(this.leads.values()).filter(
      lead => lead.potential.level === level
    ).length;
  }

  /**
   * Obtém estatísticas gerais
   */
  async getStats(): Promise<{
    total: number;
    byStatus: { [key: string]: number };
    byPotentialLevel: { [key: string]: number };
    byRegion: { [key: string]: number };
    bySegment: { [key: string]: number };
  }> {
    const leads = Array.from(this.leads.values());

    const byStatus: { [key: string]: number } = {};
    const byPotentialLevel: { [key: string]: number } = {};
    const byRegion: { [key: string]: number } = {};
    const bySegment: { [key: string]: number } = {};

    leads.forEach(lead => {
      // Status
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;

      // Potencial
      byPotentialLevel[lead.potential.level] =
        (byPotentialLevel[lead.potential.level] || 0) + 1;

      // Região
      byRegion[lead.companyData.region || 'não informada'] =
        (byRegion[lead.companyData.region || 'não informada'] || 0) + 1;

      // Segmento
      bySegment[lead.companyData.marketSegment || 'não informado'] =
        (bySegment[lead.companyData.marketSegment || 'não informado'] || 0) + 1;
    });

    return {
      total: leads.length,
      byStatus,
      byPotentialLevel,
      byRegion,
      bySegment,
    };
  }

  /**
   * Aplica filtros aos leads
   */
  private applyFilters(leads: Lead[], filters: LeadFilters): Lead[] {
    let filtered = leads;

    if (filters.status) {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    if (filters.potentialLevel) {
      filtered = filtered.filter(
        lead => lead.potential.level === filters.potentialLevel
      );
    }

    if (filters.city) {
      const normalizedCity = filters.city.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.address.city.toLowerCase().includes(normalizedCity)
      );
    }

    if (filters.state) {
      const normalizedState = filters.state.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.address.state.toLowerCase().includes(normalizedState)
      );
    }

    if (filters.industry) {
      const normalizedIndustry = filters.industry.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.businessInfo.industry.toLowerCase().includes(normalizedIndustry)
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(lead => new Date(lead.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(lead => new Date(lead.createdAt) <= toDate);
    }

    // Aplica paginação
    if (filters.offset !== undefined && filters.limit !== undefined) {
      filtered = filtered.slice(filters.offset, filters.offset + filters.limit);
    } else if (filters.limit !== undefined) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Limpa todos os leads (útil para testes)
   */
  async clear(): Promise<void> {
    this.leads.clear();
    this.nextId = 1;
    console.log('🗑️ Todos os leads foram removidos');
  }
}
