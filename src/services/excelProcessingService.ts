import * as XLSX from 'xlsx';
import { DatloRawData } from '../types/lead';

export class ExcelProcessingService {
  /**
   * Valida rapidamente o formato da planilha Excel (sem processar dados)
   */
  async validateExcelFormat(buffer: Buffer): Promise<{
    isValid: boolean;
    error?: string;
    estimatedLeads: number;
    headers: string[];
  }> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Primeira planilha
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        return {
          isValid: false,
          error: 'Nenhuma planilha encontrada no arquivo',
          estimatedLeads: 0,
          headers: [],
        };
      }

      // Converter apenas o cabeçalho para validação rápida
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        return {
          isValid: false,
          error: 'Planilha deve ter pelo menos cabeçalho e uma linha de dados',
          estimatedLeads: 0,
          headers: [],
        };
      }

      // Primeira linha é o cabeçalho
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Validar se os cabeçalhos obrigatórios estão presentes
      const requiredHeaders = [
        'CNPJ',
        'Razão social',
        'Município',
        'CEP',
        'Endereço cadastral'
      ];

      const missingHeaders = requiredHeaders.filter(required => 
        !headers.some(header => header === required)
      );

      if (missingHeaders.length > 0) {
        return {
          isValid: false,
          error: `Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`,
          estimatedLeads: 0,
          headers: [],
        };
      }

      // Contar linhas de dados válidas (não vazias)
      const validDataRows = dataRows.filter((row: any) => 
        row && Array.isArray(row) && row.length > 0 && 
        row.some((cell: any) => cell && String(cell).trim() !== '')
      );

      return {
        isValid: true,
        estimatedLeads: validDataRows.length,
        headers: headers,
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Erro ao validar formato: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        estimatedLeads: 0,
        headers: [],
      };
    }
  }

  /**
   * Extrai dados de uma planilha Excel
   */
  async extractExcelData(buffer: Buffer): Promise<DatloRawData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Primeira planilha
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error('Nenhuma planilha encontrada no arquivo');
      }

      // Converter para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Planilha deve ter pelo menos cabeçalho e uma linha de dados');
      }

      // Primeira linha é o cabeçalho
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Mapear dados para o formato DatloRawData
      const leads: DatloRawData[] = dataRows
        .filter((row: any) => row && Array.isArray(row) && row.length > 0) // Filtrar linhas vazias
        .map((row: any, index: number) => {
          try {
            return {
              CNPJ: this.safeGet(row, headers, 'CNPJ') || '',
              'Razão social': this.safeGet(row, headers, 'Razão social') || '',
              'Nome Fantasia': this.safeGet(row, headers, 'Nome Fantasia') || '',
              'Nome matriz': this.safeGet(row, headers, 'Nome matriz') || '',
              Município: this.safeGet(row, headers, 'Município') || '',
              Distrito: this.safeGet(row, headers, 'Distrito') || '',
              Subdistrito: this.safeGet(row, headers, 'Subdistrito') || '',
              CEP: this.safeGet(row, headers, 'CEP') || '',
              Bairro: this.safeGet(row, headers, 'Bairro') || '',
              'Endereço cadastral': this.safeGet(row, headers, 'Endereço cadastral') || '',
              'Endereço sugerido': this.safeGet(row, headers, 'Endereço sugerido') || '',
              Coordenadas: this.safeGet(row, headers, 'Coordenadas') || '',
              'Street View': this.safeGet(row, headers, 'Street View') || '',
            };
          } catch (error) {
            console.warn(`⚠️ Erro ao processar linha ${index + 2}:`, error);
            return null;
          }
        })
        .filter(lead => lead !== null) as DatloRawData[];

      console.log(`📊 ${leads.length} leads extraídos da planilha`);
      return leads;
    } catch (error) {
      console.error('❌ Erro ao processar planilha Excel:', error);
      throw new Error(`Erro ao processar planilha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Obtém valor seguro de uma linha baseado no cabeçalho
   */
  private safeGet(row: any[], headers: string[], headerName: string): string {
    const index = headers.findIndex(h => h === headerName);
    if (index === -1 || index >= row.length) {
      return '';
    }
    return String(row[index] || '').trim();
  }

  /**
   * Exporta leads para Excel
   */
  async exportLeadsToExcel(leads: any[]): Promise<Buffer> {
    try {
      // Preparar dados para exportação
      const exportData = leads.map(lead => ({
        'ID': lead.id,
        'CNPJ': lead.cnpj,
        'Razão Social': lead.companyName,
        'Nome Fantasia': lead.tradeName || '',
        'Cidade': lead.validatedCity || lead.city,
        'Estado': lead.validatedState || '',
        'CEP': lead.validatedZipCode || lead.zipCode,
        'Endereço': lead.validatedStreet || lead.streetAddress,
        'Bairro': lead.validatedNeighborhood || lead.neighborhood,
        'Score de Potencial': lead.potentialScore || 0,
        'Nível de Potencial': lead.potentialLevel || 'baixo',
        'Status': lead.status,
        'Data de Criação': lead.createdAt,
        'Data de Atualização': lead.updatedAt,
      }));

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Processados');

      // Converter para buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      console.log(`📤 ${leads.length} leads exportados para Excel`);
      return buffer;
    } catch (error) {
      console.error('❌ Erro ao exportar leads:', error);
      throw new Error(`Erro ao exportar leads: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}
