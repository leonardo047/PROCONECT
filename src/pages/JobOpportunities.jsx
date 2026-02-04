import React, { useState } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { JobOpportunityService } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Badge } from "@/componentes/interface do usuário/badge";
import {
  Briefcase, MapPin, Clock, DollarSign, Search, MessageCircle,
  Filter, Users, Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const professions = [
  { value: "", label: "Todas" },
  { value: "pintor", label: "Pintor" },
  { value: "pedreiro", label: "Pedreiro" },
  { value: "eletricista", label: "Eletricista" },
  { value: "encanador", label: "Encanador" },
  { value: "ajudante_geral", label: "Ajudante Geral" },
  { value: "servente", label: "Servente" },
  { value: "carpinteiro", label: "Carpinteiro" },
  { value: "marceneiro", label: "Marceneiro" },
  { value: "gesseiro", label: "Gesseiro" },
  { value: "azulejista", label: "Azulejista" },
  { value: "serralheiro", label: "Serralheiro" },
  { value: "soldador", label: "Soldador" },
  { value: "outros", label: "Outros" }
];

const states = [
  { value: "", label: "Todos" },
  { value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapa" }, { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" }, { value: "CE", label: "Ceara" },
  { value: "DF", label: "Distrito Federal" }, { value: "ES", label: "Espirito Santo" },
  { value: "GO", label: "Goias" }, { value: "MA", label: "Maranhao" },
  { value: "MT", label: "Mato Grosso" }, { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" }, { value: "PA", label: "Para" },
  { value: "PB", label: "Paraiba" }, { value: "PR", label: "Parana" },
  { value: "PE", label: "Pernambuco" }, { value: "PI", label: "Piaui" },
  { value: "RJ", label: "Rio de Janeiro" }, { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" }, { value: "RO", label: "Rondonia" },
  { value: "RR", label: "Roraima" }, { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "Sao Paulo" }, { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];

export default function JobOpportunities() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    profession: ''
  });

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['job-opportunities', filters],
    queryFn: () => JobOpportunityService.getActive(filters)
  });

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return <Badge className="bg-red-500">Urgente</Badge>;
      case 'today':
        return <Badge className="bg-orange-500">Para Hoje</Badge>;
      case 'this_week':
        return <Badge className="bg-yellow-500">Esta Semana</Badge>;
      default:
        return null;
    }
  };

  const getPaymentLabel = (type, value) => {
    switch (type) {
      case 'daily':
        return value ? `R$ ${value}/dia` : 'Diaria a combinar';
      case 'per_job':
        return value ? `R$ ${value}/servico` : 'Por servico';
      case 'hourly':
        return value ? `R$ ${value}/hora` : 'Por hora';
      default:
        return 'A combinar';
    }
  };

  const handleWhatsAppContact = (opp) => {
    const phone = opp.contact_whatsapp?.replace(/\D/g, '');
    const message = `Ola! Vi sua oportunidade "${opp.title}" no ProObra e tenho interesse.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Oportunidades de Trabalho</h1>
              <p className="text-slate-600">Encontre vagas publicadas por outros profissionais</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Briefcase className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Conexao entre Profissionais - 100% Gratuito!</p>
                <p className="text-sm text-blue-800 mt-1">
                  Aqui profissionais publicam vagas de ajudante, parceiros para obras ou trabalhos avulsos.
                  Nao cobramos nada por isso - e apenas para facilitar a conexao entre voces!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-700">Filtros</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select
                  value={filters.profession}
                  onValueChange={(value) => setFilters({ ...filters, profession: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professions.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={filters.state}
                  onValueChange={(value) => setFilters({ ...filters, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  placeholder="Cidade"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : opportunities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Nenhuma oportunidade encontrada</p>
              <p className="text-sm text-slate-500">
                Tente mudar os filtros ou volte mais tarde.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getUrgencyBadge(opp.urgency)}
                      </div>

                      <h3 className="font-semibold text-lg text-slate-900">{opp.title}</h3>

                      {opp.professionals && (
                        <p className="text-sm text-slate-500 mt-1">
                          Publicado por: {opp.professionals.name}
                        </p>
                      )}

                      {opp.description && (
                        <p className="text-slate-600 mt-2">{opp.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4 text-blue-500" />
                          <span>{professions.find(p => p.value === opp.profession)?.label || opp.profession}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{opp.city}, {opp.state}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span>{getPaymentLabel(opp.payment_type, opp.payment_value)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{formatDistanceToNow(new Date(opp.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>

                    {opp.contact_whatsapp && (
                      <Button
                        className="bg-green-500 hover:bg-green-600 flex-shrink-0"
                        onClick={() => handleWhatsAppContact(opp)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contato
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
