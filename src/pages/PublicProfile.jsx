import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Professional, Review } from "@/lib/entities";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  MapPin, Star, Phone, Instagram, Clock, Share2,
  ExternalLink, Briefcase, Award, CheckCircle
} from "lucide-react";
import PublicAvailabilityView from "@/componentes/profissional/PublicAvailabilityView";
import AvailabilityStatusBadge from "@/componentes/profissional/AvailabilityStatusBadge";
import AppointmentRequestForm from "@/componentes/agendamentos/AppointmentRequestForm";
import PhotoGallery from "@/componentes/interface do usuário/PhotoGallery";
import ReviewCard from "@/componentes/avaliações/ReviewCard";

export default function PublicProfile() {
  const [slug, setSlug] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSlug(params.get('slug'));
  }, []);

  const { data: professional, isLoading, error } = useQuery({
    queryKey: ['public-professional', slug],
    queryFn: async () => {
      const results = await Professional.filter({
        slug: slug,
        is_approved: true,
        plan_active: true
      }, { order: '-created_date', limit: 1 });
      return results[0];
    },
    enabled: !!slug
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['professional-reviews', professional?.id],
    queryFn: async () => {
      const results = await Review.filter({
        professional_id: professional.id,
        is_approved: true
      }, { order: '-created_date', limit: 20 });
      return results;
    },
    enabled: !!professional?.id
  });

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: professional.name,
          text: `Confira o perfil de ${professional.name} no ProObra`,
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const professionLabels = {
    pedreiro: "Pedreiro",
    pintor: "Pintor",
    eletricista_residencial: "Eletricista Residencial",
    encanador: "Encanador",
    marceneiro: "Marceneiro"
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Carregando perfil...</p>
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Perfil não encontrado</h2>
            <p className="text-slate-600 mb-4">
              O perfil que você está procurando não existe ou não está mais ativo.
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

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            ← Voltar
          </Button>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  {professional.photos && professional.photos.length > 0 ? (
                    <img
                      src={professional.photos[0]}
                      alt={professional.name}
                      className="w-32 h-32 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white text-4xl font-bold">
                      {professional.name[0]}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {professional.name}
                      </h1>
                      <p className="text-xl text-slate-600 mb-3">
                        {professionLabels[professional.profession] || professional.profession}
                      </p>
                      <div className="flex items-center gap-4 text-slate-600 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{professional.city}, {professional.state}</span>
                        </div>
                        {professional.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">{professional.rating.toFixed(1)}</span>
                            <span className="text-sm text-slate-500">({reviews.length} avaliações)</span>
                          </div>
                        )}
                        {professional.total_jobs > 0 && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span>{professional.total_jobs} trabalhos</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleShare}
                      className="flex-shrink-0"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                    </Button>
                  </div>

                  <AvailabilityStatusBadge professional={professional} showDetails={true} />

                  {professional.description && (
                    <p className="text-slate-700 mt-4">{professional.description}</p>
                  )}

                  {/* Quick Contact Buttons */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    {professional.whatsapp && (
                      <Button
                        onClick={() => window.open(`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}`, '_blank')}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    )}
                    {professional.instagram && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://instagram.com/${professional.instagram.replace('@', '')}`, '_blank')}
                      >
                        <Instagram className="w-4 h-4 mr-2" />
                        Instagram
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            {professional.photos && professional.photos.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Galeria de Trabalhos</h2>
                  <PhotoGallery photos={professional.photos} />
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">
                    Avaliações ({reviews.length})
                  </h2>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            <PublicAvailabilityView
              professionalId={professional.id}
              professional={professional}
            />
            <AppointmentRequestForm
              professionalId={professional.id}
              professional={professional}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
