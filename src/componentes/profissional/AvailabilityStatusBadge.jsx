import React from 'react';
import { Badge } from "@/componentes/interface do usuário/badge";
import { Clock, CheckCircle, AlertCircle, XCircle, Calendar, FileText, Briefcase } from "lucide-react";

export default function AvailabilityStatusBadge({ professional, showDetails = false }) {
  const getStatusConfig = () => {
    const status = professional?.availability_status || 'available_today';
    const slotsLeft = (professional?.daily_slots || 5) - (professional?.slots_booked_today || 0);

    switch (status) {
      case 'available_today':
        if (slotsLeft === 0) {
          return {
            icon: AlertCircle,
            label: showDetails ? `Cheio Hoje (${professional?.daily_slots}/${professional?.daily_slots})` : 'Cheio Hoje',
            className: 'bg-red-500 text-white',
            color: 'red'
          };
        }
        if (slotsLeft <= 2) {
          return {
            icon: Clock,
            label: showDetails ? `${slotsLeft} vagas hoje` : 'Poucas Vagas',
            className: 'bg-yellow-500 text-white',
            color: 'yellow'
          };
        }
        return {
          icon: CheckCircle,
          label: showDetails ? `${slotsLeft} vagas hoje` : 'Disponivel Hoje',
          className: 'bg-green-500 text-white',
          color: 'green'
        };

      case 'quotes_only':
        return {
          icon: FileText,
          label: 'Somente Orcamento',
          className: 'bg-blue-500 text-white',
          color: 'blue'
        };

      case 'busy':
        return {
          icon: Briefcase,
          label: 'Ocupado',
          className: 'bg-orange-500 text-white',
          color: 'orange'
        };

      case 'returning_soon':
        return {
          icon: Calendar,
          label: showDetails && professional?.available_from_date
            ? `Retorno: ${new Date(professional.available_from_date).toLocaleDateString('pt-BR')}`
            : 'Retorno em Breve',
          className: 'bg-purple-500 text-white',
          color: 'purple'
        };

      case 'available_from_date':
        return {
          icon: Calendar,
          label: showDetails && professional?.available_from_date
            ? `Disponivel a partir de ${new Date(professional.available_from_date).toLocaleDateString('pt-BR')}`
            : 'Disponivel em Breve',
          className: 'bg-blue-500 text-white',
          color: 'blue'
        };

      case 'fully_booked':
        return {
          icon: AlertCircle,
          label: professional?.next_available_date
            ? `Proxima vaga: ${new Date(professional.next_available_date).toLocaleDateString('pt-BR')}`
            : 'Agenda Cheia',
          className: 'bg-orange-500 text-white',
          color: 'orange'
        };

      case 'unavailable':
        return {
          icon: XCircle,
          label: 'Indisponivel',
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