import React from 'react';
import { Badge } from "@/componentes/interface do usuário/badge";
import { CheckCircle, Calendar, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Profissoes que usam sistema de vagas diarias (slots)
const SLOT_BASED_PROFESSIONS = ['marido_aluguel', 'chaveiro', 'montador_móveis'];

export default function AvailabilityStatusBadge({ professional, showDetails = false }) {
  const availabilityType = professional?.availability_type ||
    (SLOT_BASED_PROFESSIONS.includes(professional?.profession) ? 'slots' : 'project');

  const getStatusConfig = () => {
    const status = professional?.availability_status || 'available_today';
    const acceptsQuotes = professional?.accepts_quotes !== false;

    // Para profissionais tipo 'project' (pintores, pedreiros, etc)
    if (availabilityType === 'project') {
      if (!acceptsQuotes || status === 'unavailable') {
        return {
          icon: XCircle,
          label: 'Indisponível',
          className: 'bg-gray-500 text-white',
          color: 'gray'
        };
      }

      if (professional?.next_work_start_date) {
        const nextDate = new Date(professional.next_work_start_date);
        const formattedDate = format(nextDate, "dd/MM", { locale: ptBR });
        return {
          icon: Calendar,
          label: showDetails ? `Inicia em ${formattedDate}` : 'Disponivel',
          className: 'bg-blue-500 text-white',
          color: 'blue'
        };
      }

      return {
        icon: CheckCircle,
        label: 'Disponivel para orçamentos',
        className: 'bg-green-500 text-white',
        color: 'green'
      };
    }

    // Para profissionais tipo 'slots' (marido de aluguel, chaveiro, etc)
    const slotsLeft = (professional?.daily_slots || 5) - (professional?.slots_booked_today || 0);

    switch (status) {
      case 'available_today':
        if (slotsLeft === 0) {
          return {
            icon: XCircle,
            label: 'Cheio hoje',
            className: 'bg-red-500 text-white',
            color: 'red'
          };
        }
        if (slotsLeft <= 2) {
          return {
            icon: CheckCircle,
            label: showDetails ? `${slotsLeft} vaga${slotsLeft > 1 ? 's' : ''}` : 'Poucas vagas',
            className: 'bg-yellow-500 text-white',
            color: 'yellow'
          };
        }
        return {
          icon: CheckCircle,
          label: showDetails ? `${slotsLeft} vagas` : 'Disponivel hoje',
          className: 'bg-green-500 text-white',
          color: 'green'
        };

      case 'available_from_date':
        if (professional?.available_from_date) {
          const fromDate = new Date(professional.available_from_date);
          const formattedDate = format(fromDate, "dd/MM", { locale: ptBR });
          return {
            icon: Calendar,
            label: showDetails ? `A partir de ${formattedDate}` : 'Em breve',
            className: 'bg-blue-500 text-white',
            color: 'blue'
          };
        }
        return {
          icon: Calendar,
          label: 'Em breve',
          className: 'bg-blue-500 text-white',
          color: 'blue'
        };

      case 'unavailable':
        return {
          icon: XCircle,
          label: 'Indisponível',
          className: 'bg-gray-500 text-white',
          color: 'gray'
        };

      default:
        return {
          icon: CheckCircle,
          label: 'Disponivel',
          className: 'bg-green-500 text-white',
          color: 'green'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} flex items-center gap-1 px-2 py-1`}>
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}
