import React, { useState } from 'react';
import { Appointment, Notification, Professional, Reminder } from "@/lib/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Input } from "@/componentes/interface do usuário/input";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/interface do usuário/dialog";
import ChatWindow from "@/componentes/bater papo/ChatWindow";
import {
  Calendar, Clock, MapPin, Phone, CheckCircle, X,
  MessageSquare, DollarSign, Loader2, MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels = {
  pending: { label: 'Pendente', color: 'bg-yellow-500' },
  accepted: { label: 'Aceito', color: 'bg-green-500' },
  declined: { label: 'Recusado', color: 'bg-red-500' },
  completed: { label: 'Concluído', color: 'bg-blue-500' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-500' }
};

const timeLabels = {
  manha: 'Manhã (08:00 - 12:00)',
  tarde: 'Tarde (13:00 - 18:00)',
  noite: 'Noite (18:00 - 22:00)'
};

export default function AppointmentCard({ appointment, isProfessional = false, currentUser, otherUser }) {
  const queryClient = useQueryClient();
  const [showResponse, setShowResponse] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [notes, setNotes] = useState(appointment.professional_notes || '');
  const [estimatedPrice, setEstimatedPrice] = useState(appointment.estimated_price || '');

  const updateMutation = useMutation({
    mutationFn: async ({ status, data }) => {
      await Appointment.update(appointment.id, {
        status,
        ...data
      });

      // Create notification for client
      await Notification.create({
        user_id: appointment.client_id,
        type: 'appointment',
        title: status === 'accepted' ? 'Orçamento Aceito!' : 'Orçamento Recusado',
        message: status === 'accepted'
          ? `Seu pedido foi aceito! Verifique os detalhes.`
          : 'Seu pedido foi recusado. Tente outro profissional.',
        link: `/ClientAppointments`,
        priority: 'high'
      });

      // Incrementar contador de contatos grátis se for plano free
      if (status === 'accepted' && appointment.professional_id) {
        const professionals = await Professional.filter({ id: appointment.professional_id });
        if (professionals[0] && professionals[0].plan_type === 'free') {
          const currentUsed = professionals[0].free_contacts_used || 0;
          await Professional.update(professionals[0].id, {
            free_contacts_used: currentUsed + 1
          });
        }
      }

      // Se aceito, criar lembrete automático para 1 dia antes
      if (status === 'accepted' && appointment.preferred_date) {
        const serviceDate = new Date(appointment.preferred_date);
        const reminderDate = new Date(serviceDate);
        reminderDate.setDate(reminderDate.getDate() - 1);
        reminderDate.setHours(9, 0, 0, 0); // 9h da manhã do dia anterior

        // Só criar se a data do lembrete for no futuro
        if (reminderDate > new Date()) {
          await Reminder.create({
            appointment_id: appointment.id,
            recipient_id: appointment.client_id,
            reminder_date: reminderDate.toISOString(),
            service_date: serviceDate.toISOString(),
            professional_name: currentUser?.full_name || 'o profissional',
            message: `Olá! Esta é uma mensagem de lembrete amigável: amanhã estaremos aí para resolver seu problema de ${appointment.service_type}. Nos vemos em breve!`,
            sent: false
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowResponse(false);
    }
  });

  const handleAccept = () => {
    updateMutation.mutate({
      status: 'accepted',
      data: {
        professional_notes: notes,
        estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null
      }
    });
  };

  const handleDecline = () => {
    updateMutation.mutate({
      status: 'declined',
      data: {
        professional_notes: notes
      }
    });
  };

  const statusInfo = statusLabels[appointment.status];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {isProfessional ? appointment.client_name : appointment.service_type}
            </h3>
            <p className="text-sm text-slate-500">
              Solicitado em {format(new Date(appointment.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>{format(new Date(appointment.preferred_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{timeLabels[appointment.preferred_time]}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span>{appointment.address}</span>
          </div>

          {isProfessional && (
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{appointment.client_phone}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-1">Descrição do Serviço:</p>
          <p className="text-sm text-slate-600">{appointment.description}</p>
        </div>

        {appointment.professional_notes && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações do Profissional:
            </p>
            <p className="text-sm text-blue-800">{appointment.professional_notes}</p>
          </div>
        )}

        {appointment.estimated_price && (
          <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded mb-4">
            <p className="text-sm font-semibold text-green-900 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Preço Estimado:
            </p>
            <p className="text-lg font-bold text-green-800">
              R$ {appointment.estimated_price.toFixed(2)}
            </p>
          </div>
        )}

        {/* Professional Actions */}
        {isProfessional && appointment.status === 'pending' && (
          <div className="space-y-3">
            {showResponse ? (
              <>
                <Textarea
                  placeholder="Observações sobre o serviço (opcional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px]"
                />
                <Input
                  type="number"
                  placeholder="Preço estimado (opcional)"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAccept}
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Aceitar
                  </Button>
                  <Button
                    onClick={handleDecline}
                    disabled={updateMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Recusar
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowResponse(false)}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowResponse(true)}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                Responder Solicitação
              </Button>
            )}
          </div>
        )}

        {/* Chat Button */}
        {currentUser && otherUser && (
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={() => setShowChat(true)}
              variant="outline"
              className="w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Abrir Chat
            </Button>
          </div>
        )}
      </CardContent>

      {/* Chat Dialog */}
      {currentUser && otherUser && (
        <Dialog open={showChat} onOpenChange={setShowChat}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chat do Agendamento</DialogTitle>
            </DialogHeader>
            <ChatWindow
              appointmentId={appointment.id}
              currentUser={currentUser}
              otherUser={otherUser}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
