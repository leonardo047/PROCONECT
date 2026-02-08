import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/AuthContext";
import { Category, ProfessionalService } from "@/lib/entities";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/componentes/interface do usuário/dialog";
import {
  FileText, MapPin, Clock, DollarSign, Search, Send,
  Filter, Loader2, UserPlus, Eye, Camera, ChevronDown, Navigation
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import RespondQuoteDialog from "@/componentes/profissional/RespondQuoteDialog";
import { showToast } from "@/utils/showToast";

const states = [
  { value: "all", label: "Todos" },
  { value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapa" }, { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" }, { value: "CE", label: "Ceara" },
  { value: "DF", label: "Distrito Federal" }, { value: "ES", label: "Espirito Santo" },
  { value: "GO", label: "Goias" }, { value: "MA", label: "Maranhao" },
  { value: "MT", label: "Mato Grosso" }, { value: "MS", label: "Mato Grossó do Sul" },
  { value: "MG", label: "Minas Gerais" }, { value: "PA", label: "Para" },
  { value: "PB", label: "Paraiba" }, { value: "PR", label: "Parana" },
  { value: "PE", label: "Pernambuco" }, { value: "PI", label: "Piaui" },
  { value: "RJ", label: "Rio de Janeiro" }, { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" }, { value: "RO", label: "Rondonia" },
  { value: "RR", label: "Roraima" }, { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "Sao Paulo" }, { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];

const ITEMS_PER_PAGE = 12;

export default function ServiceQuotes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, professional: authProfessional } = useAuth();

  const [filters, setFilters] = useState({
    city: '',
    state: 'all',
    category: 'all'
  });

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  // Função para obter localização atual
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocalização não suportada pelo navegador');
      return;
    }

    setLoadingLocation(true);
    setLocationMessage('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Usar API de geocoding reverso gratuita
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          const data = await response.json();

          if (data.address) {
            const city = data.address.city || data.address.town || data.address.municipality || data.address.village || '';
            const state = data.address.state || '';

            // Mapear estado para sigla
            const stateMap = {
              'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
              'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
              'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
              'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
              'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
              'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
              'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
            };

            const stateCode = stateMap[state] || 'all';

            setFilters(prev => ({
              ...prev,
              city: city,
              state: stateCode
            }));
            setLocationMessage(`Localização: ${city}, ${stateCode}`);
          }
        } catch (error) {
          setLocationMessage('Erro ao obter endereço da localização');
        }
        setLoadingLocation(false);
      },
      (error) => {
        setLocationMessage('Não foi possível obter sua localização. Verifique as permissões.');
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Buscar profissional do usuario logado
  const { data: professional } = useQuery({
    queryKey: ['my-professional-for-quotes', user?.id],
    queryFn: async () => {
      if (authProfessional) return authProfessional;
      const prof = await ProfessionalService.findByUserId(user.id);
      return prof;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Buscar orçamentos abertos
  const { data: allQuotes = [], isLoading } = useQuery({
    queryKey: ['public-service-quotes', filters],
    queryFn: async () => {
      let query = supabase
        .from('quote_requests')
        .select('*')
        .in('status', ['open', 'quotes_received'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.state && filters.state !== 'all') {
        query = query.eq('state', filters.state);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.category && filters.category !== 'all') {
        query = query.or(`category.ilike.%${filters.category}%,profession.ilike.%${filters.category}%`);
      }

      const { data, error } = await query;
      if (error) {
        return [];
      }
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Buscar respostas do profissional (para saber quais já respondeu)
  const { data: myResponses = [] } = useQuery({
    queryKey: ['my-quote-responses', professional?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('quote_responses')
        .select('quote_request_id')
        .eq('professional_id', professional.id);
      return data?.map(r => r.quote_request_id) || [];
    },
    enabled: !!professional?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Buscar categorias
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['service-quotes-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
  });

  // Transformar categorias em opções
  const categoryOptions = useMemo(() => {
    const options = [{ value: "all", label: "Todas as categorias" }];
    if (!categories.length) return options;

    const groups = {};
    categories.forEach(cat => {
      const group = cat.category_group || 'Outros';
      if (!groups[group]) groups[group] = [];
      groups[group].push(cat);
    });

    Object.keys(groups).sort().forEach(groupName => {
      options.push({
        value: `header_${groupName}`,
        label: groupName.toUpperCase(),
        disabled: true
      });
      groups[groupName].forEach(cat => {
        options.push({ value: cat.slug, label: cat.name });
      });
    });

    return options;
  }, [categories]);

  // Mapa de categorias para labels
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.slug] = cat.name;
    });
    return map;
  }, [categories]);

  const visibleQuotes = allQuotes.slice(0, visibleCount);

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'urgente':
        return <Badge className="bg-red-500">Urgente</Badge>;
      case 'esta_semana':
        return <Badge className="bg-orange-500">Esta Semana</Badge>;
      case 'este_mes':
        return <Badge className="bg-yellow-500">Este Mês</Badge>;
      default:
        return <Badge className="bg-slate-400">Flexível</Badge>;
    }
  };

  const getBudgetLabel = (budget) => {
    const labels = {
      'ate_500': 'Até R$ 500',
      '500_1000': 'R$ 500 - R$ 1.000',
      '1000_3000': 'R$ 1.000 - R$ 3.000',
      '3000_5000': 'R$ 3.000 - R$ 5.000',
      'acima_5000': 'Acima de R$ 5.000',
      'a_negociar': 'A negociar'
    };
    return labels[budget] || 'A negociar';
  };

  const handleRespond = (quote) => {
    if (!isAuthenticated) {
      setSelectedQuote(quote);
      setLoginModalOpen(true);
      return;
    }

    if (!professional) {
      showToast.warning('Você precisa ter um perfil profissional para responder orçamentos. Complete seu cadastro primeiro.');
      navigate('/Onboarding');
      return;
    }

    setSelectedQuote(quote);
    setRespondDialogOpen(true);
  };

  const handleViewDetails = (quote) => {
    setSelectedQuote(quote);
    setDetailsDialogOpen(true);
  };

  const handleLogin = () => {
    setLoginModalOpen(false);
    navigate('/login?returnUrl=/ServiceQuotes');
  };

  const handleRegister = () => {
    setLoginModalOpen(false);
    navigate('/Onboarding');
  };

  const hasResponded = (quoteId) => myResponses.includes(quoteId);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Orçamento Serviços</h1>
              <p className="text-slate-600">Encontre clientes que precisam dos seus serviços</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-900">Pedidos de Orçamento de Clientes</p>
                <p className="text-sm text-orange-800 mt-1">
                  Aqui você encontra clientes que precisam de serviços na sua área.
                  Envie seu orçamento e conquiste novos trabalhos!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Filtros</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={loadingLocation}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                {loadingLocation ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4 mr-2" />
                )}
                Usar minha localização
              </Button>
            </div>
            {locationMessage && (
              <div className="mb-4 text-sm text-green-600 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {locationMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                  disabled={loadingCategories}
                >
                  <SelectTrigger>
                    {loadingCategories ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando...
                      </div>
                    ) : (
                      <SelectValue placeholder="Tipo de Serviço" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        disabled={opt.disabled}
                        className={opt.disabled ? 'font-bold text-slate-500 bg-slate-100' : ''}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={filters.state}
                  onValueChange={(value) => setFilters({ ...filters, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  placeholder="Cidade"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotes List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          </div>
        ) : allQuotes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Nenhum orçamento encontrado</p>
              <p className="text-sm text-slate-500">
                Tente mudar os filtros ou volte mais tarde.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleQuotes.map((quote) => {
                const alreadyResponded = hasResponded(quote.id);
                return (
                  <Card key={quote.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getUrgencyBadge(quote.urgency)}
                          {quote.responses_count > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              {quote.responses_count} orçamento(s)
                            </Badge>
                          )}
                          {alreadyResponded && (
                            <Badge className="bg-blue-500">Você respondeu</Badge>
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg text-slate-900 mb-2">{quote.title}</h3>

                      <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                        {quote.description}
                      </p>

                      {quote.photos && quote.photos.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                          <Camera className="w-4 h-4" />
                          <span>{quote.photos.length} foto(s)</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-4">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span>{categoryMap[quote.category] || categoryMap[quote.profession] || quote.category || quote.profession}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{quote.city}, {quote.state}</span>
                        </div>
                        {quote.budget_range && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span>{getBudgetLabel(quote.budget_range)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{formatDistanceToNow(new Date(quote.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewDetails(quote)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Detalhes
                        </Button>
                        {!alreadyResponded ? (
                          <Button
                            size="sm"
                            className="flex-1 bg-orange-500 hover:bg-orange-600"
                            onClick={() => handleRespond(quote)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Enviar Orçamento
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled
                          >
                            Já Respondido
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {visibleCount < allQuotes.length && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Carregar Mais ({allQuotes.length - visibleCount} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Login */}
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" />
              Faça Login para Continuar
            </DialogTitle>
            <DialogDescription>
              Para enviar um orçamento, você precisa estar logado como profissional.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800">
                <strong>Ainda não e profissional?</strong> Cadastre-se gratuitamente e comece a receber pedidos de orçamento!
              </p>
            </div>

            {selectedQuote && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Orçamento selecionado:</p>
                <p className="font-medium text-slate-900">{selectedQuote.title}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setLoginModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleRegister} className="flex-1 bg-green-500 hover:bg-green-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar
            </Button>
            <Button onClick={handleLogin} className="flex-1 bg-orange-500 hover:bg-orange-600">
              Já tenho conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuote?.title}</DialogTitle>
            <DialogDescription>
              Detalhes do pedido de orçamento
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getUrgencyBadge(selectedQuote.urgency)}
                {selectedQuote.budget_range && (
                  <Badge variant="outline" className="text-green-600">
                    {getBudgetLabel(selectedQuote.budget_range)}
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-1">Descrição</h4>
                <p className="text-slate-600 whitespace-pre-wrap">{selectedQuote.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">Categoria</h4>
                  <p className="text-slate-600">
                    {categoryMap[selectedQuote.category] || categoryMap[selectedQuote.profession] || selectedQuote.category}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">Localização</h4>
                  <p className="text-slate-600">{selectedQuote.city}, {selectedQuote.state}</p>
                  {selectedQuote.address && (
                    <p className="text-sm text-slate-500">{selectedQuote.address}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-1">Cliente</h4>
                <p className="text-slate-600">{selectedQuote.client_name}</p>
              </div>

              {selectedQuote.photos && selectedQuote.photos.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Fotos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedQuote.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                {!hasResponded(selectedQuote.id) ? (
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      setDetailsDialogOpen(false);
                      handleRespond(selectedQuote);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Meu Orçamento
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Você já respondeu este orçamento
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Resposta */}
      {selectedQuote && professional && (
        <RespondQuoteDialog
          isOpen={respondDialogOpen}
          onClose={() => {
            setRespondDialogOpen(false);
            queryClient.invalidateQueries(['public-service-quotes']);
            queryClient.invalidateQueries(['my-quote-responses']);
          }}
          quoteRequest={selectedQuote}
          professional={professional}
        />
      )}
    </div>
  );
}
