import React, { useState } from 'react';
import { Button } from "@/componentes/interface do usuário/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/interface do usuário/dialog";
import { Input } from "@/componentes/interface do usuário/input";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { Notification } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { showToast } from "@/utils/showToast";

export default function QuickContactButton({ professional }) {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    message: ''
  });

  const isPaidPlan = professional.plan_type !== 'free' && professional.plan_active;
  const isFree = professional.plan_type === 'free';

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      // Verificar se usuário está logado
      if (!isAuthenticated) {
        // Salvar dados no localStorage e redirecionar para login
        localStorage.setItem('pending_contact', JSON.stringify({
          professional_id: professional.id,
          ...data
        }));
        navigateToLogin();
        return;
      }

      // Criar notificação para o profissional
      await Notification.create({
        user_id: professional.user_id,
        type: 'message',
        title: `Nova mensagem de ${data.client_name}`,
        message: `${data.message}\n\nTelefone: ${data.client_phone}`,
        link: `/professional-dashboard`
      });

      return data;
    },
    onSuccess: () => {
      showToast.success('Mensagem enviada! O profissional receberá sua solicitação.');
      setShowDialog(false);
      setFormData({ client_name: '', client_phone: '', message: '' });
    }
  });

  const handleWhatsApp = () => {
    if (isFree) {
      showToast.warning('WhatsApp disponível apenas no plano pago. Use o chat interno.');
      return;
    }
    const message = encodeURIComponent(`Olá! Vi seu perfil no ConectPro e gostaria de solicitar um orçamento.`);
    window.open(`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleInternalChat = () => {
    if (isFree) {
      setShowPaymentDialog(true);
      return;
    }
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.client_name || !formData.client_phone || !formData.message) {
      showToast.warning('Preencha todos os campos');
      return;
    }

    sendMessageMutation.mutate(formData);
  };

  return (
    <>
      <div className="flex gap-2">
        {isPaidPlan && (
          <Button
            onClick={handleWhatsApp}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        )}

        <Button
          onClick={handleInternalChat}
          variant={isFree ? "default" : "outline"}
          className={`flex-1 ${isFree ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
        >
          <Send className="w-4 h-4 mr-2" />
          {isFree ? 'Chat Interno' : 'Enviar Mensagem'}
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar em Contato</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Seu Nome *</label>
              <Input
                placeholder="Como prefere ser chamado"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-1 block">Telefone (WhatsApp) *</label>
              <Input
                placeholder="(11) 99999-9999"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-1 block">Mensagem *</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
                placeholder="Descreva o que você precisa..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                Sem login necessário! Mas você será solicitado a fazer login para enviar a mensagem.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog for Free Plan */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat Bloqueado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900 mb-3">
                Este profissional está no plano gratuito. Para responder mensagens, ele precisa:
              </p>
              <ul className="text-sm text-orange-800 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  Assinar um plano mensal
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  OU pagar <span className="font-bold">R$ 3,33</span> por este contato
                </li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-slate-600 text-sm">
                Sugestão: Busque profissionais com plano pago para contato direto via WhatsApp!
              </p>
            </div>
          </div>

          <Button onClick={() => setShowPaymentDialog(false)} className="w-full">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
