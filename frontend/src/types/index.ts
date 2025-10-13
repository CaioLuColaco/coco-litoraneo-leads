export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface PotentialScoreDetails {
  totalScore: number;
  level: 'baixo' | 'médio' | 'alto';
  factors: Array<{
    factor: string;
    points: number;
    description: string;
  }>;
  confidence: number;
}

export interface Lead {
  id: string;
  cnpj: string;
  companyName: string;
  tradeName?: string;
  matrixName?: string;
  city: string;
  district: string;
  subdistrict: string;
  neighborhood: string;
  
  // Endereço original
  streetAddress: string;
  number?: string;
  suggestedAddress?: string;
  zipCode: string;
  coordinates?: string;
  streetViewUrl?: string;
  
  // Endereço validado
  validatedStreet?: string;
  validatedNumber?: string;
  validatedComplement?: string;
  validatedNeighborhood?: string;
  validatedCity?: string;
  validatedState?: string;
  validatedZipCode?: string;
  validatedCoordinates?: {
    latitude: number;
    longitude: number;
  } | string | null;
  addressValidated?: boolean;
  addressValidationDate?: string;
  addressValidationSource?: string;
  
  // Potencial
  potentialScore: number;
  potentialLevel: string;
  potentialFactors: any[];
  potentialConfidence: number;
  
  // Dados cadastrais da empresa
  cnae?: string;
  cnaeDescription?: string;
  capitalSocial?: number;
  foundationDate?: string;
  industry?: string;
  estimatedEmployees?: number;
  estimatedRevenue?: number;
  
  // Sócios/Parceiros
  partners?: Array<{
    name: string;
    cpf: string;
    participation: number;
    role?: string;
  }>;
  
  // Observações do usuário
  userNotes?: string;
  processingError?: string;
  
  // Status
  status: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface UploadResponse {
  fileName: string;
  fileSize: number;
  estimatedLeads: number;
  status: string;
  message: string;
  processingStarted: string;
}

// Tipos para Vendedores
export interface Seller {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  responsibleRegion: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSellerRequest {
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  responsibleRegion: string;
  latitude?: number | null;
  longitude?: number | null;
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
