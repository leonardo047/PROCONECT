import React from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Star, Phone, Instagram, Calendar, Award, Share2, MessageCircle } from "lucide-react";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { showToast } from "@/utils/showToast";

export default function ProfessionalCard() {
  const urlParams = new URLSearchParams(window.location.search);
  const professionalId = urlParams.get('id');

  const { user, isLoadingAuth } = useAuth();

  const { data: professional, isLoading } = useQuery({
    queryKey: ['professional-card', professionalId],
    queryFn: async () => {
      const profs = await Professional.filter({ id: professionalId });
      return profs[0];
    },
    enabled: !!professionalId
  });

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: professional.name,
        text: `Confira o perfil de ${professional.name} no ConectPro!`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      showToast.success('Link copiado!');
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Olá ${professional.name}! Vi seu cartão digital no ConectPro.`);
    window.open(`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  if (isLoading || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Profissional não encontrado</h2>
          <p className="text-slate-600">Este cartão digital não está disponível.</p>
        </div>
      </div>
    );
  }

  // Verificar se tem plano pago
  const isPaidPlan = professional.plan_type !== 'free' && professional.plan_active;

  if (!isPaidPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Cartão Digital Premium</h2>
            <p className="text-slate-600 mb-4">
              Este recursó está disponível apenas para profissionais com plano pago.
            </p>
            <Badge className="bg-orange-500">Recursó Premium</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900">
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header com Share */}
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={handleShare}
            className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
        </div>

        {/* Card Principal */}
        <Card className="overflow-hidden border-0 shadow-2xl">
          {/* Banner com Foto de Capa */}
          <div className="relative h-64 bg-gradient-to-r from-orange-500 to-orange-600">
            {professional.photos?.[0] && (
              <img
                src={professional.photos[0]}
                alt="Capa"
                className="w-full h-full object-cover opacity-50"
              />
            )}

            {/* Foto de Perfil */}
            <div className="absolute -bottom-16 left-8">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
                {professional.photos?.[0] ? (
                  <img
                    src={professional.photos[0]}
                    alt={professional.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-4xl font-bold">
                    {professional.name[0]}
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="pt-20 pb-8 px-8">
            {/* Info Principal */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{professional.name}</h1>
              <p className="text-xl text-orange-600 font-semibold mb-3 capitalize">
                {professional.profession?.replace(/_/g, ' ')}
              </p>

              <div className="flex items-center gap-4 text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{professional.city}, {professional.state}</span>
                </div>
                {professional.rating && (
                  <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-yellow-700">{professional.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Descrição */}
            {professional.description && (
              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-2">Sobre</h3>
                <p className="text-slate-600 leading-relaxed">{professional.description}</p>
              </div>
            )}

            {/* Especializações */}
            {professional.specializations && professional.specializations.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-3">Especializações</h3>
                <div className="flex flex-wrap gap-2">
                  {professional.specializations.map((spec, i) => (
                    <Badge key={i} variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Galeria de Fotos */}
            {professional.photos && professional.photos.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-3">Galeria de Trabalhos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {professional.photos.map((photo, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden">
                      <img
                        src={photo}
                        alt={`Trabalho ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informações de Contato */}
            <div className="mb-6">
              <h3 className="font-bold text-slate-900 mb-3">Informações de Contato</h3>
              <div className="space-y-3">
                {professional.whatsapp && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">WhatsApp</p>
                      <p className="font-semibold">{professional.whatsapp}</p>
                    </div>
                  </div>
                )}

                {professional.instagram && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Instagram</p>
                      <p className="font-semibold">@{professional.instagram}</p>
                    </div>
                  </div>
                )}

                {professional.google_maps_link && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Localização</p>
                      <a
                        href={professional.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        Ver no Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={handleWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white py-6 text-lg"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chamar no WhatsApp
              </Button>

              <Button
                onClick={() => window.location.href = `/ProfessionalProfile?id=${professional.id}`}
                variant="outline"
                className="py-6 text-lg border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Solicitar Orçamento
              </Button>
            </div>

            {/* Rodapé */}
            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-sm text-slate-500">
                Cartão Digital criado com o <span className="font-bold text-orange-600">ConectPro</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
