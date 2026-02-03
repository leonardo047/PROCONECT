import React, { useState } from 'react';
import { QuoteRequest, Professional, Notification } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Upload, X, Loader2, CheckCircle, Send } from "lucide-react";
import { addDays } from "date-fns";

export default function CreateQuoteRequest({ onSuccess }) {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    city: '',
    state: '',
    address: '',
    budget_range: '',
    urgency: 'medium',
    preferred_date: '',
    auto_match: true
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const createQuoteMutation = useMutation({
    mutationFn: async (data) => {
      const quote = await QuoteRequest.create(data);

      // Se auto_match está ativo, buscar profissionais
      if (data.auto_match) {
        await matchProfessionals(quote);
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quote-requests']);
      if (onSuccess) onSuccess();
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
      console.error('Error uploading photos:', error);
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

    const quoteData = {
      ...formData,
      client_id: user.id,
      client_name: user.full_name,
      client_phone: user.phone || '',
      photos: photos,
      expires_at: addDays(new Date(), 7).toISOString(),
      status: 'open'
    };

    await createQuoteMutation.mutateAsync(quoteData);
  };

  const professions = [
    { value: 'pedreiro', label: 'Pedreiro' },
    { value: 'pintor', label: 'Pintor' },
    { value: 'eletricista_residencial', label: 'Eletricista' },
    { value: 'encanador', label: 'Encanador' },
    { value: 'marceneiro', label: 'Marceneiro' },
    { value: 'gesseiro_drywall', label: 'Gesseiro/Drywall' },
    { value: 'azulejista', label: 'Azulejista' }
  ];

  const states = ['SP', 'RJ', 'MG', 'ES', 'BA', 'PR', 'SC', 'RS', 'GO', 'DF'];

  if (createQuoteMutation.isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-900 mb-2">
            Pedido Enviado com Sucesso!
          </h3>
          <p className="text-green-700 mb-4">
            {formData.auto_match
              ? 'Seu pedido foi enviado para até 3 profissionais na sua região.'
              : 'Profissionais poderão visualizar e responder seu pedido.'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Criar Novo Pedido
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitar Orçamento</CardTitle>
        <p className="text-sm text-slate-600">
          Descreva o serviço que precisa e receba propostas de profissionais qualificados
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Categoria do Serviço *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {professions.map(prof => (
                  <SelectItem key={prof.value} value={prof.value}>
                    {prof.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título do Pedido *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Pintura de casa 3 quartos"
              required
            />
          </div>

          <div>
            <Label>Descrição Detalhada *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o serviço que precisa..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Estado *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cidade *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Nome da cidade"
                required
              />
            </div>
          </div>

          <div>
            <Label>Endereço (Opcional)</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Orçamento Estimado</Label>
              <Select
                value={formData.budget_range}
                onValueChange={(value) => setFormData({ ...formData, budget_range: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ate_500">Até R$ 500</SelectItem>
                  <SelectItem value="500_1000">R$ 500 - R$ 1.000</SelectItem>
                  <SelectItem value="1000_3000">R$ 1.000 - R$ 3.000</SelectItem>
                  <SelectItem value="3000_5000">R$ 3.000 - R$ 5.000</SelectItem>
                  <SelectItem value="acima_5000">Acima de R$ 5.000</SelectItem>
                  <SelectItem value="nao_sei">Não sei estimar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgência</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Data Preferida</Label>
            <Input
              type="date"
              value={formData.preferred_date}
              onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Fotos (Opcional)</Label>
            <div className="space-y-2">
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
                      <span className="text-sm text-slate-600">Adicionar Fotos</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              checked={formData.auto_match}
              onChange={(e) => setFormData({ ...formData, auto_match: e.target.checked })}
              className="w-4 h-4"
            />
            <Label className="text-sm">
              Enviar automaticamente para até 3 profissionais na minha região
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600"
            disabled={createQuoteMutation.isPending}
          >
            {createQuoteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Pedido
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
