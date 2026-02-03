import React, { useState } from 'react';
import { Review, Notification } from "@/lib/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Avatar } from "@/componentes/interface do usuário/avatar";
import { Star, MessageCircle, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewCard({ review, isProfessional = false }) {
  const queryClient = useQueryClient();
  const [showResponse, setShowResponse] = useState(false);
  const [response, setResponse] = useState('');

  const respondMutation = useMutation({
    mutationFn: async (responseText) => {
      await Review.update(review.id, {
        response: responseText,
        response_date: new Date().toISOString()
      });

      // Create notification for client
      await Notification.create({
        user_id: review.client_id,
        type: 'response',
        title: 'Profissional Respondeu sua Avaliação',
        message: 'O profissional respondeu ao seu comentário!',
        link: `/ProfessionalProfile?id=${review.professional_id}`,
        priority: 'medium'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setShowResponse(false);
      setResponse('');
    }
  });

  const handleRespond = () => {
    if (!response.trim()) {
      alert('Escreva uma resposta');
      return;
    }
    respondMutation.mutate(response);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                {review.client_name?.[0]?.toUpperCase() || 'C'}
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{review.client_name}</p>
                <p className="text-sm text-slate-500">
                  {new Date(review.created_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Comment */}
          <p className="text-slate-700 leading-relaxed mb-4">{review.comment}</p>

          {/* Professional Response */}
          {review.response && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg mb-4">
              <p className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Resposta do Profissional
              </p>
              <p className="text-slate-700">{review.response}</p>
              {review.response_date && (
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(review.response_date).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}

          {/* Response Form (Only for professionals) */}
          {isProfessional && !review.response && (
            <div>
              {showResponse ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Escreva sua resposta..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRespond}
                      disabled={respondMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {respondMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Enviar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowResponse(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowResponse(true)}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Responder
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
