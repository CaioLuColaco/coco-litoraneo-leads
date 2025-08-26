import React, { useState, useEffect, useMemo } from 'react';
import { Lead, PotentialScoreDetails } from '../types';

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
      zipCode: lead.zipCode,
    });
    setNotes(prev => ({ ...prev, [lead.id]: lead.userNotes || '' }));
  };

  const handleSave = async (leadId: string) => {
    try {
      await onUpdateLead(leadId, {
        ...editingData,
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

      return searchMatch && statusMatch && potentialMatch && cityMatch && cnaeMatch;
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
    // Se temos os detalhes da pontuação estruturados, usamos eles
    if (lead.potentialFactors && Array.isArray(lead.potentialFactors)) {
      const factors = lead.potentialFactors
        .filter((factor: any) => factor && factor.factor && factor.points !== undefined)
        .map((factor: any) => `${factor.factor}: ${factor.points} pts`);
      
      if (factors.length > 0) {
        return factors.join('\n');
      }
    }
    
    // Fallback para dados básicos (quando não temos os detalhes estruturados)
    const factors: string[] = [];
    
    if (lead.cnae) {
      factors.push(`CNAE: 40 pts`);
    }
    
    if (lead.capitalSocial) {
      if (lead.capitalSocial > 1000000) {
        factors.push(`Capital Social: 8 pts`);
      } else if (lead.capitalSocial > 100000) {
        factors.push(`Capital Social: 6 pts`);
      } else if (lead.capitalSocial > 10000) {
        factors.push(`Capital Social: 4 pts`);
      } else {
        factors.push(`Capital Social: 2 pts`);
      }
    }
    
    if (lead.validatedState) {
      const state = lead.validatedState;
      if (['SP', 'RJ', 'MG', 'RS', 'SC', 'PR'].includes(state)) {
        factors.push(`Região: 15 pts`);
      } else if (['BA', 'PE', 'CE', 'GO', 'MT'].includes(state)) {
        factors.push(`Região: 10 pts`);
      } else {
        factors.push(`Região: 5 pts`);
      }
    }
    
    if (lead.foundationDate) {
      const foundationYear = new Date(lead.foundationDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - foundationYear;
      
      if (age > 20) {
        factors.push(`Data de fundação: 10 pts`);
      } else if (age > 10) {
        factors.push(`Data de fundação: 8 pts`);
      } else if (age > 5) {
        factors.push(`Data de fundação: 5 pts`);
      } else {
        factors.push(`Data de fundação: 2 pts`);
      }
    }
    
    if (lead.addressValidated) {
      factors.push(`Endereço validado: 10 pts`);
    }
    
    if (lead.validatedCoordinates) {
      factors.push(`Coordenadas: 5 pts`);
    }
    
    if (lead.partners && lead.partners.length > 0) {
      factors.push(`Sócios: 5 pts`);
    }
    
    // Se não temos fatores, retornamos uma mensagem padrão
    if (factors.length === 0) {
      return 'Pontuação baseada em dados limitados';
    }
    
    return factors.join('\n');
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
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            <option value="processado">Processado</option>
            <option value="aguardando">Aguardando</option>
            <option value="processando">Processando</option>
            <option value="erro">Erro</option>
          </select>

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
              <th>Sócios</th>
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
                          placeholder="Endereço"
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
                  <div className="potential potential-tooltip" data-tooltip={generatePotentialTooltip(lead)}>
                    <div className={`potential-badge ${lead.potentialLevel}`}>
                      {lead.potentialLevel === 'alto' && '🟢'}
                      {lead.potentialLevel === 'médio' && '🟡'}
                      {lead.potentialLevel === 'baixo' && '🔴'}
                      {lead.potentialLevel}
                    </div>
                    <div className="potential-score">{lead.potentialScore}/100</div>
                  </div>
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
