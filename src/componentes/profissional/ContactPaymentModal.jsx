import React, { useState } from 'react';
import { ContactRequest, ClientSubscription } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/interface do usuário/dialog";
import { Check, CreditCard, Loader2, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactPaymentModal({
  isOpen,
  onClose,
  professionalId,
  professionalName,
  onContactRevealed
}) {
  const queryClient = useQueryClient();
  const { user, updateProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const revealContactMutation = useMutation({
    mutationFn: async (planType) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check free contacts
      if (user.free_contacts_used < (user.free_contacts_limit || 3)) {
        // Use free contact
        await updateProfile({
          free_contacts_used: (user.free_contacts_used || 0) + 1
        });

        await ContactRequest.create({
          client_id: user.id,
          professional_id: professionalId,
          status: 'free',
          contact_revealed: true,
          payment_amount: 0
        });

        return { success: true, isFree: true };
      }

      // Need to pay
      if (planType === 'daily') {
        // Simulate payment
        const subscription = await ClientSubscription.create({
          user_id: user.id,
          plan_type: 'diario',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        });

        await ContactRequest.create({
          client_id: user.id,
          professional_id: professionalId,
          status: 'paid',
          contact_revealed: true,
          payment_amount: 3.69
        });

        return { success: true, isFree: false };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['contact-requests'] });
      if (onContactRevealed) onContactRevealed();
      onClose();
    }
  });

  const handleReveal = (planType) => {
    revealContactMutation.mutate(planType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            Ver Contato de {professionalName}
          </DialogTitle>
        </DialogHeader>

        {revealContactMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-slate-600">Processando...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Free Contact Info */}
            <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Contatos Gratuitos</h3>
                  <Badge className="bg-green-500">Grátis</Badge>
                </div>
                <p className="text-slate-600 mb-4">
                  Você tem <strong>3 contatos gratuitos</strong> para testar a plataforma!
                </p>
                <Button
                  onClick={() => handleReveal('free')}
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={revealContactMutation.isPending}
                >
                  Usar Contato Gratuito
                </Button>
              </CardContent>
            </Card>

            {/* Daily Plan */}
            <Card className="border-2 border-orange-300 hover:border-orange-500 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Acesso de 1 Dia</h3>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-600">R$ 3,69</p>
                    <p className="text-sm text-slate-500">por 24 horas</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-slate-700">
                    <Check className="w-5 h-5 text-green-500" />
                    Contatos ilimitados por 24h
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <Check className="w-5 h-5 text-green-500" />
                    WhatsApp direto dos profissionais
                  </li>
                  <li className="flex items-center gap-2 text-slate-700">
                    <Check className="w-5 h-5 text-green-500" />
                    Sem compromisso
                  </li>
                </ul>

                <Button
                  onClick={() => handleReveal('daily')}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={revealContactMutation.isPending}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pagar e Ver Contato
                </Button>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-slate-500">
              Ao continuar, você concorda com nossos termos de serviço
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
