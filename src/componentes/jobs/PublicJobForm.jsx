import React, { useState, useMemo } from 'react';
import { JobOpportunityService, Category } from "@/lib/entities";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

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

export default function PublicJobForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    advertiser_name: '',
    contact_whatsapp: '',
    advertiser_email: '',
    title: '',
    profession: '',
    description: '',
    city: '',
    neighborhood: '',
    state: '',
    period: ''
  });

  // Honeypot anti-bot
  const [honeypot, setHoneypot] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Buscar categorias (profissoes) do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['public-job-categories'],
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
      const homeGroups = ['Construcao', 'Eletrica/Hidraulica', 'Limpeza/Jardim', 'Madeira/Metal', 'Projetos'];
      const aIsHome = homeGroups.some(g => a.includes(g));
      const bIsHome = homeGroups.some(g => b.includes(g));
      if (aIsHome && !bIsHome) return -1;
      if (!aIsHome && bIsHome) return 1;
      return a.localeCompare(b);
    });

    // Adicionar cada grupo com header
    sortedGroupNamês.forEach(groupName => {
      const emoji = groupName.match(/^[^\w\s]/)?.[0] || '';
      const cleanName = groupName.replace(/^[^\w\s]\s*/, '');
      options.push({
        value: `header_${groupName}`,
        label: `${emoji} ${cleanName.toUpperCase()}`,
        disabled: true
      });

      groups[groupName].forEach(cat => {
        options.push({
          value: cat.slug,
          label: cat.name
        });
      });
    });

    return options;
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: (data) => JobOpportunityService.createAnonymous(data),
    onSuccess: () => {
      setSubmitSuccess(true);
      setSubmitError(null);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    },
    onError: (error) => {
      setSubmitError(error.message || 'Erro ao publicar vaga. Tente novamente.');
    }
  });

  // Validar WhatsApp (10-11 digitos)
  const validateWhatsApp = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Verificar honeypot (se preenchido, e bot)
    if (honeypot) {
      console.log('Bot detected');
      return;
    }

    // Validar WhatsApp
    if (!validateWhatsApp(formData.contact_whatsapp)) {
      setSubmitError('Numero de WhatsApp inválido. Use formato (XX) XXXXX-XXXX');
      return;
    }

    // Limpar erro anterior
    setSubmitError(null);

    // Criar vaga anonima
    createMutation.mutate({
      advertiser_name: formData.advertiser_name.trim(),
      contact_whatsapp: formData.contact_whatsapp.replace(/\D/g, ''),
      advertiser_email: formData.advertiser_email.trim() || null,
      title: formData.title.trim(),
      profession: formData.profession,
      description: formData.description.trim() || null,
      city: formData.city.trim(),
      neighborhood: formData.neighborhood.trim() || null,
      state: formData.state,
      period: formData.period.trim() || null
    });
  };

  const isFormValid = formData.advertiser_name &&
                      formData.contact_whatsapp &&
                      formData.title &&
                      formData.profession &&
                      formData.city &&
                      formData.state;

  if (submitSuccess) {
    return (
      <div className="py-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-700 mb-2">Vaga Publicada!</h3>
        <p className="text-slate-600">
          Sua vaga foi publicada com sucessó e já está visível para profissionais.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm text-green-800 font-medium">
          Publique sua vaga gratuitamente!
        </p>
        <p className="text-xs text-green-700 mt-1">
          Não e necessário ter conta. Sua vaga aparecera imediatamente para profissionais.
        </p>
      </div>

      {/* Dados do Anunciante */}
      <div className="space-y-3 pt-2">
        <h4 className="font-medium text-slate-700 text-sm border-b pb-1">Seus Dados</h4>

        <div>
          <Label>Seu Nome *</Label>
          <Input
            placeholder="Ex: Joao Silva"
            value={formData.advertiser_name}
            onChange={(e) => setFormData({ ...formData, advertiser_name: e.target.value })}
            required
            maxLength={100}
          />
        </div>

        <div>
          <Label>WhatsApp para Contato *</Label>
          <Input
            placeholder="(11) 99999-9999"
            value={formData.contact_whatsapp}
            onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
            required
            maxLength={20}
          />
          <p className="text-xs text-slate-500 mt-1">Profissionais entrarao em contato por aqui</p>
        </div>

        <div>
          <Label>Email (opcional)</Label>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={formData.advertiser_email}
            onChange={(e) => setFormData({ ...formData, advertiser_email: e.target.value })}
            maxLength={100}
          />
        </div>
      </div>

      {/* Dados da Vaga */}
      <div className="space-y-3 pt-2">
        <h4 className="font-medium text-slate-700 text-sm border-b pb-1">Dados da Vaga</h4>

        <div>
          <Label>Titulo da Vaga *</Label>
          <Input
            placeholder="Ex: Precisó de ajudante para pintura"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            maxLength={150}
          />
        </div>

        <div>
          <Label>Tipo de Profissional *</Label>
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
                <SelectValue placeholder="Selecione o tipo de profissional" />
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
            placeholder="Descreva o trabalho, requisitos, horários, valor oferecido..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            maxLength={1000}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cidade *</Label>
            <Input
              placeholder="Ex: Sao Paulo"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              maxLength={100}
            />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input
              placeholder="Ex: Centro"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              maxLength={100}
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
            maxLength={100}
          />
        </div>
      </div>

      {/* Honeypot field (hidden) */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
      />

      {/* Error message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 bg-blue-500 hover:bg-blue-600"
          disabled={createMutation.isPending || !isFormValid}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Publicando...
            </>
          ) : (
            'Publicar Vaga'
          )}
        </Button>
      </div>
    </form>
  );
}
