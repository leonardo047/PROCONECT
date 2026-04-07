import React, { useState, useMemo } from 'react';
import { JobOpportunity, JobOpportunityService, Category } from "@/lib/entities";
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

const states = [
  { value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapa" }, { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" }, { value: "CE", label: "Ceara" },
  { value: "DF", label: "Distrito Federal" }, { value: "ES", label: "Espirito Santo" },
  { value: "GO", label: "Goias" }, { value: "MA", label: "Maranhao" },
  { value: "MT", label: "Mato Grosso" }, { value: "MS", label: "Mato Grossó do Sul" },
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
    neighborhood: '',
    state: professional?.state || '',
    period: '',
    contact_whatsapp: professional?.whatsapp || ''
  });
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['my-job-opportunities', professionalId],
    queryFn: () => JobOpportunityService.getByProfessional(professionalId),
    enabled: !!professionalId
  });

  // Buscar categorias (profissões) do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['job-manager-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Transformar categorias em opções para o select
  const professions = useMemo(() => {
    if (!categories.length) return [];

    const options = [];

    // Agrupar por category_group
    const groups = {};
    categories.forEach(cat => {
      const group = cat.category_group || 'Outros';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(cat);
    });

    // Ordenar grupos - construção primeiro
    const sortedGroupNamês = Object.keys(groups).sort((a, b) => {
      const homeGroups = ['Construção', 'Elétrica/Hidráulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    // Adicionar cada grupo com header
    sortedGroupNamês.forEach(groupName => {
      // Adicionar header do grupo (disabled)
      const emoji = groupName.match(/^[^\w\s]/)?.[0] || '📁';
      const cleanName = groupName.replace(/^[^\w\s]\s*/, '');
      options.push({
        value: `header_${groupName}`,
        label: `${emoji} ${cleanName.toUpperCase()}`,
        disabled: true
      });

      // Adicionar categorias do grupo
      groups[groupName].forEach(cat => {
        options.push({
          value: cat.slug,
          label: cat.name
        });
      });
    });

    return options;
  }, [categories]);

  // Criar um mapa para buscar label por value (para exibição na lista)
  const professionMap = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.slug] = cat.name;
    });
    return map;
  }, [categories]);

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
      neighborhood: '',
      state: professional?.state || '',
      period: '',
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
        return value ? `R$ ${value}/serviço` : 'Por serviço';
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
              Vagas de Trabalho
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Vaga
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Publicar Vaga de Trabalho</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Titulo da Vaga *</Label>
                    <Input
                      placeholder="Ex: Precisó de ajudante para pintura"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Tipo de Serviço *</Label>
                    <Select
                      value={formData.profession}
                      onValueChange={(value) => setFormData({ ...formData, profession: value })}
                      disabled={loadingCategories}
                    >
                      <SelectTrigger>
                        {loadingCategories ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando...
                          </div>
                        ) : (
                          <SelectValue placeholder="Selecione o tipo de serviço" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {professions.map(p => (
                          <SelectItem
                            key={p.value}
                            value={p.value}
                            disabled={p.disabled}
                            className={p.disabled ? 'font-bold text-slate-500 bg-slate-100' : ''}
                          >
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      placeholder="Descreva o trabalho, requisitos, horários, valor..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cidade *</Label>
                      <Input
                        placeholder="Ex: Sao Paulo"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input
                        placeholder="Ex: Centro"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Estado *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({ ...formData, state: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data ou Periodo</Label>
                    <Input
                      placeholder="Ex: Amanha, Está semana, 15/02 a 20/02"
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Telefone para Contato *</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.contact_whatsapp}
                      onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                      required
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">
                      Está funcionalidade e 100% GRATUITA!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Publique vagas para encontrar ajudantes, funcionarios ou parceiros.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    disabled={createMutation.isPending || !formData.title || !formData.profession || !formData.contact_whatsapp}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Publicar Vaga
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 font-medium">
              Precisa de ajudante, funcionario ou parceiro?
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Publique aqui sua vaga e encontre profissionais disponíveis para serviços e obras!
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              <span>{activeCount} vaga{activeCount !== 1 ? 's' : ''} ativa{activeCount !== 1 ? 's' : ''}</span>
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
            <p className="text-slate-600 mb-2">Nenhuma vaga publicada</p>
            <p className="text-sm text-slate-500">
              Publique uma vaga para encontrar ajudantes, funcionarios ou parceiros.
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
                        <span>{professionMap[opp.profession] || opp.profession}</span>
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
                          if (confirm('Tem certeza que deseja excluir está oportunidade?')) {
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
