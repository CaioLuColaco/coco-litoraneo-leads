import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Lead } from '../types';
import { leadsAPI, sellersAPI } from '../services/api';
import { Seller } from '../types';

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
  const [hoveredRouteItem, setHoveredRouteItem] = useState<string | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const hoverOpenTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      Object.values(hoverOpenTimeoutsRef.current).forEach((t) => {
        if (t) clearTimeout(t);
      });
      hoverOpenTimeoutsRef.current = {};
    };
  }, []);

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

  // Buscar vendedores com coordenadas
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const data = await sellersAPI.getAll();
        setSellers(data.filter((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'));
      } catch (err) {
        console.warn('Não foi possível carregar vendedores:', err);
      }
    };
    fetchSellers();
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
    setSelectedSeller(null);
  };

  // Função para recalcular rota quando vendedor muda
  const recalculateRouteForSeller = (newSeller: Seller | null) => {
    if (routePoints.length >= 3 && newSeller && newSeller.latitude && newSeller.longitude) {
      // Reordenar pontos baseado na proximidade do novo vendedor
      const sellerCoords: [number, number] = [newSeller.latitude, newSeller.longitude];
      
      const sortedPoints = [...routePoints].sort((a, b) => {
        const distA = calculateDistance(sellerCoords, a.coordinates);
        const distB = calculateDistance(sellerCoords, b.coordinates);
        return distA - distB;
      });
      
      setRoutePoints(sortedPoints.map((point, index) => ({
        ...point,
        order: index + 1
      })));
    }
  };

  const exportToGoogleMaps = () => {
    if (routePoints.length < 2) {
      alert('Adicione pelo menos 2 pontos à rota para exportar');
      return;
    }

    // Ordenar pontos pela ordem de visitação
    const sortedPoints = [...routePoints].sort((a, b) => a.order - b.order);
    
    // Se há vendedor selecionado, usar como ponto de partida
    let destinations: string[] = [];
    if (selectedSeller && selectedSeller.latitude && selectedSeller.longitude) {
      destinations.push(`${selectedSeller.latitude},${selectedSeller.longitude}`);
    }
    
    // Adicionar pontos da rota
    destinations.push(...sortedPoints.map(point => 
      `${point.coordinates[0]},${point.coordinates[1]}`
    ));
    
    // Se há vendedor selecionado, usar como ponto final também
    if (selectedSeller && selectedSeller.latitude && selectedSeller.longitude && destinations.length > 1) {
      destinations.push(`${selectedSeller.latitude},${selectedSeller.longitude}`);
    }
    
    // URL do Google Maps com direções
    const googleMapsUrl = `https://www.google.com/maps/dir/${destinations.join('/')}`;
    
    // Abrir em nova aba
    window.open(googleMapsUrl, '_blank');
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

  // Função para calcular distância total da rota considerando vendedor
  const calculateTotalRouteDistance = (route: RoutePoint[]): number => {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    const sellerCoords: [number, number] | null = selectedSeller && selectedSeller.latitude && selectedSeller.longitude 
      ? [selectedSeller.latitude, selectedSeller.longitude] 
      : null;
    
    // Distância do vendedor para o primeiro ponto (se houver vendedor)
    if (sellerCoords && route.length > 0) {
      totalDistance += calculateDistance(sellerCoords, route[0].coordinates);
    }
    
    // Distâncias entre pontos consecutivos
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += calculateDistance(route[i].coordinates, route[i + 1].coordinates);
    }
    
    // Distância do último ponto para o vendedor (se houver vendedor)
    if (sellerCoords && route.length > 0) {
      totalDistance += calculateDistance(route[route.length - 1].coordinates, sellerCoords);
    }
    
    return totalDistance;
  };

  // Função para calcular ganho de uma troca 3-Opt considerando vendedor
  const calculate3OptGain = (
    route: RoutePoint[], 
    i: number, 
    j: number, 
    k: number
  ): number => {
    const n = route.length;
    
    // Verificar limites
    if (i < 0 || j <= i || k <= j || k >= n - 1) {
      return 0;
    }
    
    // Calcular distância atual
    const currentDistance = calculateTotalRouteDistance(route);
    
    // Aplicar troca 3-Opt e calcular nova distância
    const newRoute = apply3OptSwap(route, i, j, k);
    const newDistance = calculateTotalRouteDistance(newRoute);
    
    return currentDistance - newDistance;
  };

  // Função para aplicar troca 3-Opt
  const apply3OptSwap = (route: RoutePoint[], i: number, j: number, k: number): RoutePoint[] => {
    const newRoute = [...route];
    
    // Verificar limites
    if (i < 0 || j <= i || k <= j || k >= newRoute.length - 1) {
      return newRoute;
    }
    
    // 3-Opt: remover 3 arestas e reconectar de 7 maneiras possíveis
    // Vamos implementar a reconexão mais comum: trocar segmentos
    
    // Segmentos originais: [0...i], [i+1...j], [j+1...k], [k+1...n-1]
    const segment1 = newRoute.slice(0, i + 1);
    const segment2 = newRoute.slice(i + 1, j + 1);
    const segment3 = newRoute.slice(j + 1, k + 1);
    const segment4 = newRoute.slice(k + 1);
    
    // Reconexão: [0...i] + [j+1...k] + [i+1...j] + [k+1...n-1]
    return [...segment1, ...segment3, ...segment2, ...segment4];
  };

  // Função para embaralhar array (Fisher-Yates shuffle)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Função para criar embaralhamento baseado em proximidade (Nearest Neighbor)
  const createNearestNeighborRoute = (points: RoutePoint[]): RoutePoint[] => {
    if (points.length === 0) return [];
    
    const result: RoutePoint[] = [];
    const remaining = [...points];
    
    // Começar com o primeiro ponto
    let current = remaining.shift()!;
    result.push(current);
    
    // Para cada ponto restante, encontrar o mais próximo
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = calculateDistance(current.coordinates, remaining[0].coordinates);
      
      for (let i = 1; i < remaining.length; i++) {
        const distance = calculateDistance(current.coordinates, remaining[i].coordinates);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
      
      current = remaining.splice(nearestIndex, 1)[0];
      result.push(current);
    }
    
    return result;
  };

  // Função para criar embaralhamento baseado em distância do vendedor
  const createDistanceBasedRoute = (points: RoutePoint[]): RoutePoint[] => {
    if (!selectedSeller || !selectedSeller.latitude || !selectedSeller.longitude) {
      return shuffleArray(points);
    }
    
    const sellerCoords: [number, number] = [selectedSeller.latitude, selectedSeller.longitude];
    
    // Ordenar por distância do vendedor (mais próximo primeiro)
    return [...points].sort((a, b) => {
      const distA = calculateDistance(sellerCoords, a.coordinates);
      const distB = calculateDistance(sellerCoords, b.coordinates);
      return distA - distB;
    });
  };

  // Função para criar rota baseada em clusters geográficos
  const createClusterBasedRoute = (points: RoutePoint[]): RoutePoint[] => {
    if (points.length <= 3) return shuffleArray(points);
    
    // Dividir pontos em clusters baseado na latitude
    const sortedByLat = [...points].sort((a, b) => a.coordinates[0] - b.coordinates[0]);
    const midPoint = Math.floor(sortedByLat.length / 2);
    
    const cluster1 = sortedByLat.slice(0, midPoint);
    const cluster2 = sortedByLat.slice(midPoint);
    
    // Embaralhar cada cluster
    const shuffledCluster1 = shuffleArray(cluster1);
    const shuffledCluster2 = shuffleArray(cluster2);
    
    // Alternar entre clusters
    const result: RoutePoint[] = [];
    const maxLength = Math.max(shuffledCluster1.length, shuffledCluster2.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < shuffledCluster1.length) result.push(shuffledCluster1[i]);
      if (i < shuffledCluster2.length) result.push(shuffledCluster2[i]);
    }
    
    return result;
  };

  // Função para criar rota com perturbação aleatória
  const createPerturbedRoute = (points: RoutePoint[]): RoutePoint[] => {
    const route = [...points];
    
    // Aplicar múltiplas perturbações aleatórias
    for (let i = 0; i < Math.floor(points.length / 2); i++) {
      const index1 = Math.floor(Math.random() * route.length);
      const index2 = Math.floor(Math.random() * route.length);
      
      if (index1 !== index2) {
        [route[index1], route[index2]] = [route[index2], route[index1]];
      }
    }
    
    return route;
  };

  // Função para aplicar 2-Opt como perturbação
  const applyRandom2Opt = (route: RoutePoint[]): RoutePoint[] => {
    if (route.length < 4) return route;
    
    const newRoute = [...route];
    const i = Math.floor(Math.random() * (newRoute.length - 1));
    const j = Math.floor(Math.random() * (newRoute.length - 1));
    
    if (Math.abs(i - j) > 1) {
      // Aplicar 2-Opt swap
      const segment = newRoute.slice(Math.min(i, j) + 1, Math.max(i, j) + 1);
      segment.reverse();
      newRoute.splice(Math.min(i, j) + 1, Math.max(i, j) - Math.min(i, j), ...segment);
    }
    
    return newRoute;
  };

  // Função para otimizar uma rota específica com 3-Opt e perturbações
  const optimizeSingleRoute = async (route: RoutePoint[], attemptNumber: number): Promise<{ route: RoutePoint[], distance: number, iterations: number }> => {
    let currentRoute = [...route];
    let bestRoute = [...route];
    let bestDistance = calculateTotalRouteDistance(currentRoute);
    let iterations = 0;
    let stagnationCount = 0;
    const maxIterations = 25;
    const maxStagnation = 5;
    
    while (iterations < maxIterations) {
      iterations++;
      
      let bestGain = 0;
      let bestI = -1;
      let bestJ = -1;
      let bestK = -1;
      
      // Tentar todas as possíveis trocas 3-Opt
      for (let i = 0; i < currentRoute.length - 3; i++) {
        for (let j = i + 1; j < currentRoute.length - 2; j++) {
          for (let k = j + 1; k < currentRoute.length - 1; k++) {
            const gain = calculate3OptGain(currentRoute, i, j, k);
            
            if (gain > bestGain) {
              bestGain = gain;
              bestI = i;
              bestJ = j;
              bestK = k;
            }
          }
        }
      }
      
      // Aplicar a melhor troca encontrada
      if (bestGain > 0.001) {
        currentRoute = apply3OptSwap(currentRoute, bestI, bestJ, bestK);
        stagnationCount = 0;
        
        // Verificar se é a melhor rota até agora
        const currentDistance = calculateTotalRouteDistance(currentRoute);
        if (currentDistance < bestDistance) {
          bestRoute = [...currentRoute];
          bestDistance = currentDistance;
        }
      } else {
        stagnationCount++;
        
        // Se estagnou, aplicar perturbação
        if (stagnationCount >= maxStagnation) {
          currentRoute = applyRandom2Opt(currentRoute);
          stagnationCount = 0;
        }
      }
    }
    
    return {
      route: bestRoute,
      distance: bestDistance,
      iterations
    };
  };

  // Função para otimizar a rota usando múltiplas tentativas com embaralhamento
  const optimizeRoute = async () => {
    if (routePoints.length < 4) {
      alert('Adicione pelo menos 4 pontos para otimizar a rota com 3-Opt');
      return;
    }
    
    if (!selectedSeller || !selectedSeller.latitude || !selectedSeller.longitude) {
      alert('Selecione um vendedor para otimizar a rota');
      return;
    }
    
    setIsOptimizing(true);
    setOptimizationProgress('Iniciando otimização com múltiplas tentativas...');
    
    // Simular delay para mostrar loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let baseRoute = [...routePoints]
      .sort((a, b) => a.order - b.order)
      .filter(point => point && point.coordinates); // Filtrar pontos válidos
    
    // Verificar se temos pontos suficientes após filtragem
    if (baseRoute.length < 4) {
      setOptimizationProgress('Não há pontos suficientes para otimização 3-Opt');
      setIsOptimizing(false);
      return;
    }
    
    const initialDistance = calculateTotalRouteDistance(baseRoute);
    
    // Criar 5 versões com estratégias diferentes de embaralhamento
    const attempts = [
      // Tentativa 1: Ordem original
      {
        route: baseRoute.map((point, index) => ({ ...point, order: index + 1 })),
        strategy: 'Ordem Original'
      },
      // Tentativa 2: Nearest Neighbor (algoritmo guloso)
      {
        route: createNearestNeighborRoute(baseRoute).map((point, index) => ({ ...point, order: index + 1 })),
        strategy: 'Nearest Neighbor'
      },
      // Tentativa 3: Ordenado por distância do vendedor
      {
        route: createDistanceBasedRoute(baseRoute).map((point, index) => ({ ...point, order: index + 1 })),
        strategy: 'Distância do Vendedor'
      },
      // Tentativa 4: Clusters geográficos
      {
        route: createClusterBasedRoute(baseRoute).map((point, index) => ({ ...point, order: index + 1 })),
        strategy: 'Clusters Geográficos'
      },
      // Tentativa 5: Perturbação aleatória + 2-Opt
      {
        route: applyRandom2Opt(createPerturbedRoute(baseRoute)).map((point, index) => ({ ...point, order: index + 1 })),
        strategy: 'Perturbação + 2-Opt'
      }
    ];
    
    const results: { route: RoutePoint[], distance: number, iterations: number, strategy: string }[] = [];
    
    // Otimizar cada tentativa
    for (let i = 0; i < attempts.length; i++) {
      setOptimizationProgress(`Otimizando tentativa ${i + 1}/5 (${attempts[i].strategy})...`);
      const result = await optimizeSingleRoute(attempts[i].route, i + 1);
      results.push({ ...result, strategy: attempts[i].strategy });
      
      // Pequeno delay entre tentativas
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Encontrar a melhor tentativa
    const bestResult = results.reduce((best, current) => 
      current.distance < best.distance ? current : best
    );
    
    const totalImprovement = initialDistance - bestResult.distance;
    const bestAttemptIndex = results.findIndex(r => r === bestResult) + 1;
    
    // Atualizar a ordem dos pontos com a melhor rota
    const optimizedPoints = bestResult.route.map((point, index) => ({
      ...point,
      order: index + 1
    }));
    
    setRoutePoints(optimizedPoints);
    
    setOptimizationProgress(`Melhor rota: ${bestResult.strategy} (tentativa ${bestAttemptIndex})! Melhoria: ${totalImprovement.toFixed(2)}km`);
    
    setTimeout(() => {
      setOptimizationProgress('');
    }, 4000);
    
    setIsOptimizing(false);
  };

  // Calcular distância total da rota (considerando vendedor se selecionado)
  const totalDistance = useMemo(() => {
    if (routePoints.length < 2) return 0;
    
    const sortedPoints = routePoints.sort((a, b) => a.order - b.order);
    let total = 0;
    
    // Se há vendedor selecionado, incluir distâncias do vendedor
    if (selectedSeller && selectedSeller.latitude && selectedSeller.longitude) {
      const sellerCoords: [number, number] = [selectedSeller.latitude, selectedSeller.longitude];
      
      // Distância do vendedor para o primeiro ponto
      const distToFirst = calculateDistance(sellerCoords, sortedPoints[0].coordinates);
      total += distToFirst;
      
      // Distâncias entre pontos consecutivos
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const dist = calculateDistance(sortedPoints[i].coordinates, sortedPoints[i + 1].coordinates);
        total += dist;
      }
      
      // Distância do último ponto para o vendedor
      const distFromLast = calculateDistance(sortedPoints[sortedPoints.length - 1].coordinates, sellerCoords);
      total += distFromLast;
    } else {
      // Se não há vendedor, calcular apenas distâncias entre pontos
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const dist = calculateDistance(sortedPoints[i].coordinates, sortedPoints[i + 1].coordinates);
        total += dist;
      }
    }
    
    return total;
  }, [routePoints, selectedSeller]);

  // Obter coordenadas da rota para o Polyline (incluindo vendedor se selecionado)
  const routeCoordinates = useMemo(() => {
    const coordinates: [number, number][] = [];
    
    // Adicionar ponto inicial do vendedor se selecionado
    if (selectedSeller && selectedSeller.latitude && selectedSeller.longitude) {
      coordinates.push([selectedSeller.latitude, selectedSeller.longitude]);
    }
    
    // Adicionar pontos da rota ordenados
    coordinates.push(...routePoints
      .sort((a, b) => a.order - b.order)
      .map(point => point.coordinates)
    );
    
    // Adicionar ponto final do vendedor se selecionado (e há pontos na rota)
    if (selectedSeller && selectedSeller.latitude && selectedSeller.longitude && routePoints.length > 0) {
      coordinates.push([selectedSeller.latitude, selectedSeller.longitude]);
    }
    
    return coordinates;
  }, [routePoints, selectedSeller]);

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
                {(routePoints.length >= 2 || (selectedSeller && routePoints.length >= 1)) && (
                  <p className="leads-map-route-panel-distance">
                    {totalDistance.toFixed(1)} km
                  </p>
                )}
              </div>
              <div className="leads-map-route-panel-actions">
                {routePoints.length >= 4 && (
                  <button
                    onClick={optimizeRoute}
                    disabled={isOptimizing}
                    className="leads-map-route-optimize-button"
                    title="Otimizar rota com múltiplas tentativas 3-Opt"
                  >
                    {isOptimizing ? '⏳' : 'Calcular rota'}
                  </button>
                )}
                {routePoints.length >= 2 && (
                  <button
                    onClick={exportToGoogleMaps}
                    className="leads-map-route-export-button"
                    title="Exportar rota para Google Maps"
                  >
                    <span>📍</span> Google Maps
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
            
            {/* Seleção de vendedor */}
            <div className="leads-map-route-seller-selection">
              <label className="leads-map-route-seller-label">Vendedor responsável:</label>
              <select
                value={selectedSeller?.id || ''}
                onChange={(e) => {
                  const seller = sellers.find(s => s.id === e.target.value);
                  const newSeller = seller || null;
                  setSelectedSeller(newSeller);
                  recalculateRouteForSeller(newSeller);
                }}
                className="leads-map-route-seller-select"
              >
                <option value="">Selecione um vendedor</option>
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} - {seller.responsibleRegion}
                  </option>
                ))}
              </select>
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
                  {/* Ponto inicial do vendedor */}
                  {selectedSeller && (
                    <div className="leads-map-route-item leads-map-route-item-start">
                      <div className="leads-map-route-fixed-tag start">
                        <span className="leads-map-route-fixed-pin">🏠</span>
                        <span className="leads-map-route-fixed-text">Início</span>
                      </div>
                      <div className="leads-map-route-item-number">0</div>
                      <div className="leads-map-route-item-content">
                        <div className="leads-map-route-item-name">{selectedSeller.name}</div>
                        <div className="leads-map-route-item-address">{selectedSeller.address}, {selectedSeller.city}/{selectedSeller.state}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Pontos da rota */}
                  {routePoints
                    .sort((a, b) => a.order - b.order)
                    .map((point, index) => {
                      const isHovered = hoveredRouteItem === point.lead.id;
                      const itemClass = 'leads-map-route-item'; // Todos os pontos da rota são iguais agora
                      const finalClass = isHovered ? `${itemClass} leads-map-route-item-hovered` : itemClass;
                      return (
                        <div 
                          key={point.lead.id} 
                          className={finalClass}
                          onMouseEnter={() => {
                            setHoveredRouteItem(point.lead.id);
                          }}
                          onMouseLeave={() => {
                            setHoveredRouteItem(null);
                          }}
                        >
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
                        </div>
                      );
                    })}
                  
                  {/* Ponto final do vendedor */}
                  {selectedSeller && routePoints.length > 0 && (
                    <div className="leads-map-route-item leads-map-route-item-end">
                      <div className="leads-map-route-fixed-tag end">
                        <span className="leads-map-route-fixed-pin">🏠</span>
                        <span className="leads-map-route-fixed-text">Destino</span>
                      </div>
                      <div className="leads-map-route-item-number">{routePoints.length + 1}</div>
                      <div className="leads-map-route-item-content">
                        <div className="leads-map-route-item-name">{selectedSeller.name}</div>
                        <div className="leads-map-route-item-address">{selectedSeller.address}, {selectedSeller.city}/{selectedSeller.state}</div>
                      </div>
                    </div>
                  )}
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
            const isHovered = hoveredRouteItem === lead.id;

            return (
              <CircleMarker
                key={lead.id}
                center={coordinates}
                radius={isHovered ? (isInRoute ? 20 : 16) : (isInRoute ? 16 : 12)}
                fillColor={isInRoute ? '#3b82f6' : getMarkerColor(lead.potentialLevel)}
                color={isInRoute ? '#1d4ed8' : getMarkerColor(lead.potentialLevel)}
                weight={isHovered ? 5 : (isInRoute ? 4 : 3)}
                opacity={isHovered ? 0.9 : 1}
                fillOpacity={isHovered ? 0.9 : 0.8}
                eventHandlers={{
                  click: () => addToRoute(lead),
                  mouseover: (e: any) => {
                    // Abrir popup após 500ms se o mouse permanecer no marcador
                    const id = lead.id;
                    if (hoverOpenTimeoutsRef.current[id]) {
                      clearTimeout(hoverOpenTimeoutsRef.current[id] as NodeJS.Timeout);
                    }
                    hoverOpenTimeoutsRef.current[id] = setTimeout(() => {
                      e.target.openPopup();
                      hoverOpenTimeoutsRef.current[id] = null;
                    }, 250);
                  },
                  mouseout: (e: any) => {
                    // Cancelar abertura adiada, se existir
                    const id = lead.id;
                    if (hoverOpenTimeoutsRef.current[id]) {
                      clearTimeout(hoverOpenTimeoutsRef.current[id] as NodeJS.Timeout);
                      hoverOpenTimeoutsRef.current[id] = null;
                    }
                    // Aguardar um pouco antes de fechar para permitir mouseover no popup
                    setTimeout(() => {
                      const popup = e.target.getPopup();
                      if (popup && popup.getElement()) {
                        const popupElement = popup.getElement();
                        // Verificar se o mouse ainda está sobre o popup ou marcador
                        if (!popupElement.matches(':hover') && !e.target.getElement().matches(':hover')) {
                          e.target.closePopup();
                        }
                      } else {
                        e.target.closePopup();
                      }
                    }, 150);
                  }
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

          {/* Marcadores de vendedores */}
          {sellers.map((seller: Seller) => (
            <CircleMarker
              key={`seller-${seller.id}`}
              center={[seller.latitude as number, seller.longitude as number]}
              radius={12}
              fillColor={'#8b5cf6'}
              color={'#6d28d9'}
              weight={4}
              opacity={1}
              fillOpacity={0.9}
              eventHandlers={{
                click: (e: any) => {
                  e.target.openPopup();
                },
                mouseover: (e: any) => {
                  const id = `seller-${seller.id}`;
                  if (hoverOpenTimeoutsRef.current[id]) {
                    clearTimeout(hoverOpenTimeoutsRef.current[id] as NodeJS.Timeout);
                  }
                  hoverOpenTimeoutsRef.current[id] = setTimeout(() => {
                    e.target.openPopup();
                    hoverOpenTimeoutsRef.current[id] = null;
                  }, 250);
                },
                mouseout: (e: any) => {
                  const id = `seller-${seller.id}`;
                  if (hoverOpenTimeoutsRef.current[id]) {
                    clearTimeout(hoverOpenTimeoutsRef.current[id] as NodeJS.Timeout);
                    hoverOpenTimeoutsRef.current[id] = null;
                  }
                  setTimeout(() => {
                    const popup = e.target.getPopup();
                    if (popup && popup.getElement()) {
                      const popupElement = popup.getElement();
                      if (!popupElement.matches(':hover') && !e.target.getElement().matches(':hover')) {
                        e.target.closePopup();
                      }
                    } else {
                      e.target.closePopup();
                    }
                  }, 150);
                }
              }}
            >
              <Popup>
                <div className="leads-map-popup">
                  <h3 className="leads-map-popup-title">{seller.name}</h3>
                  {seller.imageUrl && (
                    <div style={{ margin: '8px 0' }}>
                      <img src={seller.imageUrl} alt={seller.name} style={{ width: '100%', height: 'auto', borderRadius: '6px', objectFit: 'cover' }} />
                    </div>
                  )}
                  <p className="leads-map-popup-text"><strong>E-mail:</strong> {seller.email}</p>
                  <p className="leads-map-popup-text"><strong>Telefone:</strong> {seller.phone}</p>
                  <p className="leads-map-popup-text"><strong>Região:</strong> {seller.responsibleRegion}</p>
                  <p className="leads-map-popup-text"><strong>Cidade/UF:</strong> {seller.city}/{seller.state}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
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
            <div className="leads-map-legend-item">
              <div className="leads-map-legend-color" style={{ backgroundColor: '#8b5cf6' }}></div>
              <span className="leads-map-legend-text">Vendedores</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
