// Interface para endereço
export interface Address {
  street: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Interface para dados cadastrais da empresa
export interface CompanyData {
  cnpj: string;
  companyName: string;
  tradeName?: string;
  capitalSocial?: number;
  cnae?: string;
  cnaeDescription?: string;
  foundationDate?: string;
  partners?: Array<{
    name: string;
    cpf: string;
    participation: number;
  }>;
  region?: string;
  marketSegment?: string;
}

// Interface para análise de imagem da fachada
export interface FacadeAnalysis {
  hasStreetView: boolean;
  businessType?: string;
  buildingSize?: 'small' | 'medium' | 'large';
  commercialAppearance: boolean;
  confidence: number; // 0-100
}

// Interface para classificação de potencial
export interface PotentialClassification {
  score: number; // 0-100
  level: 'baixo' | 'médio' | 'alto';
  factors: string[];
  confidence: number; // 0-100
}

// Interface principal do Lead
export interface Lead {
  id: string;
  source: 'datlo' | 'manual' | 'other';
  companyData: CompanyData;
  address: Address;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
  };
  businessInfo: {
    industry: string;
    estimatedEmployees?: number;
    estimatedRevenue?: number;
    products?: string[];
  };
  validation: {
    addressValidated: boolean;
    addressValidationDate?: string;
    addressValidationSource?: string;
    facadeAnalyzed?: boolean;
    facadeAnalysisDate?: string;
    facadeAnalysis?: FacadeAnalysis;
  };
  potential: PotentialClassification;
  status: 'pending' | 'validated' | 'rejected' | 'exported';
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Interface para dados brutos do Datlo
export interface DatloRawData {
  CNPJ: string;
  'Razão social': string;
  'Nome Fantasia'?: string;
  'Nome matriz': string;
  Município: string;
  Distrito: string;
  Subdistrito: string;
  CEP: string;
  Bairro: string;
  'Endereço cadastral': string;
  'Endereço sugerido': string;
  Coordenadas: string; // formato: "-23.533853,-46.65335"
  'Street View': string; // URL do Street View
}

// Interface para resposta da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// Interface para filtros de busca
export interface LeadFilters {
  status?: string | undefined;
  potentialLevel?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  industry?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

// Interface para repositório de leads
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

// Tipos para autenticação
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface AuthMiddleware {
  userId: string;
  userEmail: string;
}
