import React from 'react';
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Button } from "@/componentes/interface do usuário/button";
import { MapPin, Clock, DollarSign, Eye, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function QuoteCard({ quote, onView, userType = 'client' }) {
  const statusColors = {
    open: 'bg-blue-500',
    quotes_received: 'bg-green-500',
    in_progress: 'bg-yellow-500',
    hired: 'bg-purple-500',
    completed: 'bg-gray-500',
    cancelled: 'bg-red-500'
  };

  const statusLabels = {
    open: 'Aberto',
    quotes_received: 'Orçamentos Recebidos',
    in_progress: 'Em Andamento',
    hired: 'Contratado',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  };

  const urgencyIcons = {
    urgente: '🔴',
    esta_semana: '🟡',
    este_mes: '🟢',
    flexivel: '⚪'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{quote.title}</h3>
            <p className="text-sm text-slate-600 line-clamp-2">{quote.description}</p>
          </div>
          <Badge className={statusColors[quote.status]}>
            {statusLabels[quote.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {quote.city}, {quote.state}
          </Badge>
          
          {quote.urgency && (
            <Badge variant="outline">
              {urgencyIcons[quote.urgency]} {quote.urgency.replace('_', ' ')}
            </Badge>
          )}

          {quote.budget_range && (
            <Badge variant="outline" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {quote.budget_range.replace('_', ' ')}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {quote.views_count || 0} visualizações
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {quote.responses_count || 0} orçamentos
            </span>
          </div>
          <span className="text-xs">
            {format(new Date(quote.created_date), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>

        {userType === 'professional' && (
          <Button 
            className="w-full mt-4 bg-green-500 hover:bg-green-600"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            Enviar Orçamento
          </Button>
        )}
      </CardContent>
    </Card>
  );
}