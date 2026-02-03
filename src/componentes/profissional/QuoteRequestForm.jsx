import React, { useState } from 'react';
import { QuoteRequest, Professional, Notification } from "@/lib/entities";
import { useAuth } from "@/lib/AuthContext";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/interface do usuário/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Upload, MapPin, DollarSign, Clock, Send } from "lucide-react";
import { format, addDays } from "date-fns";

export default function QuoteRequestForm() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const queryClient = useQueryClient();

  const createQuoteMutation = useMutation({
    mutationFn: async (data) => {
      return QuoteRequest.create(data);
    },
    onSuccess: async (newQuote) => {
      queryClient.invalidateQueries(['client-quotes']);

      // Send to matched professionals if auto_match is enabled
      if (newQuote.auto_match) {
        await matchProfessionals(newQuote);
      }

      alert('Pedido de orçamento criado com sucesso!');
      window.location.href = '/client-quotes';
    }
  });

  const matchProfessionals = async (quote) => {
    // Get professionals matching criteria
    const professionals = await Professional.filter({
      profession: quote.profession,
      city: quote.city,
      is_approved: true,
      plan_active: true
    }, '-ranking_score', 20);

    // Select top 3 by ranking
    const matched = professionals.slice(0, 3).map(p => p.id);

    // Create notifications for matched professionals
    for (const profId of matched) {
      await Notification.create({
        user_id: profId,
        type: 'quote_request',
        title: 'Novo Pedido de Orçamento',
        message: `Você recebeu um novo pedido: ${quote.title}`,
        link: `/professional-quotes?quote=${quote.id}`,
        priority: 'high'
      });
    }

    // Update quote with matched professionals
    await QuoteRequest.update(quote.id, {
      matched_professionals: matched
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await uploadFile(file);
        uploadedUrls.push(file_url);
      }
      setPhotos([...photos, ...uploadedUrls]);
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      navigateToLogin();
      return;
    }

    const formData = new FormData(e.target);
    const data = {
      client_id: user.id,
      client_name: user.full_name,
      client_phone: formData.get('phone'),
      category: formData.get('category'),
      profession: formData.get('profession'),
      title: formData.get('title'),
      description: formData.get('description'),
      city: formData.get('city'),
      state: formData.get('state'),
      address: formData.get('address'),
      budget_range: formData.get('budget_range'),
      urgency: formData.get('urgency'),
      auto_match: formData.get('auto_match') === 'on',
      photos: photos,
      expires_at: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      status: 'open'
    };

    createQuoteMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitar Orçamento</CardTitle>
        <CardDescription>
          Descreva o serviço que você precisa e encontre profissionais qualificados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título do Serviço *</Label>
            <Input name="title" required placeholder="Ex: Reforma de cozinha completa" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="construcao">Construção</SelectItem>
                  <SelectItem value="reforma">Reforma</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="instalacao">Instalação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Profissional *</Label>
              <Select name="profession" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pedreiro">Pedreiro</SelectItem>
                  <SelectItem value="pintor">Pintor</SelectItem>
                  <SelectItem value="eletricista_residencial">Eletricista</SelectItem>
                  <SelectItem value="encanador">Encanador</SelectItem>
                  <SelectItem value="marceneiro">Marceneiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição Detalhada *</Label>
            <Textarea
              name="description"
              required
              rows={4}
              placeholder="Descreva o serviço com o máximo de detalhes..."
            />
          </div>

          <div>
            <Label>Fotos (opcional)</Label>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photos.map((url, idx) => (
                    <img key={idx} src={url} alt="" className="w-20 h-20 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cidade *</Label>
              <Input name="city" required placeholder="Sua cidade" />
            </div>
            <div>
              <Label>Estado *</Label>
              <Input name="state" required placeholder="UF" maxLength={2} />
            </div>
          </div>

          <div>
            <Label>Endereço Completo</Label>
            <Input name="address" placeholder="Rua, número, bairro..." />
          </div>

          <div>
            <Label>Seu Telefone *</Label>
            <Input name="phone" required placeholder="(00) 00000-0000" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Orçamento Estimado
              </Label>
              <Select name="budget_range" defaultValue="a_negociar">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ate_500">Até R$ 500</SelectItem>
                  <SelectItem value="500_1000">R$ 500 - R$ 1.000</SelectItem>
                  <SelectItem value="1000_3000">R$ 1.000 - R$ 3.000</SelectItem>
                  <SelectItem value="3000_5000">R$ 3.000 - R$ 5.000</SelectItem>
                  <SelectItem value="acima_5000">Acima de R$ 5.000</SelectItem>
                  <SelectItem value="a_negociar">A Negociar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Urgência
              </Label>
              <Select name="urgency" defaultValue="flexivel">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgente">Urgente (hoje/amanhã)</SelectItem>
                  <SelectItem value="esta_semana">Esta Semana</SelectItem>
                  <SelectItem value="este_mes">Este Mês</SelectItem>
                  <SelectItem value="flexivel">Flexível</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 p-4 rounded-lg">
            <input
              type="checkbox"
              name="auto_match"
              defaultChecked
              className="w-4 h-4"
            />
            <Label className="text-sm">
              Enviar automaticamente para até 3 profissionais mais relevantes próximos a você
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600"
            disabled={createQuoteMutation.isLoading}
          >
            <Send className="w-4 h-4 mr-2" />
            {createQuoteMutation.isLoading ? 'Enviando...' : 'Solicitar Orçamentos'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
