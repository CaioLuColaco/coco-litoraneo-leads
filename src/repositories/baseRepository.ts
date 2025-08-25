import { Lead, LeadFilters } from '../types/lead';

export interface ILeadRepository {
  create(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  findAll(filters?: LeadFilters): Promise<Lead[]>;
  update(id: string, updates: Partial<Lead>): Promise<Lead | null>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<{
    total: number;
    byStatus: { [key: string]: number };
    byPotentialLevel: { [key: string]: number };
    byRegion: { [key: string]: number };
  }>;
}
