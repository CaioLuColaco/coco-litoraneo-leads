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
  // Campos adicionais para confiança
  validatedState?: string;
  addressValidated?: boolean;
  coordinates?: string;
  validatedCoordinates?: boolean;
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

// Tipo para o modelo Prisma (banco de dados)
export interface PrismaLead {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  source: string;
  status: string;
  email: string | null;
  cnpj: string;
  companyName: string;
  tradeName: string | null;
  matrixName: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  zipCode: string | null;
  neighborhood: string | null;
  streetAddress: string | null;
  suggestedAddress: string | null;
  coordinates: string | null;
  streetViewUrl: string | null;
  validatedStreet: string | null;
  validatedNumber: string | null;
  validatedComplement: string | null;
  validatedNeighborhood: string | null;
  validatedCity: string | null;
  validatedState: string | null;
  validatedZipCode: string | null;
  validatedCoordinates: any; // JsonValue do Prisma
  addressValidated: boolean;
  addressValidationDate: Date | null;
  addressValidationSource: string | null;
  potentialScore: number;
  potentialLevel: string;
  potentialFactors: any; // JsonValue do Prisma
  potentialConfidence: number;
  industry: string | null;
  estimatedEmployees: number | null;
  estimatedRevenue: number | null;
  products: any; // JsonValue do Prisma
  cnae: string | null;
  cnaeDescription: string | null;
  capitalSocial: number | null;
  foundationDate: Date | null;
  partners: any; // JsonValue do Prisma
  userNotes: string | null;
  processingError: string | null;
  userId: string | null;
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

// Interfaces para sistema de pontuação configurável
export interface ScoringConfig {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  categories: ScoringCategory[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ScoringCategory {
  id: string;
  configId: string;
  name: string;
  type: 'cnae' | 'region' | 'capital' | 'foundation' | 'address' | 'partners' | 'custom';
  points: number;
  description?: string;
  criteria: ScoringCriteria[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoringCriteria {
  id: string;
  categoryId: string;
  name: string;
  value: string;
  points: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScoringConfigRequest {
  name: string;
  description?: string;
  categories: CreateScoringCategoryRequest[];
}

export interface CreateScoringCategoryRequest {
  name: string;
  type: 'cnae' | 'region' | 'capital' | 'foundation' | 'address' | 'partners' | 'custom';
  points: number;
  description?: string;
  criteria: CreateScoringCriteriaRequest[];
}

export interface CreateScoringCriteriaRequest {
  name: string;
  value: string;
  points: number;
  description?: string;
}

export interface UpdateScoringConfigRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  categories?: CreateScoringCategoryRequest[];
}
