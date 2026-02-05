import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Professional, Review, PortfolioService } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  MapPin, Star, Instagram, Clock, Share2,
  ExternalLink, Briefcase, CheckCircle, Camera,
  ChevronLeft, ChevronRight, X, MessageCircle, User, DollarSign, Sparkles, Lock, MessageSquare
} from "lucide-react";
import PublicAvailabilityView from "@/componentes/profissional/PublicAvailabilityView";
import AvailabilityStatusBadge from "@/componentes/profissional/AvailabilityStatusBadge";
import AppointmentRequestForm from "@/componentes/agendamentos/AppointmentRequestForm";
import ReviewCard from "@/componentes/avaliações/ReviewCard";

const professionLabels = {
  pintura_residencial: "Pintura Residencial e Comercial",
  pedreiro_alvenaria: "Pedreiro / Alvenaria",
  eletricista: "Eletrica",
  hidraulica: "Hidraulica",
  limpeza: "Limpeza Residencial / Pos-obra",
  jardinagem: "Jardinagem / Rocada",
  gesso_drywall: "Gesso / Drywall",
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
  montador_moveis: "Montador de Moveis",
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
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
      // Salvar URL atual para retornar apos login
      const chatUrl = encodeURIComponent(`/Conversations?start_chat_with=${professionalId}`);
      navigate(`/login?returnUrl=${chatUrl}`);
      return;
    }

    // Se for profissional tentando conversar com outro profissional, nao permitir
    if (user?.user_type === 'profissional') {
      alert('Apenas clientes podem iniciar conversas com profissionais.');
      return;
    }

    // Navegar para conversas com parametro para iniciar chat
    navigate(`/Conversations?start_chat_with=${professionalId}`);
  };

  // Buscar profissional usando fetch direto (evita race condition do Supabase client)
  const { data: professional, isLoading, error } = useQuery({
    queryKey: ['portfolio-professional', professionalId],
    queryFn: async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        // Buscar token de autenticação se disponível
        const headers = {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        };

        // Tentar pegar o token do localStorage para passar na requisição
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

      // Buscar items com fotos
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

  // Buscar avaliacoes
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

  const openWhatsApp = () => {
    if (!professional?.whatsapp) return;
    const phone = professional.whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(`Ola! Vi seu portfolio no ConectPro e gostaria de saber mais sobre seus servicos.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Portfolio nao encontrado</h2>
            <p className="text-slate-600 mb-4">
              O portfolio que voce esta procurando nao existe ou nao esta mais ativo.
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

  // Verificar se é conta premium para mostrar portfolio completo
  const isPremium = professional.plan_active && professional.plan_type !== 'free';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header com gradiente */}
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
            {/* Foto do perfil (avatar) */}
            <div className="flex-shrink-0">
              {(professional.avatar_url || (professional.photos && professional.photos.length > 0)) ? (
                <img
                  src={professional.avatar_url || professional.photos[0]}
                  alt={professional.name}
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white/30 shadow-lg"
                  onError={(e) => {
                    // Se a imagem falhar, mostra as iniciais
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-32 h-32 bg-white/20 rounded-2xl items-center justify-center text-5xl font-bold border-4 border-white/30"
                style={{ display: (professional.avatar_url || professional.photos?.length > 0) ? 'none' : 'flex' }}
              >
                {professional.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>

            {/* Informacoes */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    {professional.name}
                  </h1>
                  <p className="text-xl text-white/90 mb-3">
                    {professionLabels[professional.profession] || professional.profession}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-white/90 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{professional.city}, {professional.state}</span>
                    </div>
                    {professional.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                        <span className="font-semibold">{professional.rating.toFixed(1)}</span>
                        <span className="text-sm text-white/70">({reviews.length} avaliacoes)</span>
                      </div>
                    )}
                    {professional.total_jobs > 0 && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{professional.total_jobs} trabalhos</span>
                      </div>
                    )}
                  </div>

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

              {/* Badge Premium */}
              {isPremium && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 mt-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Profissional Premium
                </Badge>
              )}

              {/* Descricao resumida do profissional */}
              {professional.description && (
                <div className="mt-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm max-w-2xl">
                  <p className="text-white leading-relaxed">
                    {professional.description}
                  </p>
                </div>
              )}

              {/* Botoes de contato */}
              <div className="flex flex-wrap gap-3 mt-6">
                <Button
                  onClick={startChat}
                  className="bg-white text-orange-600 hover:bg-orange-50"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Conversar
                </Button>
                {professional.whatsapp && (
                  <Button
                    onClick={openWhatsApp}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                {professional.instagram && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://instagram.com/${professional.instagram.replace('@', '')}`, '_blank')}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
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

      {/* Conteudo principal */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal - Portfolio */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sobre o Profissional - Descricao Pessoal ou Descricao Principal */}
            {(professional.personal_description || professional.description) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-500" />
                    Sobre o Profissional
                  </h2>

                  {/* Descricao pessoal (mais detalhada) */}
                  {professional.personal_description && (
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {professional.personal_description}
                    </p>
                  )}

                  {/* Descricao principal como fallback ou complemento */}
                  {professional.description && !professional.personal_description && (
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {professional.description}
                    </p>
                  )}

                  {/* Se tem ambas descricoes e sao diferentes, mostra a descricao dos servicos tambem */}
                  {professional.description && professional.personal_description &&
                   professional.description !== professional.personal_description && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-orange-500" />
                        Sobre os Servicos
                      </h3>
                      <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm">
                        {professional.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fotos do Perfil - Sempre mostra para todos */}
            {professional.photos && professional.photos.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-orange-500" />
                    Galeria de Trabalhos
                  </h2>
                  <PortfolioGallery
                    photos={professional.photos.map((url, i) => ({ id: i, photo_url: url }))}
                  />
                </CardContent>
              </Card>
            )}

            {/* Portfolio de Projetos - Apenas para Premium */}
            {isPremium && portfolioItems.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    Portfolio de Projetos
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
              // Bloco informativo para conta gratuita
              <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    Portfolio de Projetos
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Este profissional ainda nao ativou seu Portfolio Premium de projetos detalhados.
                  </p>
                  <p className="text-sm text-purple-600">
                    Profissionais Premium podem mostrar ate 3 projetos com fotos e valores.
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
                        Ver todas as {reviews.length} avaliacoes
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card de contato rapido */}
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Entre em Contato</h3>

                {/* Botao de Chat do App - Principal */}
                <Button
                  onClick={startChat}
                  className="w-full bg-orange-500 hover:bg-orange-600 mb-3"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Conversar pelo App
                </Button>

                {professional.whatsapp && (
                  <Button
                    onClick={openWhatsApp}
                    variant="outline"
                    className="w-full mb-3 border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const element = document.getElementById('appointment-form');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Solicitar Orcamento
                </Button>

                {/* Links sociais */}
                {professional.instagram && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://instagram.com/${professional.instagram.replace('@', '')}`, '_blank')}
                      className="w-full justify-start text-slate-600"
                    >
                      <Instagram className="w-4 h-4 mr-2" />
                      {professional.instagram}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Disponibilidade */}
            <PublicAvailabilityView
              professionalId={professionalId}
              professional={professional}
            />

            {/* Formulario de agendamento */}
            <div id="appointment-form">
              <AppointmentRequestForm
                professionalId={professionalId}
                professionalName={professional?.name}
                serviceType={professionLabels[professional?.profession] || professional?.profession}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            Portfolio criado com ConectPro - Encontre os melhores profissionais
          </p>
        </div>
      </div>
    </div>
  );
}
