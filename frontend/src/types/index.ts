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
  
  // Sócios/Parceiros
  partners?: Array<{
    name: string;
    cpf: string;
    participation: number;
    role?: string;
  }>;
  
  // Observações do usuário
  userNotes?: string;
  
  // Status
  status: string;
  createdAt: string;
  updatedAt: string;
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
