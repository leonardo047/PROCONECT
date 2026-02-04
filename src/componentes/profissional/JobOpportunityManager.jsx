import React, { useState } from 'react';
import { JobOpportunity, JobOpportunityService } from "@/lib/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/interface do usuário/dialog";
import {
  Briefcase, Plus, MapPin, Clock, DollarSign, Eye, MessageCircle,
  CheckCircle, XCircle, Loader2, Trash2, Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const professions = [
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

export default function JobOpportunityManager({ professionalId, professional }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    profession: '',
    city: professional?.city || '',
    state: professional?.state || '',
    urgency: 'normal',
    payment_type: 'to_negotiate',
    payment_value: '',
    contact_whatsapp: professional?.whatsapp || ''
  });
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['my-job-opportunities', professionalId],
    queryFn: () => JobOpportunityService.getByProfessional(professionalId),
    enabled: !!professionalId
  });

  const createMutation = useMutation({
    mutationFn: (data) => JobOpportunity.create({
      ...data,
      professional_id: professionalId,
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-job-opportunities']);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => JobOpportunity.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-job-opportunities']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => JobOpportunity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-job-opportunities']);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      profession: '',
      city: professional?.city || '',
      state: professional?.state || '',
      urgency: 'normal',
      payment_type: 'to_negotiate',
      payment_value: '',
      contact_whatsapp: professional?.whatsapp || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return <Badge className="bg-red-500">Urgente</Badge>;
      case 'today':
        return <Badge className="bg-orange-500">Para Hoje</Badge>;
      case 'this_week':
        return <Badge className="bg-yellow-500">Esta Semana</Badge>;
      default:
        return <Badge className="bg-slate-500">Normal</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'filled':
        return <Badge className="bg-blue-500">Preenchida</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500">Expirada</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelada</Badge>;
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

  const activeCount = opportunities.filter(o => o.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Oportunidades de Trabalho
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Oportunidade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Publicar Oportunidade</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Titulo da Vaga *</Label>
                    <Input
                      placeholder="Ex: Preciso de ajudante para pintura"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Descricao</Label>
                    <Textarea
                      placeholder="Descreva o trabalho, requisitos, horarios..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Tipo de Profissional *</Label>
                    <Select
                      value={formData.profession}
                      onValueChange={(value) => setFormData({ ...formData, profession: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {professions.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Estado *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Cidade *</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Urgencia</Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgente</SelectItem>
                        <SelectItem value="today">Para Hoje</SelectItem>
                        <SelectItem value="this_week">Esta Semana</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de Pagamento</Label>
                      <Select
                        value={formData.payment_type}
                        onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diaria</SelectItem>
                          <SelectItem value="per_job">Por Servico</SelectItem>
                          <SelectItem value="hourly">Por Hora</SelectItem>
                          <SelectItem value="to_negotiate">A Combinar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.payment_type !== 'to_negotiate' && (
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={formData.payment_value}
                          onChange={(e) => setFormData({ ...formData, payment_value: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>WhatsApp para Contato</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.contact_whatsapp}
                      onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">
                      Esta funcionalidade e 100% GRATUITA!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Publique vagas para ajudar outros profissionais a encontrar trabalho.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    disabled={createMutation.isPending || !formData.title || !formData.profession}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Publicar Oportunidade
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 font-medium">
              Precisa de ajudante ou parceiro para um trabalho?
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Publique aqui gratuitamente e encontre outros profissionais disponiveis!
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              <span>{activeCount} oportunidade{activeCount !== 1 ? 's' : ''} ativa{activeCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : opportunities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Nenhuma oportunidade publicada</p>
            <p className="text-sm text-slate-500">
              Publique uma vaga para encontrar ajudantes ou parceiros de trabalho.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <Card key={opp.id} className={opp.status !== 'active' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(opp.status)}
                      {getUrgencyBadge(opp.urgency)}
                    </div>

                    <h3 className="font-semibold text-lg text-slate-900">{opp.title}</h3>

                    {opp.description && (
                      <p className="text-sm text-slate-600 mt-1">{opp.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{professions.find(p => p.value === opp.profession)?.label || opp.profession}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{opp.city}, {opp.state}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{getPaymentLabel(opp.payment_type, opp.payment_value)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDistanceToNow(new Date(opp.created_at), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {opp.views_count || 0} visualizacoes
                      </span>
                    </div>
                  </div>

                  {opp.status === 'active' && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => updateStatusMutation.mutate({ id: opp.id, status: 'filled' })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Preenchi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir esta oportunidade?')) {
                            deleteMutation.mutate(opp.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
