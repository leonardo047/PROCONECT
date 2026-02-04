import React, { useState } from 'react';
import { Professional, DailyAvailability } from "@/lib/entities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Calendar } from "@/componentes/interface do usuário/calendar";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertCircle, Save } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AvailabilityManager({ professionalId, professional }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingDate, setEditingDate] = useState(null);
  const queryClient = useQueryClient();

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
    enabled: !!professionalId
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
      setEditingDate(null);
    }
  });

  const handleUpdateStatus = async (status) => {
    await updateProfessionalMutation.mutateAsync({
      id: professionalId,
      data: { availability_status: status }
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

  const statusColors = {
    available_today: 'bg-green-500',
    quotes_only: 'bg-blue-500',
    busy: 'bg-orange-500',
    returning_soon: 'bg-purple-500',
    available_from_date: 'bg-blue-500',
    fully_booked: 'bg-red-500',
    unavailable: 'bg-gray-500'
  };

  const statusLabels = {
    available_today: 'Disponivel Hoje',
    quotes_only: 'Somente Orcamento',
    busy: 'Ocupado',
    returning_soon: 'Retorno em Breve',
    available_from_date: 'Disponivel a partir de...',
    fully_booked: 'Agenda Cheia',
    unavailable: 'Indisponivel'
  };

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Status de Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Status Atual</Label>
            <Select
              value={professional?.availability_status || 'available_today'}
              onValueChange={handleUpdateStatus}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available_today">Disponivel Hoje</SelectItem>
                <SelectItem value="quotes_only">Somente Orcamento</SelectItem>
                <SelectItem value="busy">Ocupado</SelectItem>
                <SelectItem value="returning_soon">Retorno em Breve</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(professional?.availability_status === 'returning_soon' || professional?.availability_status === 'available_from_date') && (
            <div>
              <Label>Data de Retorno</Label>
              <Input
                type="date"
                defaultValue={professional?.available_from_date}
                onChange={(e) => updateProfessionalMutation.mutate({
                  id: professionalId,
                  data: { available_from_date: e.target.value }
                })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vagas por Dia</Label>
              <Input
                type="number"
                min="1"
                max="20"
                defaultValue={professional?.daily_slots || 5}
                onChange={(e) => updateProfessionalMutation.mutate({
                  id: professionalId,
                  data: { daily_slots: parseInt(e.target.value) }
                })}
              />
            </div>
            <div>
              <Label>Tempo Médio (minutos)</Label>
              <Input
                type="number"
                min="15"
                max="480"
                step="15"
                defaultValue={professional?.average_service_time || 60}
                onChange={(e) => updateProfessionalMutation.mutate({
                  id: professionalId,
                  data: { average_service_time: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Status Público:</span>
              <Badge className={statusColors[professional?.availability_status]}>
                {statusLabels[professional?.availability_status]}
              </Badge>
            </div>
            {professional?.slots_booked_today > 0 && (
              <div className="text-sm text-slate-600">
                Vagas hoje: {professional?.slots_booked_today}/{professional?.daily_slots}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendário de Agenda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Gerenciar Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded" />
              <span>Disponível</span>
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
                   getDayStatus(selectedDate) === 'partial' ? 'Parcial' : 'Disponível'}
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
    </div>
  );
}
