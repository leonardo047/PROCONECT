import React from 'react';
import { Badge } from "@/componentes/interface do usuário/badge";
import { CheckCircle, Sparkles, Zap, FileText } from "lucide-react";

export default function ProfessionalBadges({ professional }) {
  if (!professional) return null;

  const isPremium = professional.plan_active && professional.plan_type !== 'free';
  const isVerified = professional.is_approved;
  const respondsQuickly = professional.average_response_time_minutes && professional.average_response_time_minutes < 30;
  const totalQuotesResponded = professional.total_quotes_responded || 0;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Badge Verificado */}
      {isVerified && (
        <Badge className="bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Verificado
        </Badge>
      )}

      {/* Badge Premium */}
      {isPremium && (
        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Premium
        </Badge>
      )}

      {/* Badge Responde Rapido */}
      {respondsQuickly && (
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Responde Rapido
        </Badge>
      )}

      {/* Contador de Orçamentos */}
      {totalQuotesResponded > 0 && (
        <Badge className="bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          +{totalQuotesResponded} orçamentos
        </Badge>
      )}
    </div>
  );
}
