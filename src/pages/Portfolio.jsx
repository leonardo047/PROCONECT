import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Review } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  MapPin, Star, Instagram, Share2,
  ExternalLink, CheckCircle,
  ChevronLeft, ChevronRight, X, MessageSquare, User, DollarSign, Sparkles, Lock, FileText, MessageCircle
} from "lucide-react";
import PublicAvailabilityView from "@/componentes/profissional/PublicAvailabilityView";
import AvailabilityStatusBadge from "@/componentes/profissional/AvailabilityStatusBadge";
import ProfessionalBadges from "@/componentes/profissional/ProfessionalBadges";
import ServicesList from "@/componentes/profissional/ServicesList";
import ServiceAreaMap from "@/componentes/profissional/ServiceAreaMap";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AppointmentRequestForm from "@/componentes/agendamentos/AppointmentRequestForm";
import ReviewCard from "@/componentes/avaliações/ReviewCard";
import { showToast } from "@/utils/showToast";

const professionLabels = {
  pintura_residencial: "Pintura Residencial e Comercial",
  pedreiro_alvenaria: "Pedreiro / Alvenaria",
  eletricista: "Eletrica",
  hidraulica: "Hidraulica",
  limpeza: "Limpeza Residencial / Pos-obra",
  jardinagem: "Jardinagem / Rocada",
  gesso_drywall: "Gessó / Drywall",
  telhados: "Telhados",
  marido_aluguel: "Marido de Aluguel",
  carpinteiro: "Carpintaria",
  marceneiro: "Marcenaria",
  vidraceiro: "Vidracaria",
  serralheiro: "Serralheria",
  azulejista: "Azulejista / Revestimentos",
  ar_condicionado: "Ar Condicionado / Refrigeracao",
  dedetizacao: "Dedetizacao / Controle de Pragas",
  mudancas: "Mudancas e Fretes",
  montador_móveis: "Montador de Móveis",
  instalador_pisos: "Instalador de Pisos",
  marmorista: "Marmorista / Granitos",
  piscineiro: "Piscineiro / Manutencao de Piscinas",
  tapeceiro: "Tapeceiro / Estofador",
  chaveiro: "Chaveiro",
  seguranca_eletronica: "Seguranca Eletronica / CFTV",
  automacao: "Automacao Residencial",
  energia_solar: "Energia Solar",
  impermeabilizacao: "Impermeabilizacao",
  arquiteto: "Arquitetura e Projetos",
  engenheiro: "Engenharia Civil",
  decorador: "Decoracao de Interiores",
  outros: "Outras Especialidades"
};

