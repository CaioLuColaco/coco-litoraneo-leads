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
  validatedCoordinates?: any;
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
