import React, { useState } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Review, PortfolioService } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/interface do usuário/dialog";
import {
  MapPin, ArrowLeft, Loader2,
  Video, CheckCircle, CheckCircle2, Star, MessageSquare, MessageCircle,
  Camera, DollarSign, Image, ChevronLeft, ChevronRight, X,
  Home, Monitor, Clock, Calendar, BadgeCheck, Crown, Briefcase, FileText
} from "lucide-react";
import ReviewForm from "@/componentes/avaliações/ReviewForm";
import ReviewCard from "@/componentes/avaliações/ReviewCard";
import AppointmentRequestForm from "@/componentes/agendamentos/AppointmentRequestForm";
import { showToast } from "@/utils/showToast";

const professionLabels = {
  pintura_residencial: "Pintura Residencial e Comercial",
  pedreiro_alvenaria: "Pedreiro / Alvenaria",
  eletricista: "Elétrica",
  hidraulica: "Hidráulica",
  limpeza: "Limpeza",
  jardinagem: "Jardinagem / Roçada",
  gesso_drywall: "Gessó / Drywall",
  telhados: "Telhados",
  marido_aluguel: "Marido de Aluguel",
  carpinteiro: "Carpintaria",
  marceneiro: "Marcenaria",
  vidraceiro: "Vidraçaria",
  serralheiro: "Serralheria",
  azulejista: "Azulejista",
  ar_condicionado: "Ar Condicionado",
  dedetizacao: "Dedetização",
  mudancas: "Mudanças",
  montador_móveis: "Montador de Móveis",
  instalador_pisos: "Pisos",
  marmorista: "Marmorista",
  piscineiro: "Piscineiro",
  tapeceiro: "Tapeceiro",
  chaveiro: "Chaveiro",
  seguranca_eletronica: "Segurança Eletrônica",
  automacao: "Automação",
  energia_solar: "Energia Solar",
  impermeabilizacao: "Impermeabilização",
  arquiteto: "Arquitetura",
  engenheiro: "Engenharia",
  decorador: "Decoração",
  outros: "Outras"
};

