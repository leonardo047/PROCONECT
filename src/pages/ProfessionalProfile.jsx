import React, { useState } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Review } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import {
  MapPin, Instagram, ArrowLeft, Loader2,
  Camera, Video, CheckCircle, Star, MessageSquare, Lock, MessageCircle
} from "lucide-react";
import WhatsAppButton from "@/componentes/interface do usuário/WhatsAppButton";
import PhotoGallery from "@/componentes/interface do usuário/PhotoGallery";
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

  const { data: professional, isLoading } = useQuery({
    queryKey: ['professional', professionalId],
    queryFn: async () => {
      const results = await Professional.filter({ id: professionalId });
      return results[0] || null;
    },
    enabled: !!professionalId
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

  const featuredReviews = reviews.filter(r => r.is_featured).slice(0, 3);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  // Verificar se o PROFISSIONAL é pagante (tem créditos, créditos ilimitados ou plano ativo)
  const isProfessionalPaid = professional && (
    (professional.credits_balance && professional.credits_balance > 0) ||
    professional.has_unlimited_credits ||
    professional.plan_active
  );

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

  // Usar avatar_url como foto principal se disponível, senão a primeira foto do array
  const mainPhoto = professional.avatar_url || professional.photos?.[0] || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=400&fit=crop";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Image */}
      <div className="relative h-64 md:h-80 bg-slate-900">
        <img
          src={mainPhoto}
          alt={professional.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-16">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white mb-3">
                  {professionLabels[professional.profession] || professional.profession}
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  {professional.name}
                </h1>
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{professional.city}, {professional.state}</span>
                  </div>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-yellow-700">{avgRating}</span>
                      <span className="text-sm text-slate-500">({reviews.length} avaliações)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {isProfessionalPaid && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Perfil Verificado
                  </div>
                )}
              </div>
            </div>

            {/* Descrição Pessoal */}
            {(professional.personal_description || professional.description) && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Sobre</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {professional.personal_description || professional.description}
                </p>
              </div>
            )}

            {/* Contact Section */}
            <div className="bg-slate-50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Contato</h2>

              {isProfessionalPaid ? (
                // Profissional é pagante - mostra WhatsApp e Instagram
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <WhatsAppButton
                      phone={professional.whatsapp}
                      professionalName={professional.name}
                      className="flex-1"
                    />

                    {professional.instagram && (
                      <a
                        href={`https://instagram.com/${professional.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="w-full sm:w-auto gap-2">
                          <Instagram className="w-5 h-5" />
                          Instagram
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                // Profissional NÃO é pagante - mostra apenas opções de contato via plataforma
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 mb-2">
                        Contato via Plataforma
                      </h3>
                      <p className="text-slate-600 text-sm mb-4">
                        Este profissional ainda não ativou o contato direto.
                        Você pode entrar em contato através da nossa plataforma:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => setActiveTab('schedule')}
                          className="bg-orange-500 hover:bg-orange-600 flex-1"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Solicitar Orçamento
                        </Button>
                        {user ? (
                          <Link to={createPageUrl("Conversations") + `?professionalId=${professionalId}`}>
                            <Button variant="outline" className="w-full">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Chat da Plataforma
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="outline" onClick={navigateToLogin}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Fazer Login para Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Photos - Sempre visível */}
            {professional.photos && professional.photos.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Trabalhos Realizados ({professional.photos.length})
                  </h2>
                </div>
                <PhotoGallery photos={professional.photos} />
              </div>
            )}

            {/* Video */}
            {professional.video_url && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Video className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Vídeo</h2>
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
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                  <TabsTrigger
                    value="reviews"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Avaliações ({reviews.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="add-review"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Avaliar Profissional
                  </TabsTrigger>
                  <TabsTrigger
                    value="schedule"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Solicitar Orçamento
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reviews" className="mt-6 space-y-4">
                  {featuredReviews.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
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
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                      <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">Nenhuma avaliação ainda</p>
                      <p className="text-sm text-slate-400">Seja o primeiro a avaliar este profissional!</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="add-review" className="mt-6">
                  <ReviewForm
                    professionalId={professionalId}
                    onSuccess={() => {
                      showToast.success('Avaliação enviada com sucesso!');
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
        </div>
      </div>
    </div>
  );
}
