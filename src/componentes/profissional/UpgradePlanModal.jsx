import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/componentes/interface do usuário/dialog';
import { Button } from '@/componentes/interface do usuário/button';
import { Crown, Check, Image, FolderPlus, Sparkles } from 'lucide-react';
import { PORTFOLIO_LIMITS } from '@/lib/constants/portfolioLimits';

export default function UpgradePlanModal({
  open,
  onOpenChange,
  limitType = 'projects' // 'projects' ou 'photos'
}) {
  const handleNavigateToPlan = () => {
    window.location.href = '/ProfessionalDashboard?tab=plan';
    onOpenChange(false);
  };

  const limitMessages = {
    projects: {
      title: 'Limite de Serviços Atingido',
      description: `Você atingiu o limite de ${PORTFOLIO_LIMITS.FREE.MAX_PROJECTS} serviços do plano gratuito.`,
      upgrade: `Com o plano premium, você pode adicionar até ${PORTFOLIO_LIMITS.PREMIUM.MAX_PROJECTS} serviços!`
    },
    photos: {
      title: 'Limite de Fotos Atingido',
      description: `Você atingiu o limite de ${PORTFOLIO_LIMITS.FREE.MAX_PHOTOS_PER_PROJECT} fotos por serviço do plano gratuito.`,
      upgrade: `Com o plano premium, você pode adicionar até ${PORTFOLIO_LIMITS.PREMIUM.MAX_PHOTOS_PER_PROJECT} fotos por serviço!`
    }
  };

  const message = limitMessages[limitType];

  const premiumBenefits = [
    {
      icon: FolderPlus,
      text: `Até ${PORTFOLIO_LIMITS.PREMIUM.MAX_PROJECTS} serviços cadastrados`
    },
    {
      icon: Image,
      text: `Até ${PORTFOLIO_LIMITS.PREMIUM.MAX_PHOTOS_PER_PROJECT} fotos por serviço`
    },
    {
      icon: Sparkles,
      text: 'Destaque nos resultados de busca'
    },
    {
      icon: Check,
      text: 'Créditos ilimitados para responder orçamentos'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-xl">{message.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-slate-600">{message.description}</p>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <p className="font-semibold text-amber-800 mb-3">
              {message.upgrade}
            </p>

            <div className="space-y-2">
              {premiumBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-amber-700">
                  <benefit.icon className="w-4 h-4 text-amber-500" />
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Voltar
            </Button>
          </DialogClose>
          <Button
            onClick={handleNavigateToPlan}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Crown className="w-4 h-4 mr-2" />
            Ver Planos Premium
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
