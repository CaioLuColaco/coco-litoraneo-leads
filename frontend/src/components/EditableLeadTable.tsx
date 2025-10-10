import React, { useState, useEffect, useMemo } from 'react';
import { Lead, PotentialScoreDetails } from '../types';
import { PotentialTooltip } from './PotentialTooltip';

interface EditableLeadTableProps {
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onExport: () => Promise<void>;
  onExportSelected: (selectedIds: string[]) => Promise<void>;
  isExporting: boolean;
}

export const EditableLeadTable: React.FC<EditableLeadTableProps> = ({
  leads,
  onUpdateLead,
  onDeleteLead,
  onBulkDelete,
  onExport,
  onExportSelected,
  isExporting,
}) => {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Lead>>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  
  // Estados para pesquisa e ordenação
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Lead | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    status: '',
    potentialLevel: '',
    city: '',
    cnae: '',
    confidence: '',
  });

  // Seleção de leads
  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredAndSortedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredAndSortedLeads.map(lead => lead.id)));
    }
  };

  // Edição inline
  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditingData({
      companyName: lead.companyName,
      tradeName: lead.tradeName,
      city: lead.city,
      neighborhood: lead.neighborhood,
      streetAddress: lead.streetAddress,
      number: lead.validatedNumber || '',
      zipCode: lead.zipCode,
    });
    setNotes(prev => ({ ...prev, [lead.id]: lead.userNotes || '' }));
  };

  const handleSave = async (leadId: string) => {
    try {
      const { number, ...dataWithoutNumber } = editingData;
      await onUpdateLead(leadId, {
        ...dataWithoutNumber,
        validatedNumber: number,
        userNotes: notes[leadId],
      });
      setEditingId(null);
      setEditingData({});
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({});
  };

  // Deleção
  const handleDelete = async (leadId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lead?')) {
      await onDeleteLead(leadId);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return;
    
    if (window.confirm(`Tem certeza que deseja excluir ${selectedLeads.size} leads selecionados?`)) {
      await onBulkDelete(Array.from(selectedLeads));
      setSelectedLeads(new Set());
    }
  };

  // Funções de pesquisa e ordenação
  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      potentialLevel: '',
      city: '',
      cnae: '',
      confidence: '',
    });
    setSearchTerm('');
  };

  // Filtros e ordenação aplicados aos leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      // Pesquisa geral
      const searchMatch = searchTerm === '' || 
        lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.cnpj.includes(searchTerm) ||
        (lead.cnae && lead.cnae.includes(searchTerm)) ||
        (lead.city && lead.city.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtros específicos
      const statusMatch = filters.status === '' || lead.status === filters.status;
      const potentialMatch = filters.potentialLevel === '' || lead.potentialLevel === filters.potentialLevel;
      const cityMatch = filters.city === '' || 
        (lead.validatedCity && lead.validatedCity.toLowerCase().includes(filters.city.toLowerCase())) ||
        (lead.city && lead.city.toLowerCase().includes(filters.city.toLowerCase()));
      const cnaeMatch = filters.cnae === '' || 
        (lead.cnae && lead.cnae.includes(filters.cnae)) ||
        (lead.cnaeDescription && lead.cnaeDescription.toLowerCase().includes(filters.cnae.toLowerCase()));
      
      // Filtro de confiança
      let confidenceMatch = true;
      if (filters.confidence === 'high') {
        confidenceMatch = !!(lead.potentialConfidence && lead.potentialConfidence >= 80);
      } else if (filters.confidence === 'medium') {
        confidenceMatch = !!(lead.potentialConfidence && lead.potentialConfidence >= 50 && lead.potentialConfidence < 80);
      } else if (filters.confidence === 'low') {
        confidenceMatch = !!(lead.potentialConfidence && lead.potentialConfidence < 50);
      }

      return searchMatch && statusMatch && potentialMatch && cityMatch && cnaeMatch && confidenceMatch;
    });

    // Ordenação
    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [leads, searchTerm, filters, sortField, sortDirection]);

  /**
   * Busca os detalhes da pontuação da API do backend
   */
  const fetchPotentialDetails = async (leadId: string): Promise<PotentialScoreDetails | null> => {
    try {
      const response = await fetch(`/api/leads/${leadId}/potential-details`);
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da pontuação:', error);
    }
    return null;
  };

  /**
   * Gera o tooltip da pontuação baseado nos dados do backend
   */
  const generatePotentialTooltip = (lead: Lead): string => {
    if (lead.potentialFactors && Array.isArray(lead.potentialFactors)) {
      // Verifica se os fatores são strings (formato atual) ou objetos
      const factors = lead.potentialFactors
        .filter((factor: any) => factor && typeof factor === 'string')
        .map((factor: string) => factor);
      
      if (factors.length > 0) {
        let tooltip = factors.join('\n');
        
        // Adiciona informação sobre confiança se disponível
        if (lead.potentialConfidence) {
          tooltip += `\n\n📊 Confiança: ${lead.potentialConfidence}%`;
          if (lead.potentialConfidence >= 80) {
            tooltip += ' (Alta confiança)';
          } else if (lead.potentialConfidence >= 50) {
            tooltip += ' (Confiança média)';
          } else {
            tooltip += ' (Baixa confiança)';
          }
        }
        
        return tooltip;
      }
    }
    
    // Fallback para dados básicos
    const factors: string[] = [];
    
    if (lead.cnae) factors.push(`CNAE: ${lead.cnae}`);
    if (lead.capitalSocial) factors.push(`Capital: R$ ${lead.capitalSocial.toLocaleString('pt-BR')}`);
    if (lead.validatedState) factors.push(`Região: ${lead.validatedState}`);
    if (lead.foundationDate) factors.push(`Fundação: ${new Date(lead.foundationDate).getFullYear()}`);
    if (lead.addressValidated) factors.push('Endereço validado');
    if (lead.validatedCoordinates) factors.push('Coordenadas disponíveis');
    if (lead.partners && Array.isArray(lead.partners) && lead.partners.length > 0) factors.push(`${lead.partners.length} sócio(s)`);
    
    if (factors.length === 0) {
      return 'Pontuação baseada em dados limitados';
    }
    
    let tooltip = factors.join('\n');
    
    // Adiciona informação sobre confiança se disponível
    if (lead.potentialConfidence) {
      tooltip += `\n\n📊 Confiança: ${lead.potentialConfidence}%`;
      if (lead.potentialConfidence >= 80) {
        tooltip += ' (Alta confiança)';
      } else if (lead.potentialConfidence >= 50) {
        tooltip += ' (Confiança média)';
      } else {
        tooltip += ' (Baixa confiança)';
      }
    }
    
    return tooltip;
  };

  return (
    <div className="editable-table-container">
      {/* Barra de pesquisa e filtros */}
      <div className="search-and-filters">
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="🔍 Pesquisar por empresa, CNPJ, CNAE, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-count">
              {filteredAndSortedLeads.length} de {leads.length} leads
            </span>
          </div>
        </div>

        <div className="filters-section">
          <select
            value={filters.potentialLevel}
            onChange={(e) => handleFilterChange('potentialLevel', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os potenciais</option>
            <option value="alto">Alto</option>
            <option value="médio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>

          <input
            type="text"
            placeholder="Filtrar por cidade..."
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            className="filter-input"
          />

          <input
            type="text"
            placeholder="Filtrar por CNAE..."
            value={filters.cnae}
            onChange={(e) => handleFilterChange('cnae', e.target.value)}
            className="filter-input"
          />

          <select
            value={filters.confidence}
            onChange={(e) => handleFilterChange('confidence', e.target.value)}
            className="filter-select"
          >
            <option value="">Todas as confianças</option>
            <option value="high">Alta confiança (80%+)</option>
            <option value="medium">Confiança média (50-79%)</option>
            <option value="low">Baixa confiança (&lt;50%)</option>
          </select>

          <button
            onClick={clearFilters}
            className="btn btn-secondary btn-sm"
          >
            🗑️ Limpar Filtros
          </button>

          <button
            onClick={onExport}
            disabled={isExporting || leads.length === 0}
            className="btn btn-excel btn-sm"
          >
            {isExporting ? 'Exportando...' : '📥 Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Barra de ações em lote */}
      {selectedLeads.size > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">
            {selectedLeads.size} lead(s) selecionado(s)
          </span>
          <div className="bulk-buttons">
            <button
              onClick={() => onExportSelected(Array.from(selectedLeads))}
              disabled={isExporting}
              className="btn btn-excel btn-sm"
            >
              {isExporting ? 'Exportando...' : '📥 Exportar Selecionados'}
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn btn-danger btn-sm"
            >
              🗑️ Excluir Selecionados
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="editable-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedLeads.size === filteredAndSortedLeads.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('companyName')}
              >
                Empresa
                {sortField === 'companyName' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('cnpj')}
              >
                CNPJ
                {sortField === 'cnpj' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('cnae')}
              >
                CNAE
                {sortField === 'cnae' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('capitalSocial')}
              >
                Capital Social
                {sortField === 'capitalSocial' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('foundationDate')}
              >
                Data de Fundação
                {sortField === 'foundationDate' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th>Sócios</th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('status')}
              >
                Status
                {sortField === 'status' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('city')}
              >
                Endereço
                {sortField === 'city' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleSort('potentialScore')}
              >
                Potencial
                {sortField === 'potentialScore' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th>Observações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLeads.map((lead) => (
              <tr key={lead.id} className={selectedLeads.has(lead.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedLeads.has(lead.id)}
                    onChange={() => handleSelectLead(lead.id)}
                  />
                </td>
                
                {/* Empresa */}
                <td>
                  {editingId === lead.id ? (
                    <input
                      type="text"
                      value={editingData.companyName || ''}
                      onChange={(e) => setEditingData(prev => ({ ...prev, companyName: e.target.value }))}
                      className="edit-input"
                    />
                  ) : (
                    <div className="company-info">
                      <div className="company-name">{lead.companyName}</div>
                      {lead.tradeName && (
                        <div className="trade-name">{lead.tradeName}</div>
                      )}
                    </div>
                  )}
                </td>

                {/* CNPJ */}
                <td className="cnpj">{lead.cnpj}</td>

                {/* CNAE */}
                <td className="cnae">
                  {lead.cnae && (
                    <div>
                      <div className="cnae-code">{lead.cnae}</div>
                      {lead.cnaeDescription && (
                        <div className="cnae-description">{lead.cnaeDescription}</div>
                      )}
                    </div>
                  )}
                </td>

                {/* Capital Social */}
                <td className="capital">
                  {lead.capitalSocial ? (
                    <div className="capital-value">
                      R$ {lead.capitalSocial.toLocaleString('pt-BR')}
                    </div>
                  ) : (
                    <span className="no-data">Não informado</span>
                  )}
                </td>

                {/* Data de Fundação */}
                <td className="foundation-date">
                  {lead.foundationDate ? (
                    <div className="foundation-info">
                      <div className="foundation-date-value">
                        {new Date(lead.foundationDate).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="foundation-years">
                        {(() => {
                          const foundation = new Date(lead.foundationDate);
                          const now = new Date();
                          const years = now.getFullYear() - foundation.getFullYear();
                          return `${years} ${years === 1 ? 'ano' : 'anos'}`;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <span className="no-data">Não informado</span>
                  )}
                </td>

                {/* Sócios */}
                <td className="partners">
                  {lead.partners && lead.partners.length > 0 ? (
                    <div className="partners-list">
                      {lead.partners.map((partner, index) => (
                        <div key={index} className="partner-item">
                          <div className="partner-name">{partner.name}</div>
                          {partner.role && (
                            <div className="partner-role">{partner.role}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="no-data">Não informado</span>
                  )}
                </td>

                {/* Status */}
                <td>
                  <div className={`status-badge ${lead.status}`}>
                    {lead.status === 'processado' && '✅ Processado'}
                    {lead.status === 'aguardando' && '⏳ Aguardando'}
                    {lead.status === 'erro' && '❌ Erro'}
                    {lead.status === 'processando' && '🔄 Processando'}
                    {!lead.status && '❓ Desconhecido'}
                  </div>
                </td>

                {/* Endereço */}
                <td>
                  <div className="address">
                    {editingId === lead.id ? (
                      <div className="edit-address">
                        <input
                          type="text"
                          value={editingData.streetAddress || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, streetAddress: e.target.value }))}
                          className="edit-input"
                          placeholder="Rua"
                        />
                        <input
                          type="text"
                          value={editingData.number || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, number: e.target.value }))}
                          className="edit-input"
                          placeholder="Número"
                        />
                        <input
                          type="text"
                          value={editingData.neighborhood || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          className="edit-input"
                          placeholder="Bairro"
                        />
                        <input
                          type="text"
                          value={editingData.city || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, city: e.target.value }))}
                          className="edit-input"
                          placeholder="Cidade"
                        />
                        <input
                          type="text"
                          value={editingData.zipCode || ''}
                          onChange={(e) => setEditingData(prev => ({ ...prev, zipCode: e.target.value }))}
                          className="edit-input"
                          placeholder="CEP"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="street">
                          {lead.validatedStreet || lead.streetAddress}
                          {lead.validatedNumber && (
                            <span className="street-number">, {lead.validatedNumber}</span>
                          )}
                        </div>
                        <div className="neighborhood">
                          {lead.validatedNeighborhood || lead.neighborhood}
                        </div>
                        <div className="city-state">
                          {lead.validatedCity || lead.city}, {lead.validatedState || ''}
                        </div>
                        <div className="zip-code">
                          {lead.validatedZipCode || lead.zipCode}
                        </div>
                      </>
                    )}
                  </div>
                </td>

                {/* Potencial */}
                <td>
                  {editingId === lead.id ? (
                    <input
                      type="text"
                      value={editingData.potentialScore || ''}
                      onChange={(e) => setEditingData(prev => ({ ...prev, potentialScore: parseInt(e.target.value) || 0 }))}
                      className="edit-input"
                    />
                  ) : (
                    <div className="potential-info">
                      {lead.potentialScore === 0 && lead.potentialLevel === 'baixo' && lead.potentialFactors?.includes('Nenhuma configuração de pontuação ativa') ? (
                        <div className="no-config-message">
                          <span className="no-config-text">Nenhuma configuração de pontuação cadastrada</span>
                        </div>
                      ) : (
                        <PotentialTooltip tooltipContent={generatePotentialTooltip(lead)}>
                          <div className="potential-container">
                            {/* Qualificação - Badge centralizado */}
                            <div className={`potential-level ${lead.potentialLevel}`}>
                              {lead.potentialLevel === 'alto' && '🟢'}
                              {lead.potentialLevel === 'médio' && '🟡'}
                              {lead.potentialLevel === 'baixo' && '🔴'}
                              <span className="level-text">{lead.potentialLevel.toUpperCase()}</span>
                            </div>
                            
                            {/* Pontuação - Número centralizado */}
                            <div className="potential-score">
                              {lead.potentialScore}
                            </div>
                            
                            {/* Confiança - Porcentagem centralizada */}
                            {lead.potentialConfidence && (
                              <div className="potential-confidence">
                                {lead.potentialConfidence}% confiança
                              </div>
                            )}
                          </div>
                        </PotentialTooltip>
                      )}
                    </div>
                  )}
                </td>

                {/* Observações */}
                <td>
                  {editingId === lead.id ? (
                    <textarea
                      value={notes[lead.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                      className="edit-textarea"
                      placeholder="Adicione observações..."
                      rows={3}
                    />
                  ) : (
                    <div className="notes">
                      {lead.userNotes ? (
                        <div className="notes-content">{lead.userNotes}</div>
                      ) : (
                        <span className="no-notes">Sem observações</span>
                      )}
                    </div>
                  )}
                </td>

                {/* Ações */}
                <td>
                  {editingId === lead.id ? (
                    <div className="edit-actions">
                      <button
                        onClick={() => handleSave(lead.id)}
                        className="action-button edit"
                        title="Salvar"
                      >
                        ✅ Salvar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="action-button delete"
                        title="Cancelar"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="row-actions">
                      <button
                        onClick={() => handleEdit(lead)}
                        className="action-button edit"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="action-button delete"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Estilos CSS inline
const styles = `
  .no-config-message {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    text-align: center;
  }

  .no-config-text {
    color: #6c757d;
    font-size: 12px;
    font-weight: 500;
    font-style: italic;
  }

  .potential-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .potential-score {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .badge-success {
    background-color: #d4edda;
    color: #155724;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
  }

  .badge-warning {
    background-color: #fff3cd;
    color: #856404;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
  }

  .badge-danger {
    background-color: #f8d7da;
    color: #721c24;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
  }
`;

// Injetar estilos no head do documento
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
