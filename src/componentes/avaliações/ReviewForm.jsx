import React, { useState } from 'react';
import { Review, Professional, Notification } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Star, Loader2, Send, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { showToast } from "@/utils/showToast";

export default function ReviewForm({ professionalId, onSuccess, onChangeTab }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  // Verificar se o usuário já avaliou este profissional
  const { data: existingReview, isLoading: checkingExisting } = useQuery({
    queryKey: ['user-review', professionalId, user?.id],
    queryFn: async () => {
      if (!user?.id || !professionalId) return null;
      const reviews = await Review.filter({
        professional_id: professionalId,
        client_id: user.id
      });
      return reviews.length > 0 ? reviews[0] : null;
    },
    enabled: !!user?.id && !!professionalId
  });

  const submitReview = useMutation({
    mutationFn: async (reviewData) => {
      // Verificar novamente se já existe avaliação para evitar duplicatas
      const existingReviews = await Review.filter({
        professional_id: professionalId,
        client_id: user.id
      });

      if (existingReviews.length > 0) {
        throw new Error('Você já avaliou este profissional');
      }

      await Review.create(reviewData);

      // Create notification for professional
      const professionals = await Professional.filter({ id: professionalId });
      if (professionals[0]) {
        await Notification.create({
          user_id: professionals[0].user_id,
          type: 'review',
          title: 'Nova Avaliação Recebida!',
          message: `Você recebeu uma avaliação de ${reviewData.rating} estrelas!`,
          link: `/ProfessionalDashboard`,
          priority: 'high'
        });
      }

      // Update professional's average rating and total jobs
      const reviews = await Review.filter({
        professional_id: professionalId,
        is_approved: true
      });
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await Professional.update(professionalId, {
        rating: avgRating,
        total_jobs: reviews.length
      });
    },
    onSuccess: () => {
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: ['reviews', professionalId] });
      queryClient.invalidateQueries({ queryKey: ['professional', professionalId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', professionalId, user?.id] });

      setRating(0);
      setComment('');

      showToast.success('Avaliação publicada com sucesso!');

      if (onSuccess) onSuccess();

      // Mudar imediatamente para aba de avaliações
      if (onChangeTab) onChangeTab('reviews');
    },
    onError: (error) => {
      showToast.error(error.message || 'Erro ao enviar avaliação');
    }
  });

  const handleSubmit = () => {
    if (!user) {
      showToast.warning('Você precisa estar logado para avaliar');
      return;
    }

    if (existingReview) {
      showToast.warning('Você já avaliou este profissional');
      return;
    }

    if (rating === 0) {
      showToast.warning('Selecione uma nota de 1 a 5 estrelas');
      return;
    }

    if (!comment.trim()) {
      showToast.warning('Escreva um comentário sobre o serviço');
      return;
    }

    submitReview.mutate({
      professional_id: professionalId,
      client_id: user.id,
      client_name: user.full_name || 'Cliente',
      rating,
      comment,
      is_approved: true
    });
  };

  // Loading enquanto verifica avaliação existente
  if (checkingExisting) {
    return (
      <Card className="border-2 border-slate-200">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-slate-500 mt-2">Verificando...</p>
        </CardContent>
      </Card>
    );
  }

  // Se já avaliou anteriormente, mostrar mensagem
  if (existingReview) {
    return (
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-blue-800 mb-2">Você já avaliou este profissional</h3>
          <p className="text-blue-600 mb-4">
            Sua avaliação de {existingReview.rating} estrelas já está visível na página.
          </p>
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= existingReview.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-300'
                }`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => onChangeTab && onChangeTab('reviews')}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            Ver avaliações
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Avaliar Profissional</h3>

        {/* Star Rating */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Sua Avaliação
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
                disabled={submitReview.isPending}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Seu Comentário
          </label>
          <Textarea
            placeholder="Conte como foi sua experiência com este profissional..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[120px] border-2 border-slate-200 focus:border-orange-500"
            disabled={submitReview.isPending}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitReview.isPending}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-12"
        >
          {submitReview.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Publicando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Publicar Avaliação
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