// Componente de galeria de fotos com lightbox
function PortfolioGallery({ photos }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const openLightbox = (index) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  const nextPhoto = () => setSelectedIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id || index}
            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openLightbox(index)}
          >
            <img
              src={photo.photo_url || photo}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <img
            src={photos[selectedIndex].photo_url || photos[selectedIndex]}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 text-white text-sm">
            {selectedIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [professionalId, setProfessionalId] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProfessionalId(params.get('id'));
  }, []);

  // Funcao para iniciar chat direto
  const startChat = () => {
    if (!isAuthenticated) {
      const chatUrl = encodeURIComponent(`/Conversations?start_chat_with=${professionalId}`);
      navigate(`/login?returnUrl=${chatUrl}`);
      return;
    }

    if (user?.user_type === 'profissional') {
      showToast.warning('Apenas clientes podem iniciar conversas com profissionais.');
      return;
    }

    navigate(`/Conversations?start_chat_with=${professionalId}`);
  };

  // Buscar profissional usando fetch direto
  const { data: professional, isLoading, error } = useQuery({
    queryKey: ['portfolio-professional', professionalId],
    queryFn: async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const headers = {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        };

        const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (supabaseKey) {
          try {
            const stored = JSON.parse(localStorage.getItem(supabaseKey));
            if (stored?.access_token) {
              headers['Authorization'] = `Bearer ${stored.access_token}`;
            }
          } catch (e) {
            // Ignorar erro de parse
          }
        }

        const response = await fetch(
          `${supabaseUrl}/rest/v1/professionals?id=eq.${professionalId}&select=*`,
          { method: 'GET', headers }
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar profissional: ${response.status}`);
        }

        const data = await response.json();
        return data?.[0] || null;
      } catch (err) {
        throw err;
      }
    },
    enabled: !!professionalId,
    retry: 2,
    staleTime: 30000
  });

  // Buscar itens do portfolio usando fetch direto
  const { data: portfolioItems = [] } = useQuery({
    queryKey: ['portfolio-items', professionalId],
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/portfolio_items?professional_id=eq.${professionalId}&is_active=eq.true&select=*,portfolio_photos(*)&order=display_order.asc`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data || [];
    },
    enabled: !!professionalId
  });

  // Buscar avaliações
  const { data: reviews = [] } = useQuery({
    queryKey: ['portfolio-reviews', professionalId],
    queryFn: async () => {
      const results = await Review.filter({
        professional_id: professionalId,
        is_approved: true
      });
      return results;
    },
    enabled: !!professionalId
  });

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: professional?.name,
          text: `Confira o portfolio de ${professional?.name} no ConectPro`,
          url: url
        });
      } catch (err) {
        // Ignorar erro de compartilhamento
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scrollToQuoteForm = () => {
    const element = document.getElementById('quote-form');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  // Mostrar loading enquanto ainda não tem o ID ou está carregando
  if (!professionalId || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Carregando portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Portfolio não encontrado</h2>
            <p className="text-slate-600 mb-4">
              O portfolio que você está procurando não existe ou não está mais ativo.
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Voltar para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPremium = professional.plan_active && professional.plan_type !== 'free';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ====== HEADER COM GRADIENTE ====== */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/20 mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Foto do perfil */}
            <div className="flex-shrink-0">
              {professional.avatar_url ? (
                <img
                  src={professional.avatar_url}
                  alt={professional.name}
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white/30 shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-32 h-32 bg-white/20 rounded-2xl items-center justify-center text-5xl font-bold border-4 border-white/30"
                style={{ display: professional.avatar_url ? 'none' : 'flex' }}
              >
                {professional.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>

            {/* Informacoes do profissional */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-1">
                    {professional.name}
                  </h1>
                  <p className="text-xl text-white/90 mb-3">
                    {professionLabels[professional.profession] || professional.profession}
                  </p>

                  {/* Localizacao e Rating */}
                  <div className="flex flex-wrap items-center gap-4 text-white/90 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{professional.city}, {professional.state}</span>
                    </div>
                    {professional.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                        <span className="font-semibold">{professional.rating.toFixed(1)}</span>
                        <span className="text-sm text-white/70">({reviews.length} avaliações)</span>
                      </div>
                    )}
                  </div>

                  {/* Badge de status */}
                  <AvailabilityStatusBadge professional={professional} showDetails={true} />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="text-white hover:bg-white/20 flex-shrink-0"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                </Button>
              </div>

              {/* Frase curta do profissional */}
              {professional.short_phrase && (
                <div className="mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm max-w-2xl">
                  <p className="text-white italic">"{professional.short_phrase}"</p>
                </div>
              )}

              {/* Botoes de acao */}
              <div className="flex flex-wrap gap-3 mt-6">
                <Button
                  onClick={startChat}
                  className="bg-white text-orange-600 hover:bg-orange-50"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Conversar
                </Button>
                <Button
                  onClick={scrollToQuoteForm}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Solicitar Orçamento
                </Button>
                {professional.instagram && (
                  <Button
                    variant="ghost"
                    onClick={() => window.open(`https://instagram.com/${professional.instagram.replace('@', '')}`, '_blank')}
                    className="text-white hover:bg-white/20"
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== SELOS AUTOMATICOS ====== */}
      <div className="max-w-5xl mx-auto px-4 -mt-4 relative z-10">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <ProfessionalBadges professional={professional} />
          </CardContent>
        </Card>
      </div>

      {/* ====== CONTEUDO PRINCIPAL ====== */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sobre o Profissional */}
            {(professional.personal_description || professional.description) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-500" />
                    Sobre o Profissional
                  </h2>
                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {professional.personal_description || professional.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Serviços que Realiza */}
            <ServicesList professional={professional} />

            {/* Trabalhos Realizados (Portfolio Premium) */}
            {isPremium && portfolioItems.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    Trabalhos Realizados
                  </h2>
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    Premium
                  </Badge>
                </div>

                {portfolioItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-2 border-purple-100">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {item.service_type && (
                            <Badge variant="outline">{item.service_type}</Badge>
                          )}
                          {item.project_value && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              <DollarSign className="w-3 h-3 mr-1" />
                              R$ {parseFloat(item.project_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-slate-600 mt-3">{item.description}</p>
                        )}
                      </div>

                      {item.portfolio_photos && item.portfolio_photos.length > 0 && (
                        <PortfolioGallery photos={item.portfolio_photos} />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !isPremium && (
              <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    Trabalhos Realizados
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Este profissional ainda não ativou seu Portfolio Premium de projetos detalhados.
                  </p>
                  <p className="text-sm text-purple-600">
                    Profissionais Premium podem mostrar até 3 projetos com fotos e valores.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Avaliacoes */}
            {reviews.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Avaliacoes ({reviews.length})
                  </h2>
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                    {reviews.length > 5 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.location.href = `/ProfessionalReviews?id=${professionalId}`}
                      >
                        Ver todas as {reviews.length} avaliações
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="lg:col-span-1 space-y-6">
            {/* Disponibilidade */}
            <PublicAvailabilityView
              professionalId={professionalId}
              professional={professional}
            />

            {/* Area de Atendimento */}
            <ServiceAreaMap professional={professional} />

            {/* Formulario de orçamento */}
            <div id="quote-form">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Solicitar Orçamento com {professional?.name?.split(' ')[0]}
                  </h2>
                  <AppointmentRequestForm
                    professionalId={professionalId}
                    professionalName={professional?.name}
                    serviceType={professionLabels[professional?.profession] || professional?.profession}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ====== FOOTER ====== */}
      <div className="bg-slate-900 text-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            Portfolio criado com ConectPro - Encontre os melhores profissionais
          </p>
        </div>
      </div>

      {/* ====== BOTAO FLUTUANTE CONVERSAR ====== */}
      {professional?.id && (
        <Link
          to={createPageUrl("Conversations") + `?start_chat_with=${professional.id}`}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-2xl rounded-full px-6 py-6 text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Conversar
          </Button>
        </Link>
      )}
    </div>
  );
}
