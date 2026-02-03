import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, PlanConfig } from "@/lib/entities";
import { uploadFile } from "@/lib/storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import {
  User, Camera, Save, Loader2, AlertCircle, CheckCircle,
  Upload, X, CreditCard, Eye, Clock, ImagePlus, Sparkles
} from "lucide-react";

const professions = [
  { value: "pintura_residencial", label: "Pintura Residencial e Comercial" },
  { value: "pedreiro_alvenaria", label: "Pedreiro / Alvenaria" },
  { value: "eletricista", label: "Eletrica" },
  { value: "hidraulica", label: "Hidraulica" },
  { value: "limpeza", label: "Limpeza Residencial / Pos-obra" },
  { value: "jardinagem", label: "Jardinagem / Rocada" },
  { value: "gesso_drywall", label: "Gesso / Drywall" },
  { value: "telhados", label: "Telhados" },
  { value: "marido_aluguel", label: "Marido de Aluguel" },
  { value: "carpinteiro", label: "Carpintaria" },
  { value: "marceneiro", label: "Marcenaria" },
  { value: "vidraceiro", label: "Vidracaria" },
  { value: "serralheiro", label: "Serralheria" },
  { value: "azulejista", label: "Azulejista / Revestimentos" },
  { value: "ar_condicionado", label: "Ar Condicionado / Refrigeracao" },
  { value: "dedetizacao", label: "Dedetizacao / Controle de Pragas" },
  { value: "mudancas", label: "Mudancas e Fretes" },
  { value: "montador_moveis", label: "Montador de Moveis" },
  { value: "instalador_pisos", label: "Instalador de Pisos" },
  { value: "marmorista", label: "Marmorista / Granitos" },
  { value: "piscineiro", label: "Piscineiro / Manutencao de Piscinas" },
  { value: "tapeceiro", label: "Tapeceiro / Estofador" },
  { value: "chaveiro", label: "Chaveiro" },
  { value: "seguranca_eletronica", label: "Seguranca Eletronica / CFTV" },
  { value: "automacao", label: "Automacao Residencial" },
  { value: "energia_solar", label: "Energia Solar" },
  { value: "impermeabilizacao", label: "Impermeabilizacao" },
  { value: "arquiteto", label: "Arquitetura e Projetos" },
  { value: "engenheiro", label: "Engenharia Civil" },
  { value: "decorador", label: "Decoracao de Interiores" },
  { value: "outros", label: "Outras Especialidades" }
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

export default function ProfessionalDashboard() {
  const queryClient = useQueryClient();
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin } = useAuth();
  const [formData, setFormData] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin]);

  const { data: professional, isLoading } = useQuery({
    queryKey: ['my-professional', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const results = await Professional.filter({ filters: { user_id: user.id } });
      return results[0] || null;
    },
    enabled: !!user
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => PlanConfig.list()
  });

  useEffect(() => {
    if (professional && !formData) {
      setFormData({
        name: professional.name || '',
        profession: professional.profession || 'outros',
        city: professional.city || '',
        state: professional.state || '',
        description: professional.description || '',
        whatsapp: professional.whatsapp || '',
        instagram: professional.instagram || '',
        photos: professional.photos || [],
        video_url: professional.video_url || ''
      });
    }
  }, [professional]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const isComplete = data.name && data.profession && data.city &&
        data.state && data.whatsapp && data.photos?.length >= 3;

      await Professional.update(professional.id, {
        ...data,
        profile_complete: isComplete
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-professional'] });
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const fileUrl = await uploadFile(file);
        uploadedUrls.push(fileUrl);
      }

      setFormData({
        ...formData,
        photos: [...(formData.photos || []), ...uploadedUrls]
      });
    } catch (error) {
      console.error('Upload failed:', error);
    }

    setUploading(false);
  };

  const removePhoto = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading || isLoadingAuth || !user || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  const profPlan = plans.find(p =>
    p.plan_key === (professional.photos?.length >= 10 ? 'profissional_completo' : 'profissional_iniciante')
  );

  const isProfileComplete = formData.name && formData.profession && formData.city &&
    formData.state && formData.whatsapp && formData.photos?.length >= 3;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Meu Painel</h1>
          <p className="text-slate-600">Gerencie seu perfil profissional</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  professional.plan_active ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {professional.plan_active ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status do Plano</p>
                  <p className="font-semibold">
                    {professional.plan_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  professional.is_approved ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {professional.is_approved ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Aprovacao</p>
                  <p className="font-semibold">
                    {professional.is_approved ? 'Aprovado' : 'Pendente'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isProfileComplete ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {isProfileComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <User className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">Perfil</p>
                  <p className="font-semibold">
                    {isProfileComplete ? 'Completo' : 'Incompleto'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        {professional.plan_type === 'free' && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-lg text-green-900 mb-2">Perfil Gratuito Ativo!</p>
                <p className="text-green-700 mb-3">
                  Seu perfil esta visivel e clientes podem te encontrar. Voce so paga quando receber contatos!
                </p>
                <ul className="text-sm text-green-700 space-y-1.5">
                  <li>R$ 3,69 por contato (pague so quando necessario)</li>
                  <li>Ou assine R$ 36,93 por 3 meses (ate 10 contatos/mes)</li>
                  <li>Sem compromisso ou mensalidade fixa</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Cartao Digital - Apenas para Assinantes */}
        {professional.plan_type !== 'free' && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-purple-900 mb-2">Seu Cartao Digital Exclusivo</p>
                <p className="text-purple-700 mb-4">
                  Compartilhe seu link personalizado! Clientes verao apenas voce, como um cartao de visita profissional online.
                </p>

                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-slate-600 mb-2 font-semibold">Seu link exclusivo:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/ProfessionalCard?id=${professional.id}`}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-mono"
                      onClick={(e) => e.target.select()}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/ProfessionalCard?id=${professional.id}`);
                        alert('Link copiado!');
                      }}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert if not visible */}
        {(!professional.is_approved || !isProfileComplete) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Seu perfil nao esta visivel na busca</p>
                <p className="text-sm text-amber-700 mt-1">
                  Para aparecer nas buscas, voce precisa:
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  {!isProfileComplete && <li>Completar o perfil (minimo 3 fotos)</li>}
                  {!professional.is_approved && <li>Aguardar aprovacao do admin</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
            <TabsTrigger value="quotes">Orcamentos</TabsTrigger>
            <TabsTrigger value="reviews">Avaliacoes</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
            <TabsTrigger value="plan">Meu Plano</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informacoes do Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome / Nome da Empresa *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Profissao Principal *</Label>
                    <Select
                      value={formData.profession}
                      onValueChange={(value) => setFormData({ ...formData, profession: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {professions.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Estado *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData({ ...formData, state: value })}
                    >
                      <SelectTrigger className="mt-1">
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
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>WhatsApp *</Label>
                    <Input
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Instagram (opcional)</Label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="@seuinstagram"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Descricao do Servico</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva seus servicos, experiencia e diferenciais..."
                    className="mt-1 min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alteracoes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Fotos dos Trabalhos</span>
                  <Badge variant={formData.photos?.length >= 3 ? "default" : "destructive"}>
                    {formData.photos?.length || 0} / minimo 3
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {formData.photos?.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img
                        src={photo}
                        alt={`Trabalho ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Adicionar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Fotos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-600 mb-4">Responda pedidos de orcamento e ganhe mais clientes</p>
                <Button
                  onClick={() => window.location.href = '/ProfessionalQuotes'}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Ver Pedidos de Orcamento
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-600 mb-4">Gerencie suas avaliacoes em uma pagina dedicada</p>
                <Button
                  onClick={() => window.location.href = '/ProfessionalReviews'}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Ver Todas as Avaliacoes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-600 mb-4">Gerencie sua agenda e solicitacoes de orcamento</p>
                <Button
                  onClick={() => window.location.href = '/ProfessionalSchedule'}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Ver Minha Agenda
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>Meu Plano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-600">Plano Atual</p>
                      <p className="text-xl font-bold text-slate-900">
                        {professional.plan_type === 'completo' ? 'Completo' : 'Iniciante'}
                      </p>
                    </div>
                    <Badge variant={professional.plan_active ? "default" : "secondary"}>
                      {professional.plan_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {professional.plan_expires_at && (
                    <p className="text-sm text-slate-600">
                      Expira em: {new Date(professional.plan_expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-2">Plano Iniciante</h3>
                    <p className="text-3xl font-bold text-orange-500 mb-2">
                      R$ {plans.find(p => p.plan_key === 'profissional_iniciante')?.price?.toFixed(2) || '93,69'}
                      <span className="text-sm font-normal text-slate-600">/mes</span>
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2 mb-4">
                      <li>Ate 10 fotos</li>
                      <li>Perfil na busca</li>
                      <li>Contato direto</li>
                    </ul>
                    <Button variant="outline" className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Assinar
                    </Button>
                  </div>

                  <div className="border-2 border-orange-500 rounded-xl p-6 relative">
                    <Badge className="absolute -top-3 left-4 bg-orange-500">Mais Popular</Badge>
                    <h3 className="font-bold text-lg mb-2">Plano Completo</h3>
                    <p className="text-3xl font-bold text-orange-500 mb-2">
                      R$ {plans.find(p => p.plan_key === 'profissional_completo')?.price?.toFixed(2) || '69,36'}
                      <span className="text-sm font-normal text-slate-600">/mes</span>
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2 mb-4">
                      <li>Fotos ilimitadas</li>
                      <li>Destaque na busca</li>
                      <li>Video do trabalho</li>
                      <li>Contato direto</li>
                    </ul>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Assinar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
