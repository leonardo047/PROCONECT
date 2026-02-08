import React, { useState } from 'react';
import { Appointment, Professional, Notification } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { showToast } from "@/utils/showToast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Calendar } from "@/componentes/interface do usuário/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/componentes/interface do usuário/popover";
import { Calendar as CalendarIcon, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AppointmentRequestForm({ professionalId, professionalName, serviceType, onSuccess }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    description: '',
    preferred_time: 'manha',
    address: '',
    property_type: 'casa'
  });

  const requestMutation = useMutation({
    mutationFn: async (appointmentData) => {
      const appointment = await Appointment.create(appointmentData);

      // Create notification for professional
      try {
        const professional = await Professional.get(professionalId);
        if (professional?.user_id) {
          await Notification.create({
            user_id: professional.user_id,
            type: 'appointment',
            title: 'Nova Solicitação de Orçamento!',
            message: `${appointmentData.client_name} solicitou um orçamento para ${format(new Date(appointmentData.preferred_date), "dd/MM/yyyy", { locale: ptBR })}`,
            link: `/ProfessionalSchedule`,
            priority: 'high'
          });
        }
      } catch {
        // Notificação falhou, mas appointment foi criado
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      // Limpar formulário
      setSelectedDate(null);
      setFormData({
        client_name: '',
        client_phone: '',
        description: '',
        preferred_time: 'manha',
        address: '',
        property_type: 'casa'
      });
      showToast.success('Solicitação enviada com sucesso! O profissional entrará em contato.');
      if (onSuccess) onSuccess();
    },
    onError: () => {
      showToast.error('Erro ao enviar solicitação. Por favor, tente novamente.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedDate) {
      showToast.warning('Selecione uma data');
      return;
    }

    if (!formData.client_phone || !formData.description || !formData.address || !formData.client_name) {
      showToast.warning('Preencha todos os campos obrigatórios');
      return;
    }

    if (!isAuthenticated || !user) {
      // Salvar dados no localStorage e redirecionar para login
      localStorage.setItem('pending_appointment', JSON.stringify({
        professional_id: professionalId,
        service_type: serviceType,
        ...formData,
        preferred_date: selectedDate.toISOString().split('T')[0]
      }));
      navigateToLogin();
      return;
    }

    requestMutation.mutate({
      professional_id: professionalId,
      client_id: user.id,
      client_name: formData.client_name || user.full_name || 'Cliente',
      client_phone: formData.client_phone,
      service_type: serviceType || 'Serviço não especificado',
      description: `${formData.description}\n\nTipo de imóvel: ${formData.property_type || 'casa'}`,
      preferred_date: selectedDate.toISOString().split('T')[0],
      preferred_time: formData.preferred_time,
      address: formData.address,
      status: 'pending'
    });
  };

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle>Solicitar Orçamento com {professionalName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Picker */}
          <div>
            <Label>Data Preferida *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start mt-1">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Preference */}
          <div>
            <Label>Período Preferido *</Label>
            <Select value={formData.preferred_time} onValueChange={(value) => setFormData({ ...formData, preferred_time: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manha">Manhã (08:00 - 12:00)</SelectItem>
                <SelectItem value="tarde">Tarde (13:00 - 18:00)</SelectItem>
                <SelectItem value="noite">Noite (18:00 - 22:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nome e Telefone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Seu Nome *</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Como prefere ser chamado"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Seu Telefone *</Label>
              <Input
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="mt-1"
              />
            </div>
          </div>

          {/* Address e Tipo de Imóvel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bairro e Número *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: Centro, Rua X, nº 123"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo de Imóvel</Label>
              <Select value={formData.property_type} onValueChange={(value) => setFormData({ ...formData, property_type: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="industria">Indústria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Descreva o Serviço *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva detalhadamente o que você precisa..."
              className="mt-1 min-h-[100px]"
            />
          </div>

          {!isAuthenticated && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Você será redirecionado para fazer login antes de enviar a solicitação
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={requestMutation.isPending}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {requestMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : isAuthenticated ? (
              <>
                <Send className="w-5 h-5 mr-2" />
                Solicitar Orçamento
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Continuar (Login necessário)
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
