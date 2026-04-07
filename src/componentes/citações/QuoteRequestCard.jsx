import React from 'react';
import { Badge } from "@/componentes/interface do usuário/badge";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { MapPin, Clock, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function QuoteRequestCard({ quoteRequest, onClick }) {
  const urgencyColors = {
    low: 'bg-slate-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  };

  const urgencyLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente'
  };

  const statusColors = {
    open: 'bg-green-500',
    in_progress: 'bg-blue-500',
    closed: 'bg-gray-500',
    cancelled: 'bg-red-500'
  };

  const statusLabels = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    closed: 'Fechado',
    cancelled: 'Cancelado'
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              {quoteRequest.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={statusColors[quoteRequest.status]}>
                {statusLabels[quoteRequest.status]}
              </Badge>
              <Badge className={urgencyColors[quoteRequest.urgency]}>
                {urgencyLabels[quoteRequest.urgency]}
              </Badge>
              {quoteRequest.responses_count > 0 && (
                <Badge variant="outline">
                  {quoteRequest.responses_count} {quoteRequest.responses_count === 1 ? 'resposta' : 'respostas'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {quoteRequest.description}
        </p>

        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{quoteRequest.city}, {quoteRequest.state}</span>
          </div>

          {quoteRequest.budget_range && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>{quoteRequest.budget_range.replace(/_/g, ' ')}</span>
            </div>
          )}

          {quoteRequest.preferred_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Preferência: {format(new Date(quoteRequest.preferred_date), "dd/MM/yyyy")}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4" />
            <span>
              {formatDistanceToNow(new Date(quoteRequest.created_date), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        </div>

        {quoteRequest.photos && quoteRequest.photos.length > 0 && (
          <div className="flex gap-2 mt-4">
            {quoteRequest.photos.slice(0, 3).map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt=""
                className="w-16 h-16 object-cover rounded-lg"
              />
            ))}
            {quoteRequest.photos.length > 3 && (
              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 text-sm font-medium">
                +{quoteRequest.photos.length - 3}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}