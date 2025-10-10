import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Polyline } from 'react-leaflet';
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

interface RoutePoint {
  lead: Lead;
  coordinates: [number, number];
  order: number;
}

export const LeadsMap: React.FC<LeadsMapProps> = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    potentialLevel: '',
    status: '',
    city: '',
    cnae: '',
  });
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [isRouteMode, setIsRouteMode] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState('');

  // Buscar leads
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const data = await leadsAPI.getAllLeads();
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

  // Obter CNAEs únicos dos leads
  const uniqueCnaes = useMemo(() => {
    const cnaeMap = new Map();
    
    leads.forEach(lead => {
      if (lead.cnae && lead.cnaeDescription) {
        const key = `${lead.cnae} - ${lead.cnaeDescription}`;
        if (!cnaeMap.has(key)) {
          cnaeMap.set(key, {
            cnae: lead.cnae,
            description: lead.cnaeDescription
          });
        }
      }
    });
    
    return Array.from(cnaeMap.values()).sort((a, b) => a.description.localeCompare(b.description));
  }, [leads]);

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
      const cnaeMatch = !filters.cnae || lead.cnae === filters.cnae;

      return hasCoordinates && potentialMatch && statusMatch && cityMatch && cnaeMatch;
    });
    
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

  // Funções para gerenciar a rota
  const toggleRouteMode = () => {
    setIsRouteMode(!isRouteMode);
    if (isRouteMode) {
      setRoutePoints([]);
    }
  };

  const addToRoute = (lead: Lead) => {
    if (!isRouteMode) return;
    
    const coordinates = getLeadCoordinates(lead);
    if (!coordinates) return;

    const isAlreadyInRoute = routePoints.some(point => point.lead.id === lead.id);
    if (isAlreadyInRoute) return;

    const newPoint: RoutePoint = {
      lead,
      coordinates,
      order: routePoints.length + 1
    };

    setRoutePoints(prev => [...prev, newPoint]);
  };

  const removeFromRoute = (leadId: string) => {
    setRoutePoints(prev => {
      const filtered = prev.filter(point => point.lead.id !== leadId);
      // Reordenar os pontos restantes
      return filtered.map((point, index) => ({
        ...point,
        order: index + 1
      }));
    });
  };

  const clearRoute = () => {
    setRoutePoints([]);
  };

  const movePointUp = (index: number) => {
    if (index === 0) return;
    
    setRoutePoints(prev => {
      const newPoints = [...prev];
      [newPoints[index - 1], newPoints[index]] = [newPoints[index], newPoints[index - 1]];
      return newPoints.map((point, i) => ({ ...point, order: i + 1 }));
    });
  };

  const movePointDown = (index: number) => {
    if (index === routePoints.length - 1) return;
    
    setRoutePoints(prev => {
      const newPoints = [...prev];
      [newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]];
      return newPoints.map((point, i) => ({ ...point, order: i + 1 }));
    });
  };

  // Função para calcular distância entre dois pontos (fórmula de Haversine)
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const [lat1, lng1] = coord1;
    const [lat2, lng2] = coord2;
    
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Função para calcular ganho de uma troca 2-Opt
  const calculate2OptGain = (
    route: RoutePoint[], 
    i: number, 
    j: number
  ): number => {
    const n = route.length;
    
    // Verificar limites e existência dos pontos
    if (i < 0 || j >= n || i >= j - 1 || 
        !route[i] || !route[i + 1] || !route[j] || !route[j + 1]) {
      return 0;
    }
    
    // Distância atual das arestas que serão removidas
    const currentDistance = 
      calculateDistance(route[i].coordinates, route[i + 1].coordinates) +
      calculateDistance(route[j].coordinates, route[j + 1].coordinates);
    
    // Distância das novas arestas que serão adicionadas
    const newDistance = 
      calculateDistance(route[i].coordinates, route[j].coordinates) +
      calculateDistance(route[i + 1].coordinates, route[j + 1].coordinates);
    
    return currentDistance - newDistance;
  };

  // Função para aplicar troca 2-Opt
  const apply2OptSwap = (route: RoutePoint[], i: number, j: number): RoutePoint[] => {
    const newRoute = [...route];
    
    // Verificar limites
    if (i < 0 || j >= newRoute.length || i >= j - 1) {
      return newRoute;
    }
    
    // Troca 2-Opt: reverter o segmento entre i+1 e j
    if (i + 1 < j) {
      const segment = newRoute.slice(i + 1, j + 1);
      segment.reverse();
      newRoute.splice(i + 1, j - i, ...segment);
    }
    
    return newRoute;
  };

  // Função para otimizar a rota usando algoritmo 2-Opt
  const optimizeRoute = async () => {
    if (routePoints.length < 3) return;
    
    setIsOptimizing(true);
    setOptimizationProgress('Iniciando otimização...');
    
    // Simular delay para mostrar loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let currentRoute = [...routePoints]
      .sort((a, b) => a.order - b.order)
      .filter(point => point && point.coordinates); // Filtrar pontos válidos
    
    // Verificar se temos pontos suficientes após filtragem
    if (currentRoute.length < 3) {
      setOptimizationProgress('Não há pontos suficientes para otimização');
      setIsOptimizing(false);
      return;
    }
    
    let improved = true;
    let iterations = 0;
    const maxIterations = 50; // Limite para evitar loops infinitos
    
    console.log('Rota inicial:', currentRoute.map(p => p.lead.companyName));
    console.log('Coordenadas:', currentRoute.map(p => p.coordinates));
    
    // Algoritmo 2-Opt
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      setOptimizationProgress(`Iteração ${iterations} - Analisando melhorias...`);
      
      let bestGain = 0;
      let bestI = -1;
      let bestJ = -1;
      
      // Tentar todas as possíveis trocas 2-Opt
      for (let i = 0; i < currentRoute.length - 1; i++) {
        for (let j = i + 2; j < currentRoute.length; j++) {
          // Verificar se os pontos existem antes de calcular o ganho
          if (currentRoute[i] && currentRoute[i + 1] && 
              currentRoute[j] && currentRoute[j + 1]) {
            const gain = calculate2OptGain(currentRoute, i, j);
            
            if (gain > bestGain) {
              bestGain = gain;
              bestI = i;
              bestJ = j;
            }
          }
        }
      }
      
      console.log(`Iteração ${iterations}: Melhor ganho encontrado: ${bestGain.toFixed(3)} km`);
      
      // Aplicar a melhor troca encontrada
      if (bestGain > 0.001) {
        console.log(`Aplicando troca: ${bestI} -> ${bestJ}`);
        currentRoute = apply2OptSwap(currentRoute, bestI, bestJ);
        improved = true;
        setOptimizationProgress(`Iteração ${iterations} - Melhoria encontrada! Ganho: ${bestGain.toFixed(2)} km`);
        
        console.log('Nova rota:', currentRoute.map(p => p.lead.companyName));
        
        // Pequeno delay para mostrar progresso
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (iterations >= maxIterations) {
      setOptimizationProgress('Limite de iterações atingido');
    } else {
      setOptimizationProgress(`Otimização concluída em ${iterations} iterações`);
    }
    
    // Atualizar a ordem dos pontos
    const optimizedPoints = currentRoute.map((point, index) => ({
      ...point,
      order: index + 1
    }));
    
    setRoutePoints(optimizedPoints);
    setIsOptimizing(false);
  };

  // Calcular distância total da rota
  const totalDistance = useMemo(() => {
    if (routePoints.length < 2) return 0;
    
    const sortedPoints = routePoints.sort((a, b) => a.order - b.order);
    let total = 0;
    
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      total += calculateDistance(sortedPoints[i].coordinates, sortedPoints[i + 1].coordinates);
    }
    
    return total;
  }, [routePoints]);

  // Obter coordenadas da rota para o Polyline
  const routeCoordinates = useMemo(() => {
    return routePoints
      .sort((a, b) => a.order - b.order)
      .map(point => point.coordinates);
  }, [routePoints]);

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
            <button
              onClick={toggleRouteMode}
              className={`leads-map-route-button ${isRouteMode ? 'active' : ''}`}
            >
              {isRouteMode ? 'Sair do Modo Rota' : 'Modo Rota'}
            </button>

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

            <select
              value={filters.cnae}
              onChange={(e) => setFilters(prev => ({ ...prev, cnae: e.target.value }))}
              className="leads-map-select"
            >
              <option value="">Todos os CNAEs</option>
              {uniqueCnaes.map((cnaeData) => (
                <option key={cnaeData.cnae} value={cnaeData.cnae}>
                  {cnaeData.cnae} - {cnaeData.description}
                </option>
              ))}
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
        {/* Lista de Rota Flutuante */}
        {isRouteMode && (
          <div className="leads-map-route-panel">
            <div className="leads-map-route-panel-header">
              <div>
                <h3 className="leads-map-route-panel-title">Rota ({routePoints.length})</h3>
                {routePoints.length >= 2 && (
                  <p className="leads-map-route-panel-distance">
                    Distância total: {totalDistance.toFixed(1)} km
                  </p>
                )}
              </div>
              <div className="leads-map-route-panel-actions">
                {routePoints.length >= 3 && (
                  <button
                    onClick={optimizeRoute}
                    disabled={isOptimizing}
                    className="leads-map-route-optimize-button"
                    title="Otimizar rota"
                  >
                    {isOptimizing ? '⏳' : 'Calcular rota'}
                  </button>
                )}
                {routePoints.length > 0 && (
                  <button
                    onClick={clearRoute}
                    className="leads-map-route-clear-button"
                    title="Limpar rota"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div className="leads-map-route-panel-content">
              {isOptimizing ? (
                <div className="leads-map-route-optimizing">
                  <div className="leads-map-route-optimizing-spinner"></div>
                  <p className="leads-map-route-optimizing-text">
                    {optimizationProgress || 'Calculando melhor rota...'}
                  </p>
                </div>
              ) : routePoints.length === 0 ? (
                <p className="leads-map-route-empty">
                  Clique nos pontos do mapa para adicionar à rota
                </p>
              ) : (
                <div className="leads-map-route-list">
                  {routePoints
                    .sort((a, b) => a.order - b.order)
                    .map((point, index) => {
                      const isStart = index === 0;
                      const isEnd = index === (routePoints.length - 1);
                      const itemClass = isStart
                        ? 'leads-map-route-item leads-map-route-item-start'
                        : isEnd
                          ? 'leads-map-route-item leads-map-route-item-end'
                          : 'leads-map-route-item';
                      return (
                      <div key={point.lead.id} className={itemClass}>
                        {(isStart || isEnd) && (
                          <div className={`leads-map-route-fixed-tag ${isStart ? 'start' : 'end'}`}>
                            <span className="leads-map-route-fixed-pin">📌</span>
                            <span className="leads-map-route-fixed-text">{isStart ? 'Início' : 'Destino'}</span>
                          </div>
                        )}
                        <div className="leads-map-route-item-number">
                          {point.order}
                        </div>
                        <div className="leads-map-route-item-content">
                          <div className="leads-map-route-item-name">
                            {point.lead.companyName}
                          </div>
                          <div className="leads-map-route-item-address">
                            {formatAddress(point.lead)}
                          </div>
                        </div>
                         {(!isStart && !isEnd) && (
                          <div className="leads-map-route-item-actions">
                            <button
                              onClick={() => movePointUp(index)}
                              disabled={index === 0}
                              className="leads-map-route-action-button"
                              title="Mover para cima"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => movePointDown(index)}
                              disabled={index === routePoints.length - 1}
                              className="leads-map-route-action-button"
                              title="Mover para baixo"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeFromRoute(point.lead.id)}
                              className="leads-map-route-action-button"
                              title="Remover da rota"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    );})}
                </div>
              )}
            </div>
          </div>
        )}

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

          {/* Desenhar rota */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
            />
          )}

          {leadsWithCoordinates.map((lead) => {
            const coordinates = getLeadCoordinates(lead);
            if (!coordinates) return null;

            const isInRoute = routePoints.some(point => point.lead.id === lead.id);
            const routeOrder = routePoints.find(point => point.lead.id === lead.id)?.order;

            return (
              <CircleMarker
                key={lead.id}
                center={coordinates}
                radius={isInRoute ? 16 : 12}
                fillColor={isInRoute ? '#3b82f6' : getMarkerColor(lead.potentialLevel)}
                color={isInRoute ? '#1d4ed8' : getMarkerColor(lead.potentialLevel)}
                weight={isInRoute ? 4 : 3}
                opacity={1}
                fillOpacity={0.8}
                eventHandlers={{
                  click: () => addToRoute(lead)
                }}
              >
                <Popup>
                  <div className="leads-map-popup">
                    <h3 className="leads-map-popup-title">{lead.companyName}</h3>
                    
                    {isInRoute && (
                      <div className="leads-map-popup-route-info">
                        <span className="leads-map-popup-route-badge">
                          Ponto {routeOrder} da Rota
                        </span>
                      </div>
                    )}
                    
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
                    
                    {isRouteMode && (
                      <div className="leads-map-popup-actions">
                        {isInRoute ? (
                          <button
                            onClick={() => removeFromRoute(lead.id)}
                            className="leads-map-popup-button leads-map-popup-button-remove"
                          >
                            Remover da Rota
                          </button>
                        ) : (
                          <button
                            onClick={() => addToRoute(lead)}
                            className="leads-map-popup-button leads-map-popup-button-add"
                          >
                            Adicionar à Rota
                          </button>
                        )}
                      </div>
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
