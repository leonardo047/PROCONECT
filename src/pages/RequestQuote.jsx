import React from 'react';
import CreateQuoteRequest from '@/componentes/citações/CreateQuoteRequest';
import { createPageUrl } from "@/utils";
import { useNavigate } from 'react-router-dom';

export default function RequestQuote() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate(createPageUrl('ClientDashboard') + '?tab=quotes');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Solicitar Orçamento
          </h1>
          <p className="text-slate-600">
            Descreva o serviço que precisa e receba propostas de profissionais qualificados
          </p>
        </div>

        <CreateQuoteRequest onSuccess={handleSuccess} />
      </div>
    </div>
  );
}