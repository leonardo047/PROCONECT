import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Category, SiteText, PlanConfig } from "@/lib/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Textarea } from "@/componentes/interface do usuário/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/interface do usuário/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/componentes/interface do usuário/dialog";
import { Badge } from "@/componentes/interface do usuário/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/interface do usuário/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/interface do usuário/table";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Shield, Users, Briefcase, Settings, TrendingUp,
  DollarSign, Eye, EyeOff, Plus, Edit, Trash,
  GripVertical, Save, CheckCircle, XCircle, Loader2,
  BarChart3, Award, Target, Zap, AlertCircle,
  History, Send, Copy, ArrowUp, ArrowDown, Home, Package,
  ChevronLeft, ChevronRight
} from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [publishConfirmDialog, setPublishConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);

  const queryClient = useQueryClient();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAuthenticated) {
        navigateToLogin();
        return;
      }
      if (user && user.role !== 'admin') {
        alert('Acesso negado. Apenas administradores podem acessar esta pagina.');
        window.location.href = '/';
      }
    }
  }, [isLoadingAuth, isAuthenticated, user, navigateToLogin]);

  // Data Fetching
  const { data: professionals = [], isLoading: loadingProfessionals } = useQuery({
    queryKey: ['admin-professionals'],
    queryFn: () => Professional.filter({
      orderBy: { field: 'created_date', direction: 'desc' },
      limit: 1000
    }),
    enabled: !!user && user.role === 'admin'
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => Category.filter({
      orderBy: { field: 'order', direction: 'asc' },
      limit: 1000
    }),
    enabled: !!user && user.role === 'admin'
  });

  const { data: siteTexts = [], isLoading: loadingTexts } = useQuery({
    queryKey: ['admin-site-texts'],
    queryFn: () => SiteText.filter({
      orderBy: { field: 'created_date', direction: 'desc' },
      limit: 1000
    }),
    enabled: !!user && user.role === 'admin'
  });

  const { data: planConfigs = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-plan-configs'],
    queryFn: () => PlanConfig.filter({
      orderBy: { field: 'created_date', direction: 'desc' },
      limit: 100
    }),
    enabled: !!user && user.role === 'admin'
  });

  // Mutations
  const updateProfessionalMutation = useMutation({
    mutationFn: ({ id, data }) => Professional.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['admin-professionals'])
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-categories']);
      setShowCategoryDialog(false);
      setEditingCategory(null);
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-categories']);
      setShowCategoryDialog(false);
      setEditingCategory(null);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => Category.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-categories'])
  });

  const createTextMutation = useMutation({
    mutationFn: (data) => SiteText.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-site-texts']);
      setShowTextDialog(false);
      setEditingText(null);
    }
  });

  const updateTextMutation = useMutation({
    mutationFn: ({ id, data }) => SiteText.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-site-texts']);
      setShowTextDialog(false);
      setEditingText(null);
    }
  });

  const deleteTextMutation = useMutation({
    mutationFn: (id) => SiteText.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-site-texts'])
  });

  // Drag and Drop
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order for all items
    for (let i = 0; i < items.length; i++) {
      await Category.update(items[i].id, { order: i });
    }

    queryClient.invalidateQueries(['admin-categories']);
  };

  // Handle Save Category (Draft Mode)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      emoji: formData.get('emoji'),
      icon: formData.get('icon'),
      color: formData.get('color'),
      location: formData.get('location'),
      category_group: formData.get('category_group'),
      parent_category_id: formData.get('parent_category_id') || null,
      is_active: formData.get('is_active') === 'true',
      is_featured: formData.get('is_featured') === 'true'
    };

    // Add to pending changes
    setPendingChanges([...pendingChanges, {
      type: editingCategory ? 'update_category' : 'create_category',
      data: data,
      id: editingCategory?.id,
      timestamp: new Date().toISOString()
    }]);

    setShowCategoryDialog(false);
    setEditingCategory(null);
  };

  // Publish All Changes
  const handlePublishChanges = async () => {
    for (const change of pendingChanges) {
      if (change.type === 'create_category') {
        await createCategoryMutation.mutateAsync({ ...change.data, order: categories.length });
      } else if (change.type === 'update_category') {
        await updateCategoryMutation.mutateAsync({ id: change.id, data: change.data });
      } else if (change.type === 'delete_category') {
        await deleteCategoryMutation.mutateAsync(change.id);
      } else if (change.type === 'create_text') {
        await createTextMutation.mutateAsync(change.data);
      } else if (change.type === 'update_text') {
        await updateTextMutation.mutateAsync({ id: change.id, data: change.data });
      } else if (change.type === 'delete_text') {
        await deleteTextMutation.mutateAsync(change.id);
      }
    }
    setPendingChanges([]);
    setPublishConfirmDialog(false);
  };

  // Duplicate Category
  const handleDuplicateCategory = (category) => {
    setEditingCategory({
      ...category,
      id: null,
      name: `${category.name} (Copia)`,
      slug: `${category.slug}_copy`
    });
    setShowCategoryDialog(true);
  };

  // Handle Save Text (Draft Mode)
  const handleSaveText = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      key: formData.get('key'),
      page: formData.get('page'),
      section: formData.get('section'),
      type: formData.get('type'),
      value: formData.get('value'),
      is_active: formData.get('is_active') === 'true'
    };

    // Add to pending changes
    setPendingChanges([...pendingChanges, {
      type: editingText ? 'update_text' : 'create_text',
      data: data,
      id: editingText?.id,
      timestamp: new Date().toISOString()
    }]);

    setShowTextDialog(false);
    setEditingText(null);
  };

  // Statistics
  const stats = {
    totalProfessionals: professionals.length,
    activeProfessionals: professionals.filter(p => p.is_approved && !p.is_blocked && p.plan_active).length,
    pendingApproval: professionals.filter(p => !p.is_approved).length,
    paidPlans: professionals.filter(p => p.plan_type !== 'free' && p.plan_active).length,
    totalCategories: categories.length,
    activeCategories: categories.filter(c => c.is_active).length,
    totalTexts: siteTexts.length,
    activeTexts: siteTexts.filter(t => t.is_active).length
  };

  if (isLoadingAuth || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  const filteredProfessionals = professionals.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(filteredProfessionals.length / ITEMS_PER_PAGE);
  const paginatedProfessionals = filteredProfessionals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset página quando busca muda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Painel Administrativo</h1>
                <p className="text-slate-600">Bem-vindo, {user?.full_name}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
                className={previewMode ? 'bg-blue-50 border-blue-500' : ''}
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Modo Edicao' : 'Preview'}
              </Button>

              {pendingChanges.length > 0 && (
                <>
                  <Badge className="bg-orange-500 text-white px-4 py-2 text-sm">
                    {pendingChanges.length} alteracoes pendentes
                  </Badge>
                  <Button
                    onClick={() => setPublishConfirmDialog(true)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Publicar Alteracoes
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                onClick={() => setShowHistoryDialog(true)}
              >
                <History className="w-4 h-4 mr-2" />
                Historico
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Total Profissionais</p>
                  <p className="text-3xl font-bold">{stats.totalProfessionals}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Profissionais Ativos</p>
                  <p className="text-3xl font-bold">{stats.activeProfessionals}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm mb-1">Aguardando Aprovacao</p>
                  <p className="text-3xl font-bold">{stats.pendingApproval}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Planos Pagos</p>
                  <p className="text-3xl font-bold">{stats.paidPlans}</p>
                </div>
                <Award className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Visao Geral</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="subcategories">Subcategorias</TabsTrigger>
            <TabsTrigger value="texts">Textos e Botoes</TabsTrigger>
            <TabsTrigger value="professionals">Profissionais</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estatisticas Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Categorias Ativas</span>
                      <Badge className="bg-green-500">{stats.activeCategories} / {stats.totalCategories}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Textos Ativos</span>
                      <Badge className="bg-blue-500">{stats.activeTexts} / {stats.totalTexts}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Taxa de Aprovacao</span>
                      <Badge className="bg-purple-500">
                        {stats.totalProfessionals > 0
                          ? Math.round((stats.activeProfessionals / stats.totalProfessionals) * 100)
                          : 0}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Acoes Rapidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => {
                      setEditingCategory(null);
                      setShowCategoryDialog(true);
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingText(null);
                      setShowTextDialog(true);
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Texto
                  </Button>
                  <Button
                    onClick={() => setActiveTab('professionals')}
                    variant="outline"
                    className="w-full"
                  >
                    Ver Profissionais Pendentes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gerenciar Categorias</CardTitle>
                    <CardDescription>Arraste para reordenar</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingCategory(null);
                      setShowCategoryDialog(true);
                    }}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Categoria
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="categories">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {categories.map((category, index) => (
                            <Draggable key={category.id} draggableId={category.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border"
                                >
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-5 h-5 text-slate-400" />
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {category.emoji && <span className="text-2xl">{category.emoji}</span>}
                                      <span className="font-semibold">{category.name}</span>
                                      <Badge variant={category.is_active ? "default" : "secondary"}>
                                        {category.is_active ? 'Ativo' : 'Inativo'}
                                      </Badge>
                                      {category.location && (
                                        <Badge variant="outline">{category.location}</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-500">{category.slug}</p>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingCategory(category);
                                        setShowCategoryDialog(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDuplicateCategory(category)}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const idx = categories.indexOf(category);
                                        if (idx > 0) {
                                          const newOrder = [...categories];
                                          [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                                          handleDragEnd({ source: { index: idx }, destination: { index: idx - 1 } });
                                        }
                                      }}
                                      disabled={categories.indexOf(category) === 0}
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const idx = categories.indexOf(category);
                                        if (idx < categories.length - 1) {
                                          handleDragEnd({ source: { index: idx }, destination: { index: idx + 1 } });
                                        }
                                      }}
                                      disabled={categories.indexOf(category) === categories.length - 1}
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm('Tem certeza que deseja deletar esta categoria?')) {
                                          setPendingChanges([...pendingChanges, {
                                            type: 'delete_category',
                                            id: category.id,
                                            timestamp: new Date().toISOString()
                                          }]);
                                        }
                                      }}
                                    >
                                      <Trash className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subcategories Tab */}
          <TabsContent value="subcategories">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gerenciar Subcategorias</CardTitle>
                    <CardDescription>Organize subcategorias dentro das categorias principais</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingCategory({ parent_category_id: '' });
                      setShowCategoryDialog(true);
                    }}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Subcategoria
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories.filter(c => !c.parent_category_id).map((parentCat) => {
                      const subcats = categories.filter(c => c.parent_category_id === parentCat.id);
                      return (
                        <div key={parentCat.id} className="border rounded-lg p-4 bg-slate-50">
                          <div className="flex items-center gap-2 mb-3">
                            {parentCat.emoji && <span className="text-2xl">{parentCat.emoji}</span>}
                            <h3 className="font-bold text-lg">{parentCat.name}</h3>
                            <Badge>{subcats.length} subcategorias</Badge>
                          </div>

                          {subcats.length > 0 ? (
                            <div className="space-y-2 ml-8">
                              {subcats.map((subcat) => (
                                <div key={subcat.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {subcat.emoji && <span>{subcat.emoji}</span>}
                                      <span className="font-medium">{subcat.name}</span>
                                      <Badge variant={subcat.is_active ? "default" : "secondary"} className="text-xs">
                                        {subcat.is_active ? 'Ativo' : 'Inativo'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingCategory(subcat);
                                        setShowCategoryDialog(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm('Deletar esta subcategoria?')) {
                                          setPendingChanges([...pendingChanges, {
                                            type: 'delete_category',
                                            id: subcat.id,
                                            timestamp: new Date().toISOString()
                                          }]);
                                        }
                                      }}
                                    >
                                      <Trash className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 ml-8">Nenhuma subcategoria criada</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Texts Tab */}
          <TabsContent value="texts">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Gerenciar Textos do Site</CardTitle>
                    <CardDescription>Edite titulos, descricoes e botoes</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingText(null);
                      setShowTextDialog(true);
                    }}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Texto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTexts ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {siteTexts.map((text) => (
                      <div key={text.id} className="bg-slate-50 p-4 rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{text.key}</span>
                              <Badge variant={text.is_active ? "default" : "secondary"}>
                                {text.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              {text.type && <Badge variant="outline">{text.type}</Badge>}
                            </div>
                            {text.page && <p className="text-xs text-slate-500">Pagina: {text.page} {text.section && `> ${text.section}`}</p>}
                            <p className="text-sm text-slate-700 mt-2">{text.value}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingText(text);
                                setShowTextDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja deletar este texto?')) {
                                  deleteTextMutation.mutate(text.id);
                                }
                              }}
                            >
                              <Trash className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Professionals Tab */}
          <TabsContent value="professionals">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Profissionais</CardTitle>
                <Input
                  placeholder="Buscar por nome ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-4"
                />
              </CardHeader>
              <CardContent>
                {loadingProfessionals ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-slate-600">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProfessionals.length)} de {filteredProfessionals.length}
                      </p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProfessionals.map((prof) => (
                          <TableRow key={prof.id}>
                            <TableCell className="font-medium">{prof.name}</TableCell>
                            <TableCell>{prof.city}, {prof.state}</TableCell>
                            <TableCell>
                              <Badge className={prof.plan_type !== 'free' ? 'bg-orange-500' : 'bg-slate-400'}>
                                {prof.plan_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {prof.is_approved ? (
                                  <Badge className="bg-green-500">Aprovado</Badge>
                                ) : (
                                  <Badge className="bg-yellow-500">Pendente</Badge>
                                )}
                                {prof.is_blocked && <Badge variant="destructive">Bloqueado</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!prof.is_approved && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateProfessionalMutation.mutate({
                                      id: prof.id,
                                      data: { is_approved: true }
                                    })}
                                    className="bg-green-500 hover:bg-green-600"
                                  >
                                    Aprovar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateProfessionalMutation.mutate({
                                    id: prof.id,
                                    data: { is_blocked: !prof.is_blocked }
                                  })}
                                >
                                  {prof.is_blocked ? 'Desbloquear' : 'Bloquear'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex gap-1">
                          {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={currentPage === pageNum ? "bg-orange-500 hover:bg-orange-600" : ""}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input name="name" defaultValue={editingCategory?.name} required />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input name="slug" defaultValue={editingCategory?.slug} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Emoji</Label>
                  <Input name="emoji" defaultValue={editingCategory?.emoji} placeholder="&#128679;" />
                </div>
                <div>
                  <Label>Icone (Lucide)</Label>
                  <Input name="icon" defaultValue={editingCategory?.icon} placeholder="Hammer" />
                </div>
              </div>
              <div>
                <Label>Cor (Tailwind)</Label>
                <Input name="color" defaultValue={editingCategory?.color} placeholder="bg-orange-500" />
              </div>
              <div>
                <Label>Categoria Pai (Para Subcategorias)</Label>
                <Select name="parent_category_id" defaultValue={editingCategory?.parent_category_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (Categoria Principal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhuma (Categoria Principal)</SelectItem>
                    {categories.filter(c => !c.parent_category_id).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grupo da Categoria</Label>
                <Select name="category_group" defaultValue={editingCategory?.category_group || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Construcao, Reforma e Estrutura">Construcao, Reforma e Estrutura</SelectItem>
                    <SelectItem value="Eletrica, Hidraulica e Climatizacao">Eletrica, Hidraulica e Climatizacao</SelectItem>
                    <SelectItem value="Limpeza, Manutencao e Conservacao">Limpeza, Manutencao e Conservacao</SelectItem>
                    <SelectItem value="Madeira, Moveis e Acabamentos">Madeira, Moveis e Acabamentos</SelectItem>
                    <SelectItem value="Maquinas, Terraplanagem e Logistica">Maquinas, Terraplanagem e Logistica</SelectItem>
                    <SelectItem value="Fornecedores e Materiais">Fornecedores e Materiais</SelectItem>
                    <SelectItem value="Projetos e Engenharia">Projetos e Engenharia</SelectItem>
                    <SelectItem value="Automotivo">Automotivo</SelectItem>
                    <SelectItem value="Beleza e Bem-Estar">Beleza e Bem-Estar</SelectItem>
                    <SelectItem value="Pets">Pets</SelectItem>
                    <SelectItem value="Educacao">Educacao</SelectItem>
                    <SelectItem value="Eventos">Eventos</SelectItem>
                    <SelectItem value="Decoracao">Decoracao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Localizacao</Label>
                <Select name="location" defaultValue={editingCategory?.location || 'home'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="other_services">Outros Servicos</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    value="true"
                    defaultChecked={editingCategory?.is_active !== false}
                    className="w-4 h-4"
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_featured"
                    value="true"
                    defaultChecked={editingCategory?.is_featured}
                    className="w-4 h-4"
                  />
                  <Label>Destaque</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Text Dialog */}
        <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingText ? 'Editar Texto' : 'Novo Texto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveText} className="space-y-4">
              <div>
                <Label>Chave *</Label>
                <Input name="key" defaultValue={editingText?.key} required placeholder="hero_title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pagina</Label>
                  <Input name="page" defaultValue={editingText?.page} placeholder="Home" />
                </div>
                <div>
                  <Label>Secao</Label>
                  <Input name="section" defaultValue={editingText?.section} placeholder="Hero" />
                </div>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="type" defaultValue={editingText?.type || 'text'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Titulo</SelectItem>
                    <SelectItem value="subtitle">Subtitulo</SelectItem>
                    <SelectItem value="description">Descricao</SelectItem>
                    <SelectItem value="button">Botao</SelectItem>
                    <SelectItem value="label">Label</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Textarea name="value" defaultValue={editingText?.value} required rows={4} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked={editingText?.is_active !== false}
                  className="w-4 h-4"
                />
                <Label>Ativo</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowTextDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Publish Confirm Dialog */}
        <Dialog open={publishConfirmDialog} onOpenChange={setPublishConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Publicacao</DialogTitle>
              <DialogDescription>
                Voce tem {pendingChanges.length} alteracoes pendentes. Deseja publicar todas?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingChanges.map((change, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500">{change.type.replace(/_/g, ' ')}</Badge>
                    <span className="text-slate-600">
                      {new Date(change.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {change.data?.name && <p className="mt-1 font-medium">{change.data.name}</p>}
                  {change.data?.value && <p className="mt-1 text-slate-600">{change.data.value}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPublishConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handlePublishChanges}
                className="bg-green-500 hover:bg-green-600"
              >
                <Send className="w-4 h-4 mr-2" />
                Publicar Agora
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historico de Alteracoes</DialogTitle>
              <DialogDescription>
                Visualize todas as mudancas feitas no sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Funcionalidade em Desenvolvimento</span>
                </div>
                <p className="text-sm text-blue-700">
                  O historico de alteracoes estara disponivel em breve. Por enquanto, todas as mudancas sao aplicadas imediatamente apos a publicacao.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
