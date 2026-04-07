import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortfolioService } from '@/lib/entities';
import { uploadFile, deleteFile, BUCKETS } from '@/lib/storage';
import { Button } from '@/componentes/interface do usuário/button';
import { Input } from '@/componentes/interface do usuário/input';
import { Label } from '@/componentes/interface do usuário/label';
import { Textarea } from '@/componentes/interface do usuário/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/componentes/interface do usuário/card';
import { Badge } from '@/componentes/interface do usuário/badge';
import { Progress } from '@/componentes/interface do usuário/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/componentes/interface do usuário/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/componentes/interface do usuário/alert-dialog';
import {
  Loader2, Plus, Trash2, ImagePlus, X, Pencil,
  FolderOpen, Camera, AlertCircle, CheckCircle, Lock, Share2, Copy, DollarSign, Crown
} from 'lucide-react';
import { showToast } from "@/utils/showToast";
import {
  getPortfolioLimits,
  canAddProject,
  canAddPhoto,
  isPremiumPlan
} from '@/lib/constants/portfolioLimits';
import UpgradePlanModal from './UpgradePlanModal';

export default function PortfolioManager({ professionalId, professional }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState('projects');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_type: '',
    project_value: '',
    photos: []
  });

  // Verificar se professional ainda está carregando
  const isProfessionalLoading = !professional;

  // Obter limites dinâmicos baseado no plano
  const limits = getPortfolioLimits(professional);
  const MAX_ITEMS = limits.MAX_PROJECTS;
  const MAX_PHOTOS_PER_ITEM = limits.MAX_PHOTOS_PER_PROJECT;
  const hasPremium = isPremiumPlan(professional);

  // Handler para mostrar modal de upgrade quando limite é atingido
  const handleLimitReached = (type) => {
    setUpgradeLimitType(type);
    setUpgradeModalOpen(true);
  };

  // Fetch portfolio items usando fetch direto (evita race condition)
  const { data: portfolioItems = [], isLoading, isFetching } = useQuery({
    queryKey: ['portfolio', professionalId],
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/portfolio_items?professional_id=eq.${professionalId}&is_active=eq.true&select=*,portfolio_photos(*)&order=display_order.asc`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data || [];
    },
    enabled: !!professionalId
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => PortfolioService.createWithPhotos(professionalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', professionalId] });
      setIsCreateOpen(false);
      resetForm();
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => PortfolioService.updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', professionalId] });
      setIsEditOpen(false);
      setEditingItem(null);
      resetForm();
    }
  });

  // Delete mutation - também deleta fotos do storage
  const deleteMutation = useMutation({
    mutationFn: async (itemId) => {
      // Busca o item para pegar as URLs das fotos antes de deletar
      const item = portfolioItems.find(i => i.id === itemId);
      const photoUrls = item?.portfolio_photos?.map(p => p.photo_url) || [];

      // Deleta o item do banco (cascade deleta os registros das fotos)
      await PortfolioService.deleteItem(itemId);

      // Deleta as fotos do storage em background
      for (const photoUrl of photoUrls) {
        try {
          await deleteFile(photoUrl, BUCKETS.PORTFOLIO);
        } catch (error) {
          // Ignorar erro de deleção
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', professionalId] });
      setDeleteConfirmId(null);
    }
  });

  // Add photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: ({ itemId, photoUrl }) => PortfolioService.addPhoto(itemId, photoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', professionalId] });
    }
  });

  // Remove photo mutation - também deleta do storage
  const removePhotoMutation = useMutation({
    mutationFn: async ({ photoId, photoUrl }) => {
      // Primeiro remove do banco
      await PortfolioService.removePhoto(photoId);

      // Depois tenta deletar do storage
      if (photoUrl) {
        try {
          await deleteFile(photoUrl, BUCKETS.PORTFOLIO);
        } catch (error) {
          // Ignorar erro de deleção
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', professionalId] });
    }
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', service_type: '', project_value: '', photos: [] });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS_PER_ITEM - (formData.photos?.length || 0);
    if (remainingSlots <= 0) {
      if (!hasPremium) {
        handleLimitReached('photos');
      } else {
        showToast.warning(`Limite de ${MAX_PHOTOS_PER_ITEM} fotos atingido.`);
      }
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadedUrls = [];
      for (const file of filesToUpload) {
        const fileUrl = await uploadFile(file, BUCKETS.PORTFOLIO);
        uploadedUrls.push(fileUrl);
      }
      setFormData({
        ...formData,
        photos: [...(formData.photos || []), ...uploadedUrls]
      });
    } catch (error) {
      showToast.error(`Erro ao fazer upload: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddPhotoToItem = async (itemId, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const item = portfolioItems.find(i => i.id === itemId);
    const currentPhotoCount = item?.portfolio_photos?.length || 0;

    if (currentPhotoCount >= MAX_PHOTOS_PER_ITEM) {
      if (!hasPremium) {
        handleLimitReached('photos');
      } else {
        showToast.warning(`Limite de ${MAX_PHOTOS_PER_ITEM} fotos atingido para este serviço.`);
      }
      return;
    }

    setUploading(true);

    try {
      const fileUrl = await uploadFile(files[0], BUCKETS.PORTFOLIO);
      await addPhotoMutation.mutateAsync({ itemId, photoUrl: fileUrl });
    } catch (error) {
      showToast.error(`Erro ao fazer upload: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const removeFormPhoto = async (index) => {
    const photoUrl = formData.photos[index];
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });

    // Deleta a foto do storage (já foi enviada durante o upload)
    if (photoUrl) {
      try {
        await deleteFile(photoUrl, BUCKETS.PORTFOLIO);
      } catch (error) {
        // Ignorar erro de deleção
      }
    }
  };

  const handleCreate = () => {
    if (!formData.title.trim()) {
      showToast.warning('O titulo do serviço é obrigatório.');
      return;
    }
    if (formData.photos.length === 0) {
      showToast.warning('Adicione pelo menos uma foto do serviço.');
      return;
    }
    const dataToSubmit = {
      ...formData,
      project_value: formData.project_value ? parseFloat(formData.project_value) : null
    };
    createMutation.mutate(dataToSubmit);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      service_type: item.service_type || '',
      project_value: item.project_value ? item.project_value.toString() : '',
      photos: []
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.title.trim()) {
      showToast.warning('O titulo do serviço é obrigatório.');
      return;
    }
    updateMutation.mutate({
      id: editingItem.id,
      updates: {
        title: formData.title,
        description: formData.description,
        service_type: formData.service_type,
        project_value: formData.project_value ? parseFloat(formData.project_value) : null
      }
    });
  };

  const copyPortfolioLink = () => {
    const link = `${window.location.origin}/Portfolio?id=${professionalId}`;
    navigator.clipboard.writeText(link);
    showToast.success('Link copiado!');
  };

  // Se professional ainda está carregando, mostrar loading
  if (isProfessionalLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Mostrar loading apenas na primeira carga quando está buscando dados
  if (isLoading && isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const canAddMore = portfolioItems.length < MAX_ITEMS;

  return (
    <div className="space-y-6">
      {/* Header com link de compartilhamento */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-purple-900 mb-1">Seus Serviços Online</h3>
              <p className="text-sm text-purple-700 mb-3">
                Compartilhe seus serviços realizados com clientes e mostre seu melhor trabalho!
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/Portfolio?id=${professionalId}`}
                  className="flex-1 bg-white border border-purple-200 rounded px-3 py-2 text-sm font-mono"
                  onClick={(e) => e.target.select()}
                />
                <Button size="sm" onClick={copyPortfolioLink} className="bg-purple-500 hover:bg-purple-600">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status dos Serviços */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-900">Meus Serviços</span>
              {hasPremium ? (
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              ) : (
                <Badge variant="secondary">Gratuito</Badge>
              )}
            </div>
            <Button
              onClick={() => {
                if (canAddMore) {
                  setIsCreateOpen(true);
                } else {
                  handleLimitReached('projects');
                }
              }}
              className={canAddMore
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-slate-400 hover:bg-slate-500"
              }
            >
              {canAddMore ? (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Serviço
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Limite Atingido
                </>
              )}
            </Button>
          </div>

          {/* Barra de progresso */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {portfolioItems.length} de {MAX_ITEMS} serviços cadastrados
              </span>
              <span className="text-slate-500">
                {Math.round((portfolioItems.length / MAX_ITEMS) * 100)}%
              </span>
            </div>
            <Progress
              value={(portfolioItems.length / MAX_ITEMS) * 100}
              className="h-2"
            />
            {!hasPremium && portfolioItems.length >= MAX_ITEMS && (
              <p className="text-xs text-amber-600 mt-2">
                Faça upgrade para o plano premium e adicione até 10 serviços!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Serviços */}
      {portfolioItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-slate-600 mb-4">
              Adicione seus melhores serviços realizados para mostrar aos clientes.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Serviço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {portfolioItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.service_type && (
                        <Badge variant="outline">{item.service_type}</Badge>
                      )}
                      {item.project_value && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <DollarSign className="w-3 h-3 mr-1" />
                          R$ {parseFloat(item.project_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                )}

                {/* Fotos do serviço */}
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">
                    Fotos ({item.portfolio_photos?.length || 0}/{MAX_PHOTOS_PER_ITEM})
                  </span>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {item.portfolio_photos?.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={photo.photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removePhotoMutation.mutate({ photoId: photo.id, photoUrl: photo.photo_url })}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {(item.portfolio_photos?.length || 0) < MAX_PHOTOS_PER_ITEM && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                      {uploading ? (
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="w-5 h-5 text-slate-400" />
                          <span className="text-xs text-slate-500 mt-1">Adicionar</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={(e) => handleAddPhotoToItem(item.id, e)}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Criar Serviço */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Serviço</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Titulo do Serviço *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Reforma de Banheiro"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Tipo de Serviço</Label>
              <Input
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                placeholder="Ex: Pintura, Reforma, Instalacao..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Descrição do Serviço</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o serviço realizado, materiais utilizados, desafios superados..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label>Valor do Projeto (opcional)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.project_value}
                  onChange={(e) => setFormData({ ...formData, project_value: e.target.value })}
                  placeholder="Ex: 2500.00"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Informe quanto cobrou por este serviço (opcional)
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Fotos do Serviço *</Label>
                <Badge variant="secondary">
                  {formData.photos?.length || 0} / {MAX_PHOTOS_PER_ITEM}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {formData.photos?.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFormPhoto(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {(formData.photos?.length || 0) < MAX_PHOTOS_PER_ITEM && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-slate-400" />
                        <span className="text-xs text-slate-500 mt-1">Adicionar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Formatos: JPG, PNG, GIF, WebP. Maximo: 10 MB por foto.
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || uploading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Serviço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Serviço */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Titulo do Serviço *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Tipo de Serviço</Label>
              <Input
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Descrição do Serviço</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label>Valor do Projeto (opcional)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.project_value}
                  onChange={(e) => setFormData({ ...formData, project_value: e.target.value })}
                  placeholder="Ex: 2500.00"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600">
                Para gerenciar as fotos deste serviço, use os controles na listagem principal.
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setEditingItem(null); resetForm(); }}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Salvar Alteracoes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmacao de Exclusao */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Está acao não pode ser desfeita. O serviço e todas as suas fotos serão excluidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirmId)}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Upgrade */}
      <UpgradePlanModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        limitType={upgradeLimitType}
      />
    </div>
  );
}
