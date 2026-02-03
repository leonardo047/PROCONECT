import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { DailyAvailability } from "@/lib/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Calendar } from "@/componentes/interface do usuário/calendar";
import { Calendar as CalendarIcon, Clock, CheckCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PublicAvailabilityView({ professionalId, professional }) {
  const [selectedDate, setSelectedDate] = React.useState(null);

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

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = dailyAvailability.find(d => d.date === dateStr);

    if (!dayData) {
      // Check if professional is available today
      if (professional?.availability_status === 'unavailable') return 'blocked';
      return 'available';
    }

    if (!dayData.is_available) return 'blocked';
    if (dayData.booked_slots >= dayData.total_slots) return 'full';
    if (dayData.booked_slots > 0) return 'partial';
    return 'available';
  };

  const getAvailableSlots = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = dailyAvailability.find(d => d.date === dateStr);

    if (!dayData) return professional?.daily_slots || 5;
    return dayData.total_slots - dayData.booked_slots;
  };

  const statusColors = {
    available_today: 'bg-green-500 text-white',
    available_from_date: 'bg-blue-500 text-white',
    fully_booked: 'bg-red-500 text-white',
    unavailable: 'bg-gray-500 text-white'
  };

  const statusLabels = {
    available_today: 'Disponível Hoje',
    available_from_date: 'Disponível em Breve',
    fully_booked: 'Agenda Cheia',
    unavailable: 'Indisponível'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Disponibilidade
          </CardTitle>
          <Badge className={statusColors[professional?.availability_status]}>
            {statusLabels[professional?.availability_status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 font-medium mb-1">Vagas por Dia</div>
            <div className="text-2xl font-bold text-green-700">
              {professional?.daily_slots || 5}
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 font-medium mb-1">Tempo Médio</div>
            <div className="text-2xl font-bold text-blue-700">
              {professional?.average_service_time || 60}min
            </div>
          </div>
        </div>

        {professional?.availability_status === 'available_from_date' && professional?.available_from_date && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <CalendarIcon className="w-4 h-4" />
              <span>
                Disponível a partir de{' '}
                <strong>{format(new Date(professional.available_from_date), "dd/MM/yyyy", { locale: ptBR })}</strong>
              </span>
            </div>
          </div>
        )}

        {professional?.next_available_date && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>
                Próxima data disponível:{' '}
                <strong>{format(new Date(professional.next_available_date), "dd/MM/yyyy", { locale: ptBR })}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="space-y-3">
          <div className="flex gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border-2 border-green-500 rounded" />
              <span>Disponível</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 border-2 border-yellow-500 rounded" />
              <span>Poucas Vagas</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border-2 border-red-500 rounded" />
              <span>Cheio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded" />
              <span>Bloqueado</span>
            </div>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            className="rounded-md border"
            disabled={(date) => date < new Date() || getDayStatus(date) === 'blocked'}
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
              blocked: { backgroundColor: '#e2e8f0', opacity: 0.5 }
            }}
          />

          {selectedDate && getDayStatus(selectedDate) !== 'blocked' && (
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </span>
                <Badge className={
                  getDayStatus(selectedDate) === 'full' ? 'bg-red-500' :
                  getDayStatus(selectedDate) === 'partial' ? 'bg-yellow-500' : 'bg-green-500'
                }>
                  {getAvailableSlots(selectedDate)} vagas disponíveis
                </Badge>
              </div>
              <div className="text-sm text-slate-600">
                <Clock className="w-4 h-4 inline mr-1" />
                Tempo estimado: {professional?.average_service_time || 60} minutos
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 text-center">
          Selecione uma data no calendário para ver a disponibilidade
        </div>
      </CardContent>
    </Card>
  );
}
