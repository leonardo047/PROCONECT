import React from 'react';
import CreateQuoteRequest from '@/componentes/citações/CreateQuoteRequest';
import { createPageUrl } from "@/utils";
import { useNavigate } from 'react-router-dom';

export default function RequestQuote() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate(createPageUrl('ClientAppointments'));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12">
      <div className="max-w-2xl mx-auto px-4">
        <CreateQuoteRequest onSuccess={handleSuccess} />
      </div>
    </div>
  );
}