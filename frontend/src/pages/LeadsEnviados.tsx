import React, { useState, useRef } from 'react';
import { leadsAPI } from '../services/api';
import { UploadResponse } from '../types';

const LeadsEnviados: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Alguns sistemas enviam como octet-stream
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const result = await leadsAPI.uploadExcel(file);
      setUploadResult(result);
      
      // Limpar input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao fazer upload do arquivo. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Simular seleção de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.files = files;
        handleFileUpload({ target: { files } } as any);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">
          📤 Leads Enviados
        </h1>
        <p className="page-description">
          Faça upload da planilha exportada pelo sistema Datlo para processar os leads.
        </p>
      </div>

      {/* Área de Upload */}
      <div className="card">
        <div className="upload-area">
          <div className="upload-icon">
            📁
          </div>
          
          <div className="upload-text">
            {isUploading ? 'Processando planilha...' : 'Arraste e solte sua planilha aqui'}
          </div>
          <p className="upload-subtext">
            ou clique para selecionar um arquivo
          </p>
          <p className="upload-subtext">
            Formatos aceitos: .xlsx, .xls (máximo 10MB)
          </p>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="upload-button"
            >
              {isUploading ? (
                <>
                  <div className="spinner"></div>
                  Processando...
                </>
              ) : (
                'Selecionar Planilha'
              )}
            </button>
          </div>
        </div>

        {/* Mensagens de erro */}
        {error && (
          <div className="alert alert-error">
            <div className="alert-content">
              <div className="alert-icon">❌</div>
              <div className="alert-message">
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resultado do upload */}
        {uploadResult && (
          <div className="alert alert-success">
            <div className="alert-content">
              <div className="alert-icon">✅</div>
              <div className="alert-message">
                <h3>Planilha aceita com sucesso!</h3>
                <div className="upload-details">
                  <p><strong>📁 Arquivo:</strong> {uploadResult.fileName}</p>
                  <p><strong>📊 Tamanho:</strong> {(uploadResult.fileSize / 1024).toFixed(1)} KB</p>
                  <p><strong>🔢 Leads estimados:</strong> {uploadResult.estimatedLeads}</p>
                  <p><strong>⏰ Início do processamento:</strong> {new Date(uploadResult.processingStarted).toLocaleString('pt-BR')}</p>
                  <p><strong>📝 Status:</strong> <span className="status-accepted">{uploadResult.status}</span></p>
                </div>
                <div className="processing-info">
                  <p><strong>ℹ️ Informação:</strong> {uploadResult.message}</p>
                  <p className="note">💡 A planilha foi aceita e está sendo processada em background. Você pode acompanhar o progresso na aba "Leads Processados".</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="card instruction-card">
        <h3 className="instruction-title">
          📋 Instruções para Upload
        </h3>
        <div className="instruction-list">
          <p>• A planilha deve estar no formato padrão do Datlo</p>
          <p>• Colunas obrigatórias: CNPJ, Razão Social, Município, CEP, Endereço cadastral</p>
          <p>• O sistema processará apenas a primeira página da planilha</p>
          <p>• A validação é feita imediatamente e a resposta é instantânea</p>
          <p>• O processamento dos leads acontece em background</p>
          <p>• Leads com CNPJ duplicado serão automaticamente ignorados</p>
          <p>• Acompanhe o progresso na aba "Leads Processados"</p>
        </div>
      </div>
    </div>
  );
};

export default LeadsEnviados;
