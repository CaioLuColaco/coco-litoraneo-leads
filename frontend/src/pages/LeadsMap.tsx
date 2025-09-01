import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Lead } from '../types';
import { leadsAPI } from '../services/api';

// Importar CSS do Leaflet e do componente
import 'leaflet/dist/leaflet.css';
import './LeadsMap.css';

// Fix para ícones do Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface LeadsMapProps {}

export const LeadsMap: React.FC<LeadsMapProps> = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    potentialLevel: '',
    status: '',
    city: '',
  });

  // Buscar leads
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const data = await leadsAPI.getAllLeads();
        console.log('Leads carregados:', data.length);
        setLeads(data);
      } catch (err) {
        setError('Erro ao carregar leads');
        console.error('Erro ao buscar leads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  // Filtrar leads com coordenadas válidas
  const leadsWithCoordinates = useMemo(() => {
    const filtered = leads.filter(lead => {
      // Verificar se tem coordenadas válidas
      const hasCoordinates = lead.validatedCoordinates || 
        (lead.coordinates && lead.coordinates.includes(','));
      
      // Aplicar filtros
      const potentialMatch = !filters.potentialLevel || lead.potentialLevel === filters.potentialLevel;
      const statusMatch = !filters.status || lead.status === filters.status;
      const cityMatch = !filters.city || 
        (lead.validatedCity && lead.validatedCity.toLowerCase().includes(filters.city.toLowerCase())) ||
        (lead.city && lead.city.toLowerCase().includes(filters.city.toLowerCase()));

      return hasCoordinates && potentialMatch && statusMatch && cityMatch;
    });
    
    console.log('Leads com coordenadas:', filtered.length);
    return filtered;
  }, [leads, filters]);

  // Calcular centro do mapa
  const mapCenter = useMemo(() => {
    if (leadsWithCoordinates.length === 0) {
      return [-23.5505, -46.6333]; // São Paulo como padrão
    }

    const validLeads = leadsWithCoordinates.filter(lead => {
      const coords = lead.validatedCoordinates || lead.coordinates;
      return coords && typeof coords === 'string' && coords.includes(',');
    });

    if (validLeads.length === 0) {
      return [-23.5505, -46.6333];
    }

    const totalLat = validLeads.reduce((sum, lead) => {
      const coords = lead.validatedCoordinates || lead.coordinates;
      if (typeof coords === 'string' && coords.includes(',')) {
        const [lat] = coords.split(',').map(Number);
        return sum + lat;
      }
      return sum;
    }, 0);

    const totalLng = validLeads.reduce((sum, lead) => {
      const coords = lead.validatedCoordinates || lead.coordinates;
      if (typeof coords === 'string' && coords.includes(',')) {
        const [, lng] = coords.split(',').map(Number);
        return sum + lng;
      }
      return sum;
    }, 0);

    return [totalLat / validLeads.length, totalLng / validLeads.length];
  }, [leadsWithCoordinates]);

  // Função para obter cor do marcador baseado no potencial
  const getMarkerColor = (potentialLevel: string) => {
    switch (potentialLevel) {
      case 'alto': return '#16a34a'; // Verde mais escuro
      case 'médio': return '#ca8a04'; // Amarelo mais escuro
      case 'baixo': return '#dc2626'; // Vermelho mais escuro
      default: return '#4b5563'; // Cinza mais escuro
    }
  };

  // Função para obter coordenadas do lead
  const getLeadCoordinates = (lead: Lead): [number, number] | null => {
    let coords: string | null = null;

    // Priorizar coordenadas validadas
    if (lead.validatedCoordinates && typeof lead.validatedCoordinates === 'object') {
      const validated = lead.validatedCoordinates as any;
      if (validated.latitude && validated.longitude) {
        return [validated.latitude, validated.longitude];
      }
    }

    // Usar coordenadas do endereço original
    if (lead.coordinates && typeof lead.coordinates === 'string') {
      coords = lead.coordinates;
    }

    if (coords && coords.includes(',')) {
      const [lat, lng] = coords.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    return null;
  };

  // Função para formatar endereço
  const formatAddress = (lead: Lead): string => {
    const parts = [
      lead.validatedStreet || lead.streetAddress,
      lead.validatedNumber,
      lead.validatedNeighborhood || lead.neighborhood,
      lead.validatedCity || lead.city,
      lead.validatedState,
      lead.validatedZipCode || lead.zipCode,
    ].filter(Boolean);

    return parts.join(', ');
  };

  // Função para obter classe do badge baseado no potencial
  const getBadgeClass = (potentialLevel: string) => {
    switch (potentialLevel) {
      case 'alto': return 'leads-map-popup-badge leads-map-popup-badge-green';
      case 'médio': return 'leads-map-popup-badge leads-map-popup-badge-yellow';
      case 'baixo': return 'leads-map-popup-badge leads-map-popup-badge-red';
      default: return 'leads-map-popup-badge leads-map-popup-badge-red';
    }
  };

  // Função para obter classe do badge baseado no status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'processado': return 'leads-map-popup-badge leads-map-popup-badge-green';
      case 'aguardando': return 'leads-map-popup-badge leads-map-popup-badge-yellow';
      case 'erro': return 'leads-map-popup-badge leads-map-popup-badge-red';
      default: return 'leads-map-popup-badge leads-map-popup-badge-red';
    }
  };

  if (loading) {
    return (
      <div className="leads-map-loading">
        <div className="leads-map-loading-text">Carregando mapa...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leads-map-error">
        <div className="leads-map-error-text">{error}</div>
      </div>
    );
  }

  return (
    <div className="leads-map-container">
      {/* Header */}
      <div className="leads-map-header">
        <div className="leads-map-header-content">
          <div>
            <h1 className="leads-map-title">Mapa de Leads</h1>
            <p className="leads-map-subtitle">
              {leadsWithCoordinates.length} leads com localização
            </p>
          </div>
          
          {/* Filtros */}
          <div className="leads-map-filters">
            <select
              value={filters.potentialLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, potentialLevel: e.target.value }))}
              className="leads-map-select"
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
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
              className="leads-map-input"
            />
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="leads-map-map-container">
        <MapContainer
          center={mapCenter as [number, number]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {leadsWithCoordinates.map((lead) => {
            const coordinates = getLeadCoordinates(lead);
            if (!coordinates) return null;

            return (
              <CircleMarker
                key={lead.id}
                center={coordinates}
                radius={12}
                fillColor={getMarkerColor(lead.potentialLevel)}
                color={getMarkerColor(lead.potentialLevel)}
                weight={3}
                opacity={1}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="leads-map-popup">
                    <h3 className="leads-map-popup-title">{lead.companyName}</h3>
                    <p className="leads-map-popup-text">
                      <strong>CNPJ:</strong> {lead.cnpj}
                    </p>
                    <p className="leads-map-popup-text">
                      <strong>Endereço:</strong> {formatAddress(lead)}
                    </p>
                    <p className="leads-map-popup-text">
                      <strong>CNAE: {lead.cnae} </strong> {lead.cnaeDescription}
                    </p>
                    <p className="leads-map-popup-text">
                      <strong>Potencial:</strong> 
                      <span className={getBadgeClass(lead.potentialLevel)}>
                        {lead.potentialLevel.toUpperCase()} ({lead.potentialScore} pts)
                      </span>
                    </p>
                    <p className="leads-map-popup-text">
                      <strong>Status:</strong> 
                      <span className={getStatusBadgeClass(lead.status)}>
                        {lead.status}
                      </span>
                    </p>
                    {lead.capitalSocial && (
                      <p className="leads-map-popup-text">
                        <strong>Capital:</strong> R$ {lead.capitalSocial.toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legenda */}
        <div className="leads-map-legend">
          <h4 className="leads-map-legend-title">Legenda</h4>
          <div className="leads-map-legend-items">
            <div className="leads-map-legend-item">
              <div className="leads-map-legend-color" style={{ backgroundColor: '#16a34a' }}></div>
              <span className="leads-map-legend-text">Alto Potencial</span>
            </div>
            <div className="leads-map-legend-item">
              <div className="leads-map-legend-color" style={{ backgroundColor: '#ca8a04' }}></div>
              <span className="leads-map-legend-text">Médio Potencial</span>
            </div>
            <div className="leads-map-legend-item">
              <div className="leads-map-legend-color" style={{ backgroundColor: '#dc2626' }}></div>
              <span className="leads-map-legend-text">Baixo Potencial</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
