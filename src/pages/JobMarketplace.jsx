import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/AuthContext";
import { QuoteRequest, ProfessionalService, Category } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Briefcase, Trophy, ChevronDown, Filter, MapPin, Clock, DollarSign, AlertCircle, TrendingUp, Navigation } from "lucide-react";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/componentes/interface do usuário/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/interface do usuário/select";
import LocationSearch from "@/componentes/procurar/LocationSearch";
import RespondQuoteDialog from "@/componentes/profissional/RespondQuoteDialog";

// Itens por pagina
const ITEMS_PER_PAGE = 12;

// Calcula distancia entre duas coordenadas (formula de Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Estados brasileiros
const ESTADOS = [
  { value: 'all', label: 'Todos os Estados' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapa' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceara' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espirito Santo' },
  { value: 'GO', label: 'Goias' },
  { value: 'MA', label: 'Maranhao' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Para' },
  { value: 'PB', label: 'Paraiba' },
  { value: 'PR', label: 'Parana' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piaui' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondonia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'Sao Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

// Opcoes de urgencia
const URGENCY_OPTIONS = [
  { value: 'all', label: 'Qualquer urgencia' },
  { value: 'urgente', label: 'Urgente', icon: '🔴' },
  { value: 'esta_semana', label: 'Esta semana', icon: '🟡' },
  { value: 'este_mes', label: 'Este mes', icon: '🟢' },
  { value: 'flexivel', label: 'Flexivel', icon: '⚪' }
];

// Faixas de orcamento
const BUDGET_OPTIONS = [
  { value: 'all', label: 'Qualquer valor' },
  { value: 'ate_500', label: 'Ate R$ 500' },
  { value: '500_1000', label: 'R$ 500 - R$ 1.000' },
  { value: '1000_3000', label: 'R$ 1.000 - R$ 3.000' },
  { value: '3000_5000', label: 'R$ 3.000 - R$ 5.000' },
  { value: 'acima_5000', label: 'Acima de R$ 5.000' }
];

// Skeleton para loading
const CardSkeleton = memo(() => (
  <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
      <div className="h-6 bg-slate-200 rounded w-20" />
    </div>
    <div className="flex gap-2 mb-3">
      <div className="h-6 bg-slate-200 rounded w-24" />
      <div className="h-6 bg-slate-200 rounded w-16" />
    </div>
    <div className="h-10 bg-slate-200 rounded mt-4" />
  </div>
));

// Header memoizado
const PageHeader = memo(() => (
  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 py-12 relative overflow-hidden">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-10 right-10 w-96 h-96 bg-green-500 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
    </div>
    <div className="max-w-7xl mx-auto px-4 relative">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
          <Briefcase className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Oportunidades de Trabalho</h1>
          <p className="text-green-200">Encontre projetos e envie seu orcamento</p>
        </div>
      </div>
    </div>
  </div>
));

// Counter de resultados
const ResultsCounter = memo(({ total, showing, searchMode, userLocation, searchRadius }) => (
  <div className="flex items-center justify-between mb-6 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
        <Trophy className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">
          {showing} de {total}
        </p>
        <p className="text-sm text-slate-600">
          {searchMode === 'location' && userLocation
            ? `Em um raio de ${searchRadius} km`
            : 'Oportunidades disponiveis'}
        </p>
      </div>
    </div>
  </div>
));

// Card de oportunidade
const OpportunityCard = memo(({ quote, onRespond, isProfessional, isClient, distance }) => {
  const statusColors = {
    open: 'bg-blue-500',
    quotes_received: 'bg-green-500',
    in_progress: 'bg-yellow-500',
    hired: 'bg-purple-500',
    completed: 'bg-gray-500',
    cancelled: 'bg-red-500'
  };

  const urgencyIcons = {
    urgente: '🔴',
    esta_semana: '🟡',
    este_mes: '🟢',
    flexivel: '⚪'
  };

  const urgencyLabels = {
    urgente: 'Urgente',
    esta_semana: 'Esta semana',
    este_mes: 'Este mes',
    flexivel: 'Flexivel'
  };

  const budgetLabels = {
    ate_500: 'Ate R$ 500',
    '500_1000': 'R$ 500 - R$ 1k',
    '1000_3000': 'R$ 1k - R$ 3k',
    '3000_5000': 'R$ 3k - R$ 5k',
    acima_5000: 'Acima de R$ 5k'
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border border-slate-200 group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-green-600 transition-colors">
              {quote.title}
            </h3>
            <p className="text-sm text-slate-600 line-clamp-2">{quote.description}</p>
          </div>
          <Badge className={`${statusColors[quote.status]} text-white`}>
            {quote.status === 'open' ? 'Aberto' : quote.status === 'quotes_received' ? 'Recebendo' : quote.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="flex items-center gap-1 bg-slate-50">
            <MapPin className="w-3 h-3" />
            {quote.city}, {quote.state}
          </Badge>

          {distance !== null && distance !== undefined && (
            <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
              <Navigation className="w-3 h-3" />
              {distance.toFixed(1)} km
            </Badge>
          )}

          {quote.urgency && (
            <Badge variant="outline" className="bg-slate-50">
              {urgencyIcons[quote.urgency]} {urgencyLabels[quote.urgency]}
            </Badge>
          )}

          {quote.budget_range && (
            <Badge variant="outline" className="flex items-center gap-1 bg-slate-50">
              <DollarSign className="w-3 h-3" />
              {budgetLabels[quote.budget_range] || quote.budget_range}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDate(quote.created_date || quote.created_at)}
          </span>
          <span>{quote.responses_count || 0} orcamento(s) recebido(s)</span>
        </div>

        {isProfessional && (
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onRespond(quote);
            }}
          >
            Enviar Orcamento
          </Button>
        )}

        {!isProfessional && !isClient && (
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onRespond(quote);
            }}
          >
            Enviar Orcamento
          </Button>
        )}

        {isClient && (
          <div className="text-center text-sm text-slate-500 py-2 bg-slate-50 rounded-lg">
            Voce e um cliente - apenas profissionais podem responder
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Filtros
const Filters = memo(({ filters, onFilterChange, categories, hideLocationFields = false }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-slate-800">Filtrar Oportunidades</h3>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${hideLocationFields ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-4`}>
        {/* Categoria */}
        <div>
          <Label className="text-sm text-slate-600 mb-1.5 block">Categoria</Label>
          <Select
            value={filters.category}
            onValueChange={(value) => onFilterChange({ ...filters, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado - oculto no modo localizacao */}
        {!hideLocationFields && (
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">Estado</Label>
            <Select
              value={filters.state}
              onValueChange={(value) => onFilterChange({ ...filters, state: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map(estado => (
                  <SelectItem key={estado.value} value={estado.value}>{estado.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Cidade - oculto no modo localizacao */}
        {!hideLocationFields && (
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">Cidade</Label>
            <Input
              placeholder="Digite a cidade..."
              value={filters.city}
              onChange={(e) => onFilterChange({ ...filters, city: e.target.value })}
            />
          </div>
        )}

        {/* Urgencia */}
        <div>
          <Label className="text-sm text-slate-600 mb-1.5 block">Urgencia</Label>
          <Select
            value={filters.urgency}
            onValueChange={(value) => onFilterChange({ ...filters, urgency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Qualquer" />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.icon && <span className="mr-1">{opt.icon}</span>}
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Faixa de orcamento */}
        <div>
          <Label className="text-sm text-slate-600 mb-1.5 block">Faixa de Valor</Label>
          <Select
            value={filters.budget}
            onValueChange={(value) => onFilterChange({ ...filters, budget: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Qualquer" />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterChange({
            category: 'all',
            state: 'all',
            city: '',
            urgency: 'all',
            budget: 'all'
          })}
        >
          Limpar Filtros
        </Button>
      </div>
    </div>
  );
});

// Dialog de login necessario
const LoginRequiredDialog = memo(({ isOpen, onClose, onLogin }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Login Necessario
        </DialogTitle>
        <DialogDescription>
          Para enviar um orcamento, voce precisa estar logado como profissional.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-slate-600">
          Se voce ainda nao tem uma conta profissional, cadastre-se agora e comece a receber oportunidades de trabalho!
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onLogin} className="flex-1 bg-green-500 hover:bg-green-600">
            Fazer Login
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
));

export default function JobMarketplace() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [filters, setFilters] = useState({
    category: 'all',
    state: 'all',
    city: '',
    urgency: 'all',
    budget: 'all'
  });

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  // Estados para busca por localizacao
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(20);
  const [searchMode, setSearchMode] = useState('traditional');

  // Verificar tipo de usuario
  const isClient = user?.user_type === 'cliente';
  const isProfessional = user?.user_type === 'profissional';

  // Buscar dados do profissional se for profissional
  const { data: professional } = useQuery({
    queryKey: ['my-professional', user?.id],
    queryFn: async () => {
      if (!user?.id || !isProfessional) return null;
      return ProfessionalService.findByUserId(user.id);
    },
    enabled: !!user?.id && isProfessional,
    staleTime: 5 * 60 * 1000,
  });

  // Buscar categorias
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const cats = await Category.list();
      return cats.map(c => ({ value: c.slug || c.name, label: c.name }));
    },
    staleTime: 10 * 60 * 1000,
  });

  // Reset paginacao quando filtros mudam
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filters, userLocation, searchRadius, searchMode]);

  // Query principal - buscar oportunidades abertas
  const { data: allQuotes = [], isLoading } = useQuery({
    queryKey: ['marketplace-quotes'],
    queryFn: async () => {
      const quotes = await QuoteRequest.filter({
        filters: { status: 'open' },
        orderBy: { field: 'created_at', direction: 'desc' }
      });
      // Tambem incluir os que tem status 'quotes_received' pois ainda aceitam orcamentos
      const quotesReceived = await QuoteRequest.filter({
        filters: { status: 'quotes_received' },
        orderBy: { field: 'created_at', direction: 'desc' }
      });
      return [...quotes, ...quotesReceived];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Aplicar filtros
  const filteredQuotes = useMemo(() => {
    let results = [...allQuotes];

    // Filtrar por categoria
    if (filters.category !== 'all') {
      results = results.filter(q =>
        q.category?.toLowerCase().includes(filters.category.toLowerCase()) ||
        q.service_type?.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    // Filtrar por urgencia
    if (filters.urgency !== 'all') {
      results = results.filter(q => q.urgency === filters.urgency);
    }

    // Filtrar por faixa de orcamento
    if (filters.budget !== 'all') {
      results = results.filter(q => q.budget_range === filters.budget);
    }

    if (searchMode === 'traditional') {
      // Filtrar por estado
      if (filters.state !== 'all') {
        results = results.filter(q => q.state === filters.state);
      }

      // Filtrar por cidade
      if (filters.city.trim()) {
        const cityLower = filters.city.toLowerCase().trim();
        results = results.filter(q => q.city?.toLowerCase().includes(cityLower));
      }

      return results;
    } else {
      // Modo localizacao - filtrar por distancia
      if (!userLocation) return results;

      // Calcular distancias e filtrar por raio
      let withDistances = results
        .map(quote => {
          if (!quote.latitude || !quote.longitude) return null;
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            quote.latitude,
            quote.longitude
          );
          return { ...quote, distance };
        })
        .filter(quote => quote !== null && quote.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance);

      return withDistances;
    }
  }, [allQuotes, filters, searchMode, userLocation, searchRadius]);

  // Quotes visiveis (paginados)
  const visibleQuotes = useMemo(() => {
    return filteredQuotes.slice(0, visibleCount);
  }, [filteredQuotes, visibleCount]);

  const hasMore = visibleCount < filteredQuotes.length;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  }, []);

  const handleRespond = useCallback((quote) => {
    if (!isAuthenticated) {
      setLoginDialogOpen(true);
      return;
    }

    if (isClient) {
      return; // Clientes nao podem responder
    }

    setSelectedQuote(quote);
    setRespondDialogOpen(true);
  }, [isAuthenticated, isClient]);

  const handleLogin = useCallback(() => {
    setLoginDialogOpen(false);
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-50">
      <PageHeader />

      {/* Modos de busca */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={searchMode} onValueChange={setSearchMode} className="space-y-6">
          <TabsList className="bg-white shadow-sm border p-1 h-auto">
            <TabsTrigger
              value="traditional"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white px-6 py-3 font-semibold"
            >
              <Search className="w-4 h-4 mr-2" />
              Busca Tradicional
            </TabsTrigger>
            <TabsTrigger
              value="location"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white px-6 py-3 font-semibold"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Por Localizacao
            </TabsTrigger>
          </TabsList>

          <TabsContent value="traditional" className="space-y-6">
            <Filters
              filters={filters}
              onFilterChange={setFilters}
              categories={categories}
            />
            <div className="flex justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-12 py-6 text-lg shadow-lg"
                onClick={() => setVisibleCount(ITEMS_PER_PAGE)}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar Oportunidades
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <LocationSearch
              onLocationSet={setUserLocation}
              currentRadius={searchRadius}
              onRadiusChange={setSearchRadius}
            />
            <Filters
              filters={filters}
              onFilterChange={setFilters}
              categories={categories}
              hideLocationFields={true}
            />
            <div className="flex justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-12 py-6 text-lg shadow-lg"
                onClick={() => setVisibleCount(ITEMS_PER_PAGE)}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar Oportunidades
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Resultados */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-16 bg-white rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-4">
              <Briefcase className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Nenhuma oportunidade encontrada
            </h3>
            <p className="text-slate-600 max-w-md">
              {searchMode === 'location'
                ? 'Tente aumentar o raio de busca ou verificar sua localizacao.'
                : 'Nao encontramos oportunidades com os filtros selecionados. Tente ajustar os filtros ou volte mais tarde.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setFilters({
                category: 'all',
                state: 'all',
                city: '',
                urgency: 'all',
                budget: 'all'
              })}
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <>
            <ResultsCounter
              total={filteredQuotes.length}
              showing={visibleQuotes.length}
              searchMode={searchMode}
              userLocation={userLocation}
              searchRadius={searchRadius}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleQuotes.map((quote) => (
                <OpportunityCard
                  key={quote.id}
                  quote={quote}
                  onRespond={handleRespond}
                  isProfessional={isProfessional}
                  isClient={isClient}
                  distance={searchMode === 'location' ? quote.distance : null}
                />
              ))}
            </div>

            {/* Botao Carregar Mais */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={loadMore}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8"
                >
                  <ChevronDown className="w-5 h-5 mr-2" />
                  Carregar Mais ({filteredQuotes.length - visibleCount} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog para responder orcamento */}
      {selectedQuote && professional && (
        <RespondQuoteDialog
          quoteRequest={selectedQuote}
          professional={professional}
          isOpen={respondDialogOpen}
          onClose={() => {
            setRespondDialogOpen(false);
            setSelectedQuote(null);
          }}
        />
      )}

      {/* Dialog de login necessario */}
      <LoginRequiredDialog
        isOpen={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
