import React, { useState, useEffect } from 'react';
import { leadsAPI, apiBaseUrl } from '../services/api';
import { Lead } from '../types';
import { EditableLeadTable } from '../components/EditableLeadTable';
import SalesforceWebhook from '../components/SalesforceWebhook';

const LeadsProcessados: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadLeads();
    loadStats();
  }, []);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const data = await leadsAPI.getAllLeads(); // Mudança para buscar todos os leads
      setLeads(data);
    } catch (error: any) {
      setError('Erro ao carregar leads. Tente novamente.');
      console.error('Erro ao carregar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await leadsAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await leadsAPI.exportLeads();
      
      // Criar link para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads_processados_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError('Erro ao exportar leads. Tente novamente.');
      console.error('Erro ao exportar:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async (selectedIds: string[]) => {
    try {
      setIsExporting(true);
      // Filtrar apenas os leads selecionados
      const selectedLeads = leads.filter(lead => selectedIds.includes(lead.id));
      
      // Criar dados para exportação
      const exportData = {
        filters: {
          selectedIds: selectedIds
        }
      };
      
      const blob = await leadsAPI.exportSelectedLeads(exportData);
      
      // Criar link para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads_selecionados_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError('Erro ao exportar leads selecionados. Tente novamente.');
      console.error('Erro ao exportar selecionados:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Funções para edição e deleção
  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      await leadsAPI.updateLead(id, updates);
      await loadLeads(); // Recarregar leads
      await loadStats(); // Recarregar estatísticas
    } catch (error: any) {
      setError('Erro ao atualizar lead. Tente novamente.');
      console.error('Erro ao atualizar lead:', error);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await leadsAPI.deleteLead(id);
      await loadLeads(); // Recarregar leads
      await loadStats(); // Recarregar estatísticas
    } catch (error: any) {
      setError('Erro ao deletar lead. Tente novamente.');
      console.error('Erro ao deletar lead:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      // Deletar leads em paralelo
      await Promise.all(ids.map(id => leadsAPI.deleteLead(id)));
      await loadLeads(); // Recarregar leads
      await loadStats(); // Recarregar estatísticas
    } catch (error: any) {
      setError('Erro ao deletar leads em lote. Tente novamente.');
      console.error('Erro ao deletar leads em lote:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Carregando leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Integração com Salesforce */}
      <SalesforceWebhook baseUrl={apiBaseUrl} />

      <div className="page-header">
        <h1>📊 Todos os Leads</h1>
      </div>

      {/* Cards de estatísticas */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              📈
            </div>
            <div className="stat-content">
              <h3>Total</h3>
              <p>{stats.total || 0}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              ✅
            </div>
            <div className="stat-content">
              <h3>Processados</h3>
              <p>{stats.processed || 0}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-yellow">
              ⏳
            </div>
            <div className="stat-content">
              <h3>Pendentes</h3>
              <p>{stats.pending || 0}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon stat-icon-purple">
              🏆
            </div>
            <div className="stat-content">
              <h3>Alto Potencial</h3>
              <p>{stats.highPotential || 0}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Tabela de leads editável */}
      <div className="card">
        {leads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3 className="empty-title">Nenhum lead encontrado</h3>
            <p className="empty-description">
              Faça upload de uma planilha na aba "Leads Enviados" para começar.
            </p>
          </div>
        ) : (
          <EditableLeadTable
            leads={leads}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onBulkDelete={handleBulkDelete}
            onExport={handleExport}
            onExportSelected={handleExportSelected}
            isExporting={isExporting}
          />
        )}
      </div>
    </div>
  );
};

export default LeadsProcessados;
