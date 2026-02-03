import React, { useState } from 'react';
import { Review, Professional, Notification } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Star, Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewForm({ professionalId, onSuccess }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitReview = useMutation({
    mutationFn: async (reviewData) => {
      await Review.create(reviewData);

      // Create notification for professional
      const professionals = await Professional.filter({ id: professionalId });
      if (professionals[0]) {
        await Notification.create({
          user_id: professionals[0].user_id,
          type: 'review',
          title: 'Nova Avaliação Recebida!',
          message: `Você recebeu uma avaliação de ${rating} estrelas!`,
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
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['professional'] });
      setRating(0);
      setComment('');
      if (onSuccess) onSuccess();
    }
  });

  const handleSubmit = () => {
    if (!user) {
      alert('Você precisa estar logado para avaliar');
      return;
    }

    if (rating === 0) {
      alert('Selecione uma nota de 1 a 5 estrelas');
      return;
    }

    if (!comment.trim()) {
      alert('Escreva um comentário sobre o serviço');
      return;
    }

    submitReview.mutate({
      professional_id: professionalId,
      client_id: user.id,
      client_name: user.full_name || 'Cliente',
      rating,
      comment
    });
  };

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
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitReview.isPending}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-12"
        >
          {submitReview.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Send className="w-5 h-5 mr-2" />
          )}
          Publicar Avaliação
        </Button>
      </CardContent>
    </Card>
  );
}