export default function ProfessionalProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const professionalId = urlParams.get('id');

  const { user, isAuthenticated, navigateToLogin, isLoadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('reviews');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: professional, isLoading } = useQuery({
    queryKey: ['professional', professionalId],
    queryFn: async () => {
      const results = await Professional.filter({ id: professionalId });
      return results[0] || null;
    },
    enabled: !!professionalId,
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnMount: 'always'
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', professionalId],
    queryFn: async () => {
      if (!professionalId) return [];
      const results = await Review.filter(
        { professional_id: professionalId, is_approved: true },
        { order: '-created_date', limit: 50 }
      );
      return results;
    },
    enabled: !!professionalId
  });

  // Buscar portfolio do profissional
  const { data: portfolioItems = [] } = useQuery({
    queryKey: ['profile-portfolio', professionalId],
    queryFn: () => PortfolioService.getByProfessional(professionalId),
    enabled: !!professionalId
  });

  // Funções do lightbox
  const openLightbox = (photos, startIndex = 0) => {
    setLightboxImages(photos.map(p => p.photo_url));
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const featuredReviews = reviews.filter(r => r.is_featured).slice(0, 3);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  if (isLoading || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Profissional não encontrado</h2>
        <Link to={createPageUrl("SearchProfessionals")}>
          <Button>Voltar para Busca</Button>
        </Link>
      </div>
    );
  }

  // Usar avatar_url como foto principal do perfil
  const mainPhoto = professional.avatar_url || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=400&fit=crop";

  // Determinar status de disponibilidade baseado no campo do banco de dados
  const availabilityStatus = professional?.availability_status || 'available_today';

  // Verificar se é premium
  const isPremium = professional.plan_active && professional.plan_type !== 'free';
  const isVerified = professional.is_verified || professional.is_approved;

  // Calcular estatísticas
  const stats = {
    completedProjects: portfolioItems.length || 0,
    quotesAnswered: professional.total_quotes_answered || 0,
    servicesCompleted: professional.total_services || 0
  };

  // Obter ano de entrada
  const memberSince = professional.created_at ? new Date(professional.created_at).getFullYear() : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header com botão voltar - Mobile First */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 -ml-2">
              <ArrowLeft className="w-5 h-5 mr-1" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Profile Card - Layout único empilhado */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header Section - Foto centralizada */}
          <div className="pt-8 pb-6 px-6 text-center border-b border-slate-100">
            {/* Foto de perfil circular com borda */}
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="w-full h-full rounded-full border-4 border-blue-100 overflow-hidden bg-slate-100 shadow-lg">
                <img
                  src={mainPhoto}
                  alt={professional.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {isPremium && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Nome e categoria */}
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
              {professional.name}
            </h1>
            <p className="text-slate-600 text-sm md:text-base mb-2">
              <span className="font-semibold">
                {professionLabels[professional.profession] || professional.profession}
              </span>
              {professional.subcategory && (
                <span className="text-slate-400"> · {professional.subcategory}</span>
              )}
            </p>

            {/* Localização */}
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-sm mb-5">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>{professional.city} – {professional.state}</span>
            </div>

            {/* Status de disponibilidade - TODOS visíveis com destaque no escolhido */}
            <div className="flex items-center justify-center gap-1 text-sm mb-4 flex-wrap">
              {/* Disponível hoje */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                availabilityStatus === 'available_today'
                  ? 'bg-green-50 font-semibold'
                  : ''
              }`}>
                <CheckCircle className={`w-4 h-4 ${
                  availabilityStatus === 'available_today' ? 'text-green-500' : 'text-slate-300'
                }`} />
                <span className={availabilityStatus === 'available_today' ? 'text-green-600' : 'text-slate-400'}>
                  Disponível hoje
                </span>
              </div>

              <span className="text-slate-300">|</span>

              {/* Só orçamento */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                availabilityStatus === 'quotes_only'
                  ? 'bg-blue-50 font-semibold'
                  : ''
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  availabilityStatus === 'quotes_only' ? 'bg-blue-500' : 'bg-slate-300'
                }`} />
                <span className={availabilityStatus === 'quotes_only' ? 'text-blue-600' : 'text-slate-400'}>
                  Só orçamento
                </span>
              </div>

              <span className="text-slate-300">|</span>

              {/* Ocupado */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                availabilityStatus === 'busy'
                  ? 'bg-orange-50 font-semibold'
                  : ''
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  availabilityStatus === 'busy' ? 'bg-orange-500' : 'bg-slate-300'
                }`} />
                <span className={availabilityStatus === 'busy' ? 'text-orange-600' : 'text-slate-400'}>
                  Ocupado
                </span>
              </div>

              <span className="text-slate-300">|</span>

              {/* Retorno em Breve */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                availabilityStatus === 'returning_soon'
                  ? 'bg-purple-50 font-semibold'
                  : ''
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  availabilityStatus === 'returning_soon' ? 'bg-purple-500' : 'bg-slate-300'
                }`} />
                <span className={availabilityStatus === 'returning_soon' ? 'text-purple-600' : 'text-slate-400'}>
                  Retorno em breve
                </span>
              </div>
            </div>

            {/* Avaliação */}
            {reviews.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 mb-4">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-yellow-700 text-lg">{avgRating}</span>
                <span className="text-sm text-slate-500">({reviews.length} avaliações)</span>
              </div>
            )}

            {/* Badges de verificação */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {isPremium && (
                <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Profissional Premium</span>
                </div>
              )}
              {isVerified && (
                <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Perfil verificado</span>
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo do Perfil */}
          <div className="p-6 md:p-8 space-y-6">

            {/* Seção Sobre o Profissional */}
            {professional.personal_description && (
              <div className="border-b border-slate-100 pb-6">
                <h2 className="text-base font-bold text-slate-900 mb-2">Sobre o profissional</h2>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {professional.personal_description}
                </p>
              </div>
            )}

            {/* Seção Sobre o Serviço */}
            {professional.description && (
              <div className="border-b border-slate-100 pb-6">
                <h2 className="text-base font-bold text-slate-900 mb-2">Sobre o serviço</h2>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {professional.description}
                </p>
              </div>
            )}

            {/* Seção Serviços Realizados */}
            {portfolioItems.length > 0 && (
              <div className="border-b border-slate-100 pb-6">
                <h2 className="text-base font-bold text-slate-900 mb-3">Serviços realizados</h2>

                {/* Moldura de destaque */}
                <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/30">
                  {portfolioItems.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex gap-3 mb-4 last:mb-0">
                      {/* Lista de serviços */}
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-800 text-sm mb-1">{item.title}</h3>
                        {item.service_type && (
                          <p className="text-xs text-slate-500 mb-1">· {item.service_type}</p>
                        )}
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                        )}
                      </div>

                      {/* Fotos do serviço ao lado */}
                      {item.portfolio_photos?.length > 0 && (
                        <div className="flex-shrink-0 flex gap-1">
                          {item.portfolio_photos.slice(0, 2).map((photo, idx) => (
                            <div
                              key={photo.id}
                              className="w-16 h-16 rounded-lg overflow-hidden cursor-pointer bg-slate-100"
                              onClick={() => openLightbox(item.portfolio_photos, idx)}
                            >
                              <img
                                src={photo.photo_url}
                                alt=""
                                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {portfolioItems.length > 2 && (
                    <button
                      onClick={() => setActiveTab('portfolio')}
                      className="text-blue-600 text-sm font-medium hover:underline mt-2"
                    >
                      Ver todos os {portfolioItems.length} trabalhos
                    </button>
                  )}
                </div>
              </div>
            )}


            {/* Informações de atendimento */}
            <div className="border-b border-slate-100 pb-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">Atendimento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Home className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600 font-medium">Presencial</span>
                  <span className="text-slate-300">|</span>
                  <Monitor className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Remoto</span>
                </div>
                {professional.service_radius && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Área: até {professional.service_radius} km</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Resposta: ~30 min</span>
                </div>
              </div>
            </div>

            {/* CTA Principal */}
            <div className="space-y-3 border-b border-slate-100 pb-6">
              {user ? (
                <Link to={createPageUrl("Conversations") + `?start_chat_with=${professionalId}`} className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-semibold rounded-xl shadow-lg shadow-blue-600/20">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Saiba mais ou solicite orçamento
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={navigateToLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-semibold rounded-xl shadow-lg shadow-blue-600/20"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Saiba mais ou solicite orçamento
                </Button>
              )}
              <p className="text-center text-xs text-slate-500">
                Converse com o profissional no ConnectPro
              </p>

              {/* Badges finais */}
              <div className="flex items-center justify-center gap-3 pt-1">
                {isVerified && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span>Perfil verificado</span>
                  </div>
                )}
                {isPremium && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Profissional ativo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Atual */}
            <div className="border-b border-slate-100 pb-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">Status atual</h2>
              <div className="space-y-2">
                {availabilityStatus === 'available_today' && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-slate-700">Disponível para atendimento hoje</span>
                  </div>
                )}
                {availabilityStatus === 'quotes_only' && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-700">Aceitando apenas orçamentos no momento</span>
                  </div>
                )}
                {availabilityStatus === 'busy' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-orange-500" />
                    <span className="text-slate-700">Ocupado com outros projetos</span>
                  </div>
                )}
                {availabilityStatus === 'returning_soon' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span className="text-slate-700">Retornando em breve às atividades</span>
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas */}
            {(stats.completedProjects > 0 || stats.quotesAnswered > 0 || stats.servicesCompleted > 0) && (
              <div className="border-b border-slate-100 pb-6">
                <div className="flex items-center justify-around py-2">
                  {stats.completedProjects > 0 && (
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">+{stats.completedProjects}</div>
                      <div className="text-xs text-slate-500">Projetos<br/>concluídos</div>
                    </div>
                  )}
                  {stats.quotesAnswered > 0 && (
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">+{stats.quotesAnswered}</div>
                      <div className="text-xs text-slate-500">Orçamentos<br/>enviados</div>
                    </div>
                  )}
                  {stats.servicesCompleted > 0 && (
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">+{stats.servicesCompleted}</div>
                      <div className="text-xs text-slate-500">Serviços<br/>concluídos</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mt-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Membro desde: {memberSince}</span>
                </div>
              </div>
            )}

            {/* Video */}
            {professional.video_url && (
              <div className="border-b border-slate-100 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Video className="w-4 h-4 text-slate-600" />
                  <h2 className="text-base font-bold text-slate-900">Vídeo de apresentação</h2>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                  <video
                    src={professional.video_url}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="pt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
                  <TabsTrigger
                    value="reviews"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap"
                  >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Avaliações ({reviews.length})
                  </TabsTrigger>
                  {portfolioItems.length > 0 && (
                    <TabsTrigger
                      value="portfolio"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap"
                    >
                      <Briefcase className="w-4 h-4 mr-1.5" />
                      Serviços ({portfolioItems.length})
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="add-review"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap"
                  >
                    <Star className="w-4 h-4 mr-1.5" />
                    Avaliar
                  </TabsTrigger>
                  <TabsTrigger
                    value="schedule"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Orçamento
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reviews" className="mt-6 space-y-4">
                  {featuredReviews.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        Depoimentos em Destaque
                      </h3>
                      <div className="space-y-4">
                        {featuredReviews.map(review => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </div>
                    </div>
                  )}

                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-xl">
                      <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium text-sm">Nenhuma avaliação ainda</p>
                      <p className="text-xs text-slate-400">Seja o primeiro a avaliar este profissional!</p>
                    </div>
                  )}
                </TabsContent>

                {/* Aba de Serviços Realizados */}
                <TabsContent value="portfolio" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {portfolioItems.map((item) => (
                      <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Fotos do trabalho */}
                        {item.portfolio_photos?.length > 0 && (
                          <div className="relative aspect-video bg-slate-100">
                            <img
                              src={item.portfolio_photos[0].photo_url}
                              alt={item.title}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => openLightbox(item.portfolio_photos, 0)}
                            />
                            {item.portfolio_photos.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                +{item.portfolio_photos.length - 1}
                              </div>
                            )}
                          </div>
                        )}

                        <CardContent className="p-4">
                          <h3 className="font-semibold text-slate-900 mb-1 text-sm">{item.title}</h3>

                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {item.service_type && (
                              <Badge variant="outline" className="text-xs">
                                {item.service_type}
                              </Badge>
                            )}
                            {item.project_value && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                <DollarSign className="w-3 h-3 mr-0.5" />
                                R$ {parseFloat(item.project_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </Badge>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                          )}

                          {/* Grid de miniaturas */}
                          {item.portfolio_photos?.length > 1 && (
                            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                              {item.portfolio_photos.slice(0, 4).map((photo, idx) => (
                                <div
                                  key={photo.id}
                                  className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-colors"
                                  onClick={() => openLightbox(item.portfolio_photos, idx)}
                                >
                                  <img
                                    src={photo.photo_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {item.portfolio_photos.length > 4 && (
                                <div
                                  className="w-12 h-12 flex-shrink-0 rounded-lg bg-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors"
                                  onClick={() => openLightbox(item.portfolio_photos, 4)}
                                >
                                  <span className="text-xs font-medium text-slate-600">
                                    +{item.portfolio_photos.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="add-review" className="mt-6">
                  <ReviewForm
                    professionalId={professionalId}
                    onChangeTab={setActiveTab}
                    onSuccess={() => {
                      // Avaliação enviada
                    }}
                  />
                </TabsContent>

                <TabsContent value="schedule" className="mt-6">
                  <AppointmentRequestForm
                    professionalId={professionalId}
                    professionalName={professional.name}
                    serviceType={professionLabels[professional.profession]}
                    onSuccess={() => {
                      showToast.success('Solicitação enviada com sucesso! O profissional entrará em contato.');
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Footer com Branding */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-center">
            <p className="text-xs text-slate-500">
              Perfil criado com <span className="font-semibold text-blue-600">ConnectPro</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Conectando você a profissionais locais
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox para visualização de fotos */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <DialogHeader className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setLightboxOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogHeader>

          <div className="relative flex items-center justify-center min-h-[60vh]">
            {lightboxImages.length > 0 && (
              <>
                <img
                  src={lightboxImages[lightboxIndex]}
                  alt=""
                  className="max-h-[80vh] max-w-full object-contain"
                />

                {lightboxImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                      {lightboxIndex + 1} / {lightboxImages.length}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
