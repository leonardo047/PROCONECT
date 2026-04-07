import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { DailyAvailability } from "@/lib/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Calendar } from "@/componentes/interface do usuário/calendar";
import { Calendar as CalendarIcon, CheckCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Profissoes que usam sistema de vagas diarias (slots)
const SLOT_BASED_PROFESSIONS = ['marido_aluguel', 'chaveiro', 'montador_móveis'];

export default function PublicAvailabilityView({ professionalId, professional }) {
  const [selectedDate, setSelectedDate] = React.useState(null);

  // Determinar tipo de disponibilidade
  const availabilityType = professional?.availability_type ||
    (SLOT_BASED_PROFESSIONS.includes(professional?.profession) ? 'slots' : 'project');

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

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = dailyAvailability.find(d => d.date === dateStr);

    if (!dayData) {
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

  // Calcular vagas disponíveis hoje
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayData = dailyAvailability.find(d => d.date === todayStr);
  const slotsToday = todayData
    ? todayData.total_slots - todayData.booked_slots
    : (professional?.daily_slots || 5);

  const acceptsQuotes = professional?.accepts_quotes !== false;

  // Renderizar visualizacao para profissionais tipo 'project' (pintor, pedreiro, etc)
  if (availabilityType === 'project') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-500" />
            Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status de disponibilidade para orçamentos */}
          {acceptsQuotes && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Disponivel para orçamentos</p>
                  <p className="text-sm text-green-600">Solicite um orçamento sem compromisso</p>
                </div>
              </div>
            </div>
          )}

          {/* Data de início do próximo trabalho */}
          {professional?.next_work_start_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-blue-800">Proximo trabalho inicia em</p>
                  <p className="text-lg text-blue-700">
                    {format(new Date(professional.next_work_start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem alternativa se não tem data de início */}
          {!professional?.next_work_start_date && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-400 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">Entre em contato para agendar</p>
                  <p className="text-sm text-slate-500">O profissional ira informar a data de início</p>
                </div>
              </div>
            </div>
          )}

          {!acceptsQuotes && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              <p className="text-orange-700">Este profissional não está aceitando novos orçamentos no momento.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Renderizar visualizacao para profissionais tipo 'slots' (marido de aluguel, chaveiro, etc)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-500" />
            Disponibilidade
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vagas disponíveis hoje */}
        <div className={`rounded-lg p-4 ${
          slotsToday > 0
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white ${
              slotsToday > 0 ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {slotsToday}
            </div>
            <div>
              <p className={`font-semibold ${slotsToday > 0 ? 'text-green-800' : 'text-red-800'}`}>
                {slotsToday > 0
                  ? `${slotsToday} vaga${slotsToday > 1 ? 's' : ''} disponível${slotsToday > 1 ? 'eis' : ''} hoje`
                  : 'Sem vagas disponíveis hoje'
                }
              </p>
              <p className={`text-sm ${slotsToday > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {slotsToday > 0
                  ? 'Solicite seu atendimento'
                  : 'Verifique outras datas no calendario'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Legenda do calendario */}
        <div className="space-y-3">
          <div className="flex gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border-2 border-green-500 rounded" />
              <span>Disponivel</span>
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

          {/* Calendario */}
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

          {/* Data selecionada */}
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
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 text-center">
          Selecione uma data no calendario para ver a disponibilidade
        </div>
      </CardContent>
    </Card>
  );
}
