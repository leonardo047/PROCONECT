import React, { useState } from 'react';
import { Professional, DailyAvailability } from "@/lib/entities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Switch } from "@/componentes/interface do usuário/switch";
import { Calendar } from "@/componentes/interface do usuário/calendar";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertCircle, Save, MessageSquare, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Profissoes que usam sistema de vagas diarias (slots)
const SLOT_BASED_PROFESSIONS = ['marido_aluguel', 'chaveiro', 'montador_móveis'];

export default function AvailabilityManager({ professionalId, professional }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();

  // Determinar tipo de disponibilidade atual
  const availabilityType = professional?.availability_type ||
    (SLOT_BASED_PROFESSIONS.includes(professional?.profession) ? 'slots' : 'project');

  // Fetch daily availability for next 60 days
  const { data: dailyAvailability = [] } = useQuery({
    queryKey: ['daily-availability', professionalId],
    queryFn: async () => {
      const results = await DailyAvailability.filter(
        { professional_id: professionalId },
        'date',
        100
      );
      return results;
    },
    enabled: !!professionalId && availabilityType === 'slots'
  });

  const updateProfessionalMutation = useMutation({
    mutationFn: ({ id, data }) => Professional.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['professional', professionalId]);
    }
  });

  const updateDailyAvailabilityMutation = useMutation({
    mutationFn: async ({ date, data }) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = dailyAvailability.find(
        d => d.date === dateStr && d.professional_id === professionalId
      );

      if (existing) {
        return DailyAvailability.update(existing.id, data);
      } else {
        return DailyAvailability.create({
          professional_id: professionalId,
          date: dateStr,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['daily-availability', professionalId]);
    }
  });

  const handleUpdateField = (field, value) => {
    updateProfessionalMutation.mutate({
      id: professionalId,
      data: { [field]: value }
    });
  };

  const handleBlockDate = (date) => {
    updateDailyAvailabilityMutation.mutate({
      date,
      data: { is_available: false, blocked_reason: 'Bloqueado pelo profissional' }
    });
  };

  const handleUnblockDate = (date) => {
    updateDailyAvailabilityMutation.mutate({
      date,
      data: { is_available: true, blocked_reason: null }
    });
  };

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = dailyAvailability.find(d => d.date === dateStr);

    if (!dayData) return 'available';
    if (!dayData.is_available) return 'blocked';
    if (dayData.booked_slots >= dayData.total_slots) return 'full';
    if (dayData.booked_slots > 0) return 'partial';
    return 'available';
  };

  return (
    <div className="space-y-6">
      {/* Configuracoes Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Configuracoes de Disponibilidade
          </CardTitle>
          <CardDescription>
            Configure como você quer aparecer para os clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frase curta */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              Frase de Destaque
            </Label>
            <Textarea
              placeholder="Ex: Atendo rapido e faco orçamento sem compromisso"
              defaultValue={professional?.short_phrase || ''}
              onBlur={(e) => handleUpdateField('short_phrase', e.target.value)}
              className="resize-none"
              rows={2}
            />
            <p className="text-xs text-slate-500">
              Está frase aparece no seu perfil para chamar atenção dos clientes
            </p>
          </div>

          {/* Aceita orçamentos */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <Label className="font-medium">Aceitar Orçamentos</Label>
                <p className="text-sm text-slate-500">Receber solicitações de orçamento</p>
              </div>
            </div>
            <Switch
              checked={professional?.accepts_quotes !== false}
              onCheckedChange={(checked) => handleUpdateField('accepts_quotes', checked)}
            />
          </div>

          {/* Tipo de Disponibilidade - apenas informativo */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <Label className="text-sm text-blue-700">Tipo de Profissional</Label>
            <p className="font-medium text-blue-900 mt-1">
              {availabilityType === 'slots'
                ? 'Atendimento por Vagas Diarias (ex: chaveiro, marido de aluguel)'
                : 'Atendimento por Projeto (ex: pintor, pedreiro, eletricista)'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuracoes especificas por tipo */}
      {availabilityType === 'project' ? (
        // Configuracoes para profissionais tipo 'project'
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Data do Proximo Trabalho
            </CardTitle>
            <CardDescription>
              Informe quando você estará disponível para iniciar um novo projeto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data de início do próximo trabalho</Label>
              <Input
                type="date"
                defaultValue={professional?.next_work_start_date || ''}
                onChange={(e) => handleUpdateField('next_work_start_date', e.target.value || null)}
              />
              <p className="text-xs text-slate-500">
                Os clientes verao está data no seu perfil
              </p>
            </div>

            {professional?.next_work_start_date && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Proximo trabalho inicia em</p>
                    <p className="text-green-700">
                      {format(new Date(professional.next_work_start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleUpdateField('next_work_start_date', null)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Limpar Data
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Configuracoes para profissionais tipo 'slots'
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Vagas por Dia
              </CardTitle>
              <CardDescription>
                Configure quantos atendimentos você pode fazer por dia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vagas por Dia</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={professional?.daily_slots || 5}
                    onChange={(e) => handleUpdateField('daily_slots', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Status Atual</Label>
                  <Select
                    value={professional?.availability_status || 'available_today'}
                    onValueChange={(value) => handleUpdateField('availability_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available_today">Disponivel Hoje</SelectItem>
                      <SelectItem value="available_from_date">Disponivel a partir de...</SelectItem>
                      <SelectItem value="unavailable">Indisponível</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {professional?.availability_status === 'available_from_date' && (
                <div>
                  <Label>Data de Retorno</Label>
                  <Input
                    type="date"
                    defaultValue={professional?.available_from_date}
                    onChange={(e) => handleUpdateField('available_from_date', e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendario de Agenda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Gerenciar Agenda
              </CardTitle>
              <CardDescription>
                Bloqueie dias especificos em que não podera atender
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded" />
                  <span>Disponivel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded" />
                  <span>Parcial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded" />
                  <span>Cheio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded" />
                  <span>Bloqueado</span>
                </div>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="rounded-md border"
                modifiers={{
                  available: (date) => getDayStatus(date) === 'available',
                  partial: (date) => getDayStatus(date) === 'partial',
                  full: (date) => getDayStatus(date) === 'full',
                  blocked: (date) => getDayStatus(date) === 'blocked'
                }}
                modifiersStyles={{
                  available: { backgroundColor: '#dcfce7', border: '2px solid #22c55e' },
                  partial: { backgroundColor: '#fef3c7', border: '2px solid #eab308' },
                  full: { backgroundColor: '#fee2e2', border: '2px solid #ef4444' },
                  blocked: { backgroundColor: '#e2e8f0', textDecoration: 'line-through' }
                }}
              />

              {selectedDate && (
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    <Badge>
                      {getDayStatus(selectedDate) === 'blocked' ? 'Bloqueado' :
                       getDayStatus(selectedDate) === 'full' ? 'Cheio' :
                       getDayStatus(selectedDate) === 'partial' ? 'Parcial' : 'Disponivel'}
                    </Badge>
                  </div>

                  {getDayStatus(selectedDate) === 'blocked' ? (
                    <Button
                      onClick={() => handleUnblockDate(selectedDate)}
                      variant="outline"
                      className="w-full"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Desbloquear Data
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleBlockDate(selectedDate)}
                      variant="outline"
                      className="w-full"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Bloquear Data
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Status de salvamento */}
      {updateProfessionalMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Save className="w-4 h-4 animate-pulse" />
          Salvando...
        </div>
      )}
    </div>
  );
}
