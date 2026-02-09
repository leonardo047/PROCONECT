import React, { useState, useMemo } from 'react';
import { Link } from "react-router-dom";
import { QuoteRequest, Professional, Notification, Category } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { uploadFile } from "@/lib/storage";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Upload, X, Loader2, CheckCircle, Send, Search, AlertCircle } from "lucide-react";
import { addDays } from "date-fns";
import { showToast } from "@/utils/showToast";

export default function CreateQuoteRequest({ onSuccess }) {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    city: '',
    neighborhood: '',
    state: '',
    urgency: 'this_week',
    accepts_visit: true,
    phone: user?.phone || '',
    accept_contact: false,
    auto_match: true
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  // Buscar categorias (profissões) do banco
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['quote-request-categories'],
    queryFn: () => Category.filter({
      filters: { is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Transformar categorias em opções para o select com headers de grupo
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

  const createQuoteMutation = useMutation({
    mutationFn: async (data) => {
      const quote = await QuoteRequest.create(data);

      // Se auto_match está ativo, buscar profissionais
      if (data.auto_match) {
        try {
          await matchProfessionals(quote);
        } catch (e) {
          // Ignorar erro de match, o importante é que o orçamento foi criado
          console.warn('Erro ao fazer match:', e);
        }
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quote-requests']);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Erro ao criar orçamento:', error);
      showToast.error('Erro ao publicar', error.message || 'Não foi possível publicar sua solicitação. Tente novamente.');
    }
  });

  const matchProfessionals = async (quote) => {
    // Buscar até 3 profissionais mais relevantes
    const professionals = await Professional.filter(
      {
        profession: quote.category,
        city: quote.city,
        is_approved: true,
        plan_active: true,
        availability_status: { $in: ['available_today', 'available_from_date'] }
      },
      '-ranking_score',
      3
    );

    // Criar notificações para os profissionais
    for (const prof of professionals) {
      await Notification.create({
        user_id: prof.user_id,
        type: 'quote_request',
        title: 'Novo Pedido de Orçamento',
        message: `${quote.title} - ${quote.city}, ${quote.state}`,
        link: `/professional-dashboard?tab=quotes`,
        priority: quote.urgency === 'urgent' ? 'high' : 'medium'
      });
    }

    // Atualizar quote com profissionais matched
    await QuoteRequest.update(quote.id, {
      matched_professionals: professionals.map(p => p.id)
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadPromises = files.map(file => uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setPhotos([...photos, ...urls]);
    } catch (error) {
      // Ignorar erro de upload
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      navigateToLogin();
      return;
    }

    // Mapear urgência para formato legível
    const urgencyMap = {
      'today': 'urgent',
      'this_week': 'high',
      'next_week': 'medium',
      'no_rush': 'low'
    };

    const quoteData = {
      category: formData.category,
      profession: formData.category, // Compatibilidade com campo profession
      title: formData.title || `${formData.category} - ${formData.city}`,
      description: formData.description,
      city: formData.city,
      state: formData.state,
      address: formData.neighborhood || '',
      urgency: urgencyMap[formData.urgency] || 'medium',
      accepts_visit: formData.accepts_visit,
      client_id: user.id,
      client_name: user.full_name || 'Cliente',
      client_phone: formData.phone || user.phone || '',
      photos: photos || [],
      expires_at: addDays(new Date(), 7).toISOString(),
      status: 'open',
      auto_match: formData.auto_match
    };

    await createQuoteMutation.mutateAsync(quoteData);
  };

  const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  const urgencyOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'this_week', label: 'Essa semana' },
    { value: 'next_week', label: 'Próxima semana' },
    { value: 'no_rush', label: 'Sem urgência' }
  ];

  if (createQuoteMutation.isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-green-900 mb-3">
            Solicitação publicada com sucesso!
          </h3>
          <p className="text-green-700 mb-6 text-lg">
            Em breve profissionais poderão entrar em contato.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={createPageUrl("SearchProfessionals")}>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <Search className="w-4 h-4 mr-2" />
                Ver Profissionais Agora
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Criar Nova Solicitação
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl">Solicitar Orçamento</CardTitle>
        <p className="text-slate-600">
          Descreva rapidamente o serviço que você precisa e profissionais da sua região poderão entrar em contato.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo de Serviço */}
          <div>
            <Label className="text-base font-medium">Tipo de serviço *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              disabled={loadingCategories}
              required
            >
              <SelectTrigger className="mt-1.5">
                {loadingCategories ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <SelectValue placeholder="Selecione o tipo de serviço..." />
                )}
              </SelectTrigger>
              <SelectContent>
                {professions.map(prof => (
                  <SelectItem
                    key={prof.value}
                    value={prof.value}
                    disabled={prof.disabled}
                    className={prof.disabled ? 'font-bold text-slate-500 bg-slate-100' : ''}
                  >
                    {prof.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título do Serviço */}
          <div>
            <Label className="text-base font-medium">Título do serviço *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Reforma de cozinha, Pintura de sala, etc."
              className="mt-1.5"
              required
            />
          </div>

          {/* Descrição do Serviço */}
          <div>
            <Label className="text-base font-medium">Descrição do serviço *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Precisó pintar uma casa de 2 quartos, paredes internas."
              rows={4}
              className="mt-1.5"
              required
            />
          </div>

          {/* Localização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-base font-medium">Cidade *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Nome da cidade"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label className="text-base font-medium">Estado *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
                required
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {states.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Bairro</Label>
            <Input
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Nome do bairro (opcional)"
              className="mt-1.5"
            />
          </div>

          {/* Urgência */}
          <div>
            <Label className="text-base font-medium">Pra quando precisa do serviço? *</Label>
            <Select
              value={formData.urgency}
              onValueChange={(value) => setFormData({ ...formData, urgency: value })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {urgencyOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visita para orçamento */}
          <div>
            <Label className="text-base font-medium">Pode receber visita para orçamento?</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accepts_visit"
                  checked={formData.accepts_visit === true}
                  onChange={() => setFormData({ ...formData, accepts_visit: true })}
                  className="w-4 h-4 text-orange-500"
                />
                <span>Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accepts_visit"
                  checked={formData.accepts_visit === false}
                  onChange={() => setFormData({ ...formData, accepts_visit: false })}
                  className="w-4 h-4 text-orange-500"
                />
                <span>Não</span>
              </label>
            </div>
          </div>

          {/* Fotos/Vídeos */}
          <div>
            <Label className="text-base font-medium">Enviar fotos ou vídeos (opcional)</Label>
            <div className="space-y-2 mt-1.5">
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative w-20 h-20">
                    <img src={photo} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                      <span className="text-sm text-slate-600">Clique para adicionar fotos ou vídeos</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Telefone/WhatsApp */}
          <div>
            <Label className="text-base font-medium">Telefone / WhatsApp *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
              className="mt-1.5"
              required
            />
          </div>

          {/* Avisó informativo */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              Profissionais da sua região poderão entrar em contato diretamente com você.
            </p>
          </div>

          {/* Checkbox de aceite */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
            <input
              type="checkbox"
              checked={formData.accept_contact}
              onChange={(e) => setFormData({ ...formData, accept_contact: e.target.checked })}
              className="w-5 h-5 mt-0.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              required
            />
            <Label className="text-sm text-slate-700 cursor-pointer" onClick={() => setFormData({ ...formData, accept_contact: !formData.accept_contact })}>
              Aceito receber contato de profissionais interessados em realizar o serviço solicitado.
            </Label>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-orange-500 hover:bg-orange-600 py-6 text-lg"
            disabled={createQuoteMutation.isPending || !formData.accept_contact}
          >
            {createQuoteMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Publicar Solicitação
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
