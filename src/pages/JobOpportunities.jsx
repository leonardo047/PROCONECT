import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/AuthContext";
import { JobOpportunityService, JobApplicationService, Category } from "@/lib/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/componentes/interface do usuário/dialog";
import {
  Briefcase, MapPin, Clock, DollarSign, Search, MessageCircle,
  Filter, Users, Loader2, AlertCircle, Lock, Crown, UserPlus, Plus, Navigation
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import PublicJobForm from "@/componentes/jobs/PublicJobForm";

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

export default function JobOpportunities() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [filters, setFilters] = useState({
    city: '',
    state: 'all',
    profession: 'all'
  });

  // Modais
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          const data = await response.json();

          if (data.address) {
            const city = data.address.city || data.address.town || data.address.municipality || data.address.village || '';
            const state = data.address.state || '';

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

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['job-opportunities', filters],
    queryFn: () => JobOpportunityService.getActive(filters)
  });

  // Buscar categorias (profissoes) do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['job-opportunities-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Verificar limite de candidaturas do usuario
  const { data: applicationLimit } = useQuery({
    queryKey: ['job-application-limit', user?.id],
    queryFn: () => JobApplicationService.canApply(user.id),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Mutation para registrar candidatura
  const applyMutation = useMutation({
    mutationFn: async ({ userId, opportunityId }) => {
      // Verificar se já candidatou
      const hasApplied = await JobApplicationService.hasApplied(userId, opportunityId);
      if (!hasApplied) {
        await JobApplicationService.apply(userId, opportunityId, 'whatsapp');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-application-limit']);
    }
  });

  // Transformar categorias em opções para o select
  const professions = useMemo(() => {
    const options = [{ value: "all", label: "Todas" }];

    if (!categories.length) return options;

    // Agrupar por category_group
    const groups = {};
    categories.forEach(cat => {
      const group = cat.category_group || 'Outros';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(cat);
    });

    // Ordenar grupos - construção primeiro
    const sortedGroupNamês = Object.keys(groups).sort((a, b) => {
      const homeGroups = ['Construcao', 'Eletrica/Hidraulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    // Adicionar cada grupo com header
    sortedGroupNamês.forEach(groupName => {
      const emoji = groupName.match(/^[^\w\s]/)?.[0] || '';
      const cleanName = groupName.replace(/^[^\w\s]\s*/, '');
      options.push({
        value: `header_${groupName}`,
        label: `${emoji} ${cleanName.toUpperCase()}`,
        disabled: true
      });

      groups[groupName].forEach(cat => {
        options.push({
          value: cat.slug,
          label: cat.name
        });
      });
    });

    return options;
  }, [categories]);

  // Criar um mapa para buscar label por value
  const professionMap = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.slug] = cat.name;
    });
    return map;
  }, [categories]);

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return <Badge className="bg-red-500">Urgente</Badge>;
      case 'today':
        return <Badge className="bg-orange-500">Para Hoje</Badge>;
      case 'this_week':
        return <Badge className="bg-yellow-500">Esta Semana</Badge>;
      default:
        return null;
    }
  };

  const getPaymentLabel = (type, value) => {
    switch (type) {
      case 'daily':
        return value ? `R$ ${value}/dia` : 'Diaria a combinar';
      case 'per_job':
        return value ? `R$ ${value}/serviço` : 'Por serviço';
      case 'hourly':
        return value ? `R$ ${value}/hora` : 'Por hora';
      default:
        return 'A combinar';
    }
  };

  const handleWhatsAppContact = async (opp) => {
    // Se não está logado, mostrar modal de login
    if (!isAuthenticated || !user) {
      setSelectedOpportunity(opp);
      setLoginModalOpen(true);
      return;
    }

    // Verificar limite de candidaturas
    if (applicationLimit && !applicationLimit.canApply && !applicationLimit.hasSubscription) {
      setSelectedOpportunity(opp);
      setUpgradeModalOpen(true);
      return;
    }

    // Registrar candidatura e abrir WhatsApp
    try {
      await applyMutation.mutateAsync({ userId: user.id, opportunityId: opp.id });

      const phone = opp.contact_whatsapp?.replace(/\D/g, '');
      const message = `Ola! Vi sua oportunidade "${opp.title}" no ConectPro e tenho interesse.`;
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
      console.error('Erro ao registrar candidatura:', error);
      // Mesmo com erro, abre o WhatsApp
      const phone = opp.contact_whatsapp?.replace(/\D/g, '');
      const message = `Ola! Vi sua oportunidade "${opp.title}" no ConectPro e tenho interesse.`;
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleLogin = () => {
    setLoginModalOpen(false);
    navigate('/login?returnUrl=/JobOpportunities');
  };

  const handleRegister = () => {
    setLoginModalOpen(false);
    navigate('/login?tab=register&returnUrl=/JobOpportunities');
  };

  const handleUpgrade = () => {
    setUpgradeModalOpen(false);
    navigate('/ProfessionalDashboard?tab=plano');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Vagas de Trabalho</h1>
                <p className="text-slate-600">Encontre oportunidades publicadas por profissionais e empresas</p>
              </div>
            </div>
            <Button
              onClick={() => setPublishModalOpen(true)}
              className="bg-green-500 hover:bg-green-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Publicar Vaga Gratis
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Briefcase className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Vagas para Profissionais</p>
                <p className="text-sm text-blue-800 mt-1">
                  Aqui você encontra vagas publicadas por profissionais e empresas que precisam de ajudantes,
                  funcionarios ou parceiros para serviços e obras.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limite de contatos (se logado e não assinante) */}
        {isAuthenticated && applicationLimit && !applicationLimit.hasSubscription && (
          <Card className={`mb-6 ${applicationLimit.canApply ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock className={`w-6 h-6 flex-shrink-0 ${applicationLimit.canApply ? 'text-amber-600' : 'text-red-600'}`} />
                <div className="flex-1">
                  <p className={`font-semibold ${applicationLimit.canApply ? 'text-amber-900' : 'text-red-900'}`}>
                    {applicationLimit.canApply
                      ? `Você tem ${applicationLimit.remaining} contato(s) gratuito(s) restante(s)`
                      : 'Limite de contatos gratuitos atingido'
                    }
                  </p>
                  <p className={`text-sm mt-1 ${applicationLimit.canApply ? 'text-amber-800' : 'text-red-800'}`}>
                    {applicationLimit.canApply
                      ? 'Assine um plano profissional para ter contatos ilimitados.'
                      : 'Para continuar entrando em contato com vagas, assine um plano profissional.'
                    }
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/ProfessionalDashboard?tab=plano')}
                  className={applicationLimit.canApply ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Assinar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
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
              <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {locationMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select
                  value={filters.profession}
                  onValueChange={(value) => setFilters({ ...filters, profession: value })}
                  disabled={loadingCategories}
                >
                  <SelectTrigger>
                    {loadingCategories ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando...
                      </div>
                    ) : (
                      <SelectValue placeholder="Tipo de Profissional" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {professions.map(p => (
                      <SelectItem
                        key={p.value}
                        value={p.value}
                        disabled={p.disabled}
                        className={p.disabled ? 'font-bold text-slate-500 bg-slate-100' : ''}
                      >
                        {p.label}
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

        {/* Opportunities List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : opportunities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Nenhuma oportunidade encontrada</p>
              <p className="text-sm text-slate-500">
                Tente mudar os filtros ou volte mais tarde.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getUrgencyBadge(opp.urgency)}
                      </div>

                      <h3 className="font-semibold text-lg text-slate-900">{opp.title}</h3>

                      {opp.professionals && (
                        <p className="text-sm text-slate-500 mt-1">
                          Publicado por: {opp.professionals.name}
                        </p>
                      )}

                      {opp.description && (
                        <p className="text-slate-600 mt-2">{opp.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4 text-blue-500" />
                          <span>{professionMap[opp.profession] || opp.profession}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{opp.city}, {opp.state}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span>{getPaymentLabel(opp.payment_type, opp.payment_value)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{formatDistanceToNow(new Date(opp.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>

                    {opp.contact_whatsapp && (
                      <Button
                        className="bg-green-500 hover:bg-green-600 flex-shrink-0"
                        onClick={() => handleWhatsAppContact(opp)}
                        disabled={applyMutation.isPending}
                      >
                        {applyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <MessageCircle className="w-4 h-4 mr-2" />
                        )}
                        Contato
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Login/Cadastro */}
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Faca Login para Continuar
            </DialogTitle>
            <DialogDescription>
              Para entrar em contato com quem públicou está vaga, você precisa estar logado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Primeira vez aqui?</strong> Cadastre-se gratuitamente e tenha acessó a 3 contatos gratuitos para vagas!
              </p>
            </div>

            {selectedOpportunity && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Vaga selecionada:</p>
                <p className="font-medium text-slate-900">{selectedOpportunity.title}</p>
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
            <Button onClick={handleLogin} className="flex-1 bg-blue-500 hover:bg-blue-600">
              Já tenho conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upgrade */}
      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Limite de Contatos Atingido
            </DialogTitle>
            <DialogDescription>
              Você já usou seus 3 contatos gratuitos para vagas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="font-semibold text-amber-900 mb-2">Assine um plano profissional e tenha:</p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>- Contatos ilimitados para vagas</li>
                <li>- Perfil destacado nas buscas</li>
                <li>- Acessó a orçamentos de clientes</li>
                <li>- Portfolio profissional</li>
              </ul>
            </div>

            {selectedOpportunity && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">Vaga que você quer contatar:</p>
                <p className="font-medium text-slate-900">{selectedOpportunity.title}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUpgradeModalOpen(false)} className="flex-1">
              Depois
            </Button>
            <Button onClick={handleUpgrade} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              <Crown className="w-4 h-4 mr-2" />
              Ver Planos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Publicar Vaga Anonima */}
      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-500" />
              Publicar Vaga Gratis
            </DialogTitle>
            <DialogDescription>
              Publique sua vaga e encontre profissionais disponíveis para o trabalho.
            </DialogDescription>
          </DialogHeader>

          <PublicJobForm
            onSuccess={() => {
              setPublishModalOpen(false);
              queryClient.invalidateQueries(['job-opportunities']);
            }}
            onCancel={() => setPublishModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
