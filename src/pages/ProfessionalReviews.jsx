import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Review } from "@/lib/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Button } from "@/componentes/interface do usuário/button";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Star, MessageSquare, Loader2, Trophy, TrendingUp } from "lucide-react";
import ReviewCard from "@/componentes/avaliações/ReviewCard";

export default function ProfessionalReviews() {
  const queryClient = useQueryClient();
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin } = useAuth();
  const [professional, setProfessional] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin]);

  // Load professional profile
  useEffect(() => {
    const loadProfessional = async () => {
      if (user) {
        try {
          const profResults = await Professional.filter({ filters: { user_id: user.id } });
          if (profResults[0]) {
            setProfessional(profResults[0]);
          }
        } catch (e) {
          console.error('Error loading professional:', e);
        }
      }
    };
    loadProfessional();
  }, [user]);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['my-reviews', professional?.id],
    queryFn: async () => {
      if (!professional) return [];
      const results = await Review.filter({
        filters: { professional_id: professional.id },
        orderBy: { field: 'created_date', direction: 'desc' },
        limit: 100
      });
      return results;
    },
    enabled: !!professional
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ reviewId, isFeatured }) => {
      await Review.update(reviewId, { is_featured: !isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    }
  });

  if (isLoadingAuth || !user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Minhas Avaliacoes</h1>
          <p className="text-slate-600">Veja e responda as avaliacoes dos seus clientes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Avaliacao Media</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-orange-600">{avgRating}</p>
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
                <Trophy className="w-12 h-12 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total de Avaliacoes</p>
                  <p className="text-3xl font-bold text-slate-900">{reviews.length}</p>
                </div>
                <MessageSquare className="w-12 h-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Sem Resposta</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {reviews.filter(r => !r.response).length}
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Distribuicao de Avaliacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingDistribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{star}</span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all"
                      style={{
                        width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%'
                      }}
                    />
                  </div>
                  <span className="text-sm text-slate-600 w-12 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map(review => (
              <div key={review.id} className="relative">
                <ReviewCard review={review} isProfessional={true} />
                <div className="absolute top-4 right-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFeaturedMutation.mutate({
                      reviewId: review.id,
                      isFeatured: review.is_featured
                    })}
                    className={review.is_featured ? 'border-orange-500 text-orange-600' : ''}
                  >
                    <Star className={`w-4 h-4 mr-1 ${review.is_featured ? 'fill-orange-500' : ''}`} />
                    {review.is_featured ? 'Destacado' : 'Destacar'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">
                  Nenhuma avaliacao ainda
                </h3>
                <p className="text-slate-500">
                  Suas avaliacoes aparecerao aqui quando os clientes avaliarem seus servicos.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
