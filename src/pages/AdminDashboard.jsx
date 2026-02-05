import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Category, PlanConfig, Payment, Referral, Profile, Expense, ClientSubscription } from "@/lib/entities";
import { jsPDF } from 'jspdf';
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
  Shield, Users, Briefcase, Settings, TrendingUp, TrendingDown,
  DollarSign, Eye, EyeOff, Plus, Edit, Trash,
  GripVertical, Save, CheckCircle, XCircle, Loader2,
  BarChart3, Award, Target, Zap, AlertCircle, AlertTriangle,
  History, Send, Copy, ArrowUp, ArrowDown, Home, Package,
  ChevronLeft, ChevronRight, Gift, CreditCard, Search,
  Download, Calendar, Filter, UserPlus, Clock, PieChart,
  FileText, RefreshCw, Receipt, Wallet, MinusCircle, Percent
} from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoadingAuth, isAuthenticated, navigateToLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Estados para categorias paginadas
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const CATEGORIES_PER_PAGE = 10;

  // Estados para usuários paginados
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 15;
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [publishConfirmDialog, setPublishConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);

  // Filtros Financeiros
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentPeriodFilter, setPaymentPeriodFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Dashboard Financeiro - Filtro global de período
  const [financialPeriodFilter, setFinancialPeriodFilter] = useState('este_mes');

  // Estados de Despesas
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [savingExpense, setSavingExpense] = useState(false);

  // Filtros Indicações
  const [referralStatusFilter, setReferralStatusFilter] = useState('all');
  const [referralTypeFilter, setReferralTypeFilter] = useState('all');
  const [referralSearch, setReferralSearch] = useState('');
  const [showAddCreditDialog, setShowAddCreditDialog] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState(null);
  const [creditAmount, setCreditAmount] = useState(1);

  const queryClient = useQueryClient();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!isAuthenticated) {
        navigateToLogin();
        return;
      }

      // Verificar role do user (agora já é setado no basicUser pelo email)
      if (user && user.role === 'admin') {
        // É admin, pode prosseguir
        setIsCheckingAdmin(false);
      } else if (user && user.role !== 'admin') {
        // Não é admin, redirecionar
        alert('Acesso negado. Apenas administradores podem acessar esta pagina.');
        window.location.href = '/';
      }
      // Se user é null, aguardar
    }
  }, [isLoadingAuth, isAuthenticated, user, navigateToLogin]);

  // Data Fetching
  const { data: professionals = [], isLoading: loadingProfessionals } = useQuery({
    queryKey: ['admin-professionals'],
    queryFn: () => Professional.filter({
      orderBy: { field: 'created_at', direction: 'desc' },
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

  const { data: planConfigs = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-plan-configs'],
    queryFn: () => PlanConfig.filter({
      orderBy: { field: 'created_at', direction: 'desc' },
      limit: 100
    }),
    enabled: !!user && user.role === 'admin'
  });

  // Payments Query
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => Payment.filter({
      orderBy: { field: 'created_at', direction: 'desc' },
      limit: 1000
    }),
    enabled: !!user && user.role === 'admin'
  });

  // Referrals Query
  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: () => Referral.filter({
      orderBy: { field: 'created_at', direction: 'desc' },
      limit: 1000
    }),
    enabled: !!user && user.role === 'admin'
  });

  // Profiles Query (para dados dos clientes)
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => Profile.filter({ limit: 5000 }),
    enabled: !!user && user.role === 'admin'
  });

  // Expenses Query (para dashboard financeiro)
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: () => Expense.filter({
      orderBy: { field: 'date', direction: 'desc' },
      limit: 1000
    }),
    enabled: !!user && user.role === 'admin'
  });

  // Client Subscriptions Query (para métricas de clientes)
  const { data: clientSubscriptions = [], isLoading: loadingSubscriptions } = useQuery({
    queryKey: ['admin-client-subscriptions'],
    queryFn: () => ClientSubscription.filter({ limit: 5000 }),
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

  // Atualizar status de pagamento
  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }) => Payment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['admin-payments'])
  });

  // Completar indicação manualmente
  const completeReferralMutation = useMutation({
    mutationFn: async (referralId) => {
      await Referral.update(referralId, {
        status: 'completed',
        credit_awarded: true,
        credited_at: new Date().toISOString()
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['admin-referrals'])
  });

  // Adicionar créditos manualmente a um usuário (centralizado na tabela profiles)
  const addClientCreditMutation = useMutation({
    mutationFn: async ({ id, credits }) => {
      if (!id) throw new Error('ID do usuario nao encontrado');
      const profile = profiles.find(p => p.id === id);
      const newCredits = (profile?.referral_credits || 0) + credits;
      await Profile.update(id, { referral_credits: newCredits });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-profiles']);
      alert('Creditos adicionados com sucesso!');
    },
    onError: (error) => {
      alert('Erro ao adicionar creditos: ' + error.message);
    }
  });

  // Criar despesa
  const createExpenseMutation = useMutation({
    mutationFn: (data) => Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-expenses']);
      setShowExpenseDialog(false);
      setEditingExpense(null);
    }
  });

  // Atualizar despesa
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-expenses']);
      setShowExpenseDialog(false);
      setEditingExpense(null);
    }
  });

  // Deletar despesa
  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-expenses'])
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

  // Handle Save Category (Direct Save)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);

    const formData = new FormData(e.target);
    const categoryGroup = formData.get('category_group');
    const data = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      emoji: formData.get('emoji') || null,
      icon: formData.get('icon') || null,
      color: formData.get('color') || null,
      location: formData.get('location') || 'home',
      category_group: categoryGroup && categoryGroup !== '__none__' ? categoryGroup : null,
      is_active: formData.get('is_active') === 'true',
      is_featured: formData.get('is_featured') === 'true'
    };

    try {
      if (editingCategory?.id) {
        // Update existing category
        await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data });
        alert('Categoria atualizada com sucesso!');
      } else {
        // Create new category
        await createCategoryMutation.mutateAsync({ ...data, order: categories.length });
        alert('Categoria criada com sucesso!');
      }
      setShowCategoryDialog(false);
      setEditingCategory(null);
    } catch (error) {
      alert('Erro ao salvar categoria: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSavingCategory(false);
    }
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

  // Statistics
  const processedPayments = payments.filter(p => p.status === 'processed' || p.status === 'approved');
  const totalRevenue = processedPayments.reduce((sum, p) => sum + (p.total_price || p.amount || 0), 0);
  const averageTicket = processedPayments.length > 0 ? totalRevenue / processedPayments.length : 0;

  // Faturamento do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthPayments = processedPayments.filter(p => {
    const paymentDate = new Date(p.created_at);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  });
  const currentMonthRevenue = currentMonthPayments.reduce((sum, p) => sum + (p.total_price || p.amount || 0), 0);

  const stats = {
    totalProfessionals: professionals.length,
    currentMonthRevenue: currentMonthRevenue,
    activeProfessionals: professionals.filter(p => !p.is_blocked && p.plan_active).length,
    paidPlans: professionals.filter(p => p.plan_type !== 'free' && p.plan_active).length,
    totalClients: profiles.filter(p => p.user_type === 'cliente').length,
    activeClients: clientSubscriptions.filter(s => s.is_active).length,
    totalCategories: categories.length,
    activeCategories: categories.filter(c => c.is_active).length,
    // Financial Stats
    totalRevenue: totalRevenue,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    completedPayments: processedPayments.length,
    averageTicket: averageTicket,
    // Referral Stats
    totalReferrals: referrals.length,
    completedReferrals: referrals.filter(r => r.status === 'completed').length,
    pendingReferrals: referrals.filter(r => r.status === 'pending').length,
    totalCreditsAwarded: referrals.filter(r => r.credit_awarded).length
  };

  // Helper: Filtrar pagamentos
  const getFilteredPayments = () => {
    let filtered = [...payments];

    // Filtro por status
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === paymentStatusFilter);
    }

    // Filtro por período
    if (paymentPeriodFilter !== 'all') {
      const now = new Date();
      let startDate;
      if (paymentPeriodFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (paymentPeriodFilter === '7days') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (paymentPeriodFilter === '30days') {
        startDate = new Date(now.setDate(now.getDate() - 30));
      }
      if (startDate) {
        filtered = filtered.filter(p => new Date(p.created_at) >= startDate);
      }
    }

    // Busca por nome/email
    if (paymentSearch.trim()) {
      const search = paymentSearch.toLowerCase();
      filtered = filtered.filter(p => {
        const profile = profiles.find(pr => pr.id === p.user_id);
        const prof = professionals.find(pr => pr.user_id === p.user_id);
        return (
          profile?.full_name?.toLowerCase().includes(search) ||
          profile?.email?.toLowerCase().includes(search) ||
          prof?.name?.toLowerCase().includes(search) ||
          prof?.email?.toLowerCase().includes(search) ||
          p.payer_email?.toLowerCase().includes(search)
        );
      });
    }

    return filtered;
  };

  // Helper: Determinar tipo do indicador (professional se não definido)
  const getReferrerType = (referral) => {
    // Se referrer_type é explicitamente 'client', é cliente
    // Caso contrário, se tem referrer_professional_id, é profissional
    if (referral.referrer_type === 'client') return 'client';
    if (referral.referrer_professional_id) return 'professional';
    if (referral.referrer_user_id) return 'client';
    return 'professional'; // fallback
  };

  // Helper: Obter dados do indicador
  const getReferrerData = (referral) => {
    const type = getReferrerType(referral);
    if (type === 'professional') {
      return professionals.find(p => p.id === referral.referrer_professional_id);
    } else {
      return profiles.find(p => p.id === referral.referrer_user_id);
    }
  };

  // Helper: Filtrar indicações
  const getFilteredReferrals = () => {
    let filtered = [...referrals];

    // Filtro por status
    if (referralStatusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === referralStatusFilter);
    }

    // Filtro por tipo
    if (referralTypeFilter !== 'all') {
      filtered = filtered.filter(r => getReferrerType(r) === referralTypeFilter);
    }

    // Busca
    if (referralSearch.trim()) {
      const search = referralSearch.toLowerCase();
      filtered = filtered.filter(r => {
        const referrer = getReferrerData(r);
        const referred = profiles.find(p => p.id === r.referred_user_id);
        return (
          referrer?.name?.toLowerCase().includes(search) ||
          referrer?.full_name?.toLowerCase().includes(search) ||
          referred?.full_name?.toLowerCase().includes(search)
        );
      });
    }

    return filtered;
  };

  // Helper: Obter top indicadores
  const getTopReferrers = () => {
    const referrerMap = new Map();

    referrals.forEach(r => {
      const type = getReferrerType(r);
      const key = type === 'professional'
        ? `prof_${r.referrer_professional_id}`
        : `client_${r.referrer_user_id}`;

      if (!referrerMap.has(key)) {
        referrerMap.set(key, {
          type,
          id: type === 'professional' ? r.referrer_professional_id : r.referrer_user_id,
          totalReferrals: 0,
          completedReferrals: 0
        });
      }

      const entry = referrerMap.get(key);
      entry.totalReferrals++;
      if (r.status === 'completed') entry.completedReferrals++;
    });

    return Array.from(referrerMap.values())
      .map(entry => {
        // Para profissionais, precisa encontrar o user_id correspondente
        let profile;
        let name = 'Desconhecido';

        if (entry.type === 'professional') {
          const prof = professionals.find(p => p.id === entry.id);
          if (prof) {
            profile = profiles.find(p => p.id === prof.user_id);
            name = prof.name || profile?.full_name || 'Desconhecido';
          }
        } else {
          profile = profiles.find(p => p.id === entry.id);
          name = profile?.full_name || 'Desconhecido';
        }

        return {
          ...entry,
          name,
          credits: profile?.referral_credits || 0
        };
      })
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, 10);
  };

  // Helper: Formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Helper: Exportar CSV
  const exportPaymentsCSV = () => {
    const filtered = getFilteredPayments();
    const headers = ['Data', 'Cliente', 'Email', 'Plano', 'Valor', 'Método', 'Status'];
    const rows = filtered.map(p => {
      const profile = profiles.find(pr => pr.id === p.user_id);
      const prof = professionals.find(pr => pr.user_id === p.user_id);
      return [
        new Date(p.created_at).toLocaleDateString('pt-BR'),
        profile?.full_name || prof?.name || 'N/A',
        profile?.email || prof?.email || p.payer_email || 'N/A',
        p.plan_type || p.description || 'N/A',
        p.total_price || p.amount || 0,
        p.payment_method || 'N/A',
        p.status
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ========== HELPERS DO DASHBOARD FINANCEIRO ==========

  // Helper: Obter datas do período selecionado
  const getPeriodDates = (period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'este_mes':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
      case 'ultimo_mes':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0)
        };
      case '3_meses':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          end: today
        };
      case 'ano':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: today
        };
      default:
        return { start: null, end: null };
    }
  };

  // Helper: Filtrar por período
  const filterByPeriod = (items, dateField, period) => {
    const { start, end } = getPeriodDates(period);
    if (!start || !end) return items;
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= start && itemDate <= end;
    });
  };

  // Helper: Calcular métricas financeiras
  const calculateFinancialMetrics = () => {
    const { start, end } = getPeriodDates(financialPeriodFilter);

    // Filtrar pagamentos do período
    const periodPayments = payments.filter(p => {
      if (!start || !end) return true;
      const paymentDate = new Date(p.created_at);
      return paymentDate >= start && paymentDate <= end;
    });

    // Pagamentos aprovados
    const approvedPayments = periodPayments.filter(p =>
      p.status === 'processed' || p.status === 'approved'
    );

    // Receita total
    const totalRevenue = approvedPayments.reduce((sum, p) =>
      sum + (p.total_price || p.amount || 0), 0
    );

    // Ticket médio
    const averageTicket = approvedPayments.length > 0
      ? totalRevenue / approvedPayments.length
      : 0;

    // Despesas do período
    const periodExpenses = expenses.filter(e => {
      if (!start || !end) return true;
      const expenseDate = new Date(e.date);
      return expenseDate >= start && expenseDate <= end;
    });

    const totalExpenses = periodExpenses.reduce((sum, e) =>
      sum + (parseFloat(e.amount) || 0), 0
    );

    // Lucro líquido
    const netProfit = totalRevenue - totalExpenses;

    // ROI
    const roi = totalExpenses > 0
      ? ((netProfit / totalExpenses) * 100)
      : (totalRevenue > 0 ? 100 : 0);

    // Margem de lucro
    const profitMargin = totalRevenue > 0
      ? ((netProfit / totalRevenue) * 100)
      : 0;

    // MRR (Receita Mensal Recorrente) - pagamentos de assinatura
    const mrr = approvedPayments
      .filter(p => p.plan_type && p.plan_type !== 'free')
      .reduce((sum, p) => sum + (p.total_price || p.amount || 0), 0);

    // Receita por plano
    const revenueByPlan = approvedPayments.reduce((acc, p) => {
      const plan = p.plan_type || 'outro';
      acc[plan] = (acc[plan] || 0) + (p.total_price || p.amount || 0);
      return acc;
    }, {});

    // Despesas por categoria
    const expensesByCategory = periodExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + (parseFloat(e.amount) || 0);
      return acc;
    }, {});

    // === FATURAMENTO POR INDICAÇÃO ===
    // Identificar usuários que vieram por indicação (têm referred_by_code)
    const referredUserIds = profiles
      .filter(p => p.referred_by_code)
      .map(p => p.id);

    // Pagamentos de usuários que vieram por indicação
    const referralPayments = approvedPayments.filter(p =>
      referredUserIds.includes(p.user_id)
    );

    // Faturamento total vindo de indicações
    const referralRevenue = referralPayments.reduce((sum, p) =>
      sum + (p.total_price || p.amount || 0), 0
    );

    // Percentual do faturamento que veio de indicações
    const referralRevenuePercentage = totalRevenue > 0
      ? ((referralRevenue / totalRevenue) * 100)
      : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      roi,
      profitMargin,
      averageTicket,
      mrr,
      revenueByPlan,
      expensesByCategory,
      transactionCount: approvedPayments.length,
      pendingCount: periodPayments.filter(p => p.status === 'pending').length,
      // Métricas de indicação
      referralRevenue,
      referralRevenuePercentage,
      referralPaymentsCount: referralPayments.length
    };
  };

  // Helper: Calcular métricas de clientes
  const calculateClientMetrics = () => {
    const { start, end } = getPeriodDates(financialPeriodFilter);

    // Profissionais pagantes ativos
    const paidProfessionals = professionals.filter(p =>
      p.plan_type !== 'free' && p.plan_active && !p.is_blocked
    );

    // Profissionais free
    const freeProfessionals = professionals.filter(p =>
      p.plan_type === 'free' || !p.plan_type
    );

    // Clientes com assinatura ativa
    const activeClientSubs = clientSubscriptions.filter(s => s.is_active);

    // Clientes sem assinatura
    const clientProfiles = profiles.filter(p =>
      p.role === 'client' || !p.role
    );
    const clientsWithoutSub = clientProfiles.filter(p =>
      !activeClientSubs.find(s => s.user_id === p.id)
    );

    // Novos pagantes no período
    const newPaidProfessionals = professionals.filter(p => {
      if (!start || !end) return false;
      const planDate = p.plan_started_at ? new Date(p.plan_started_at) : new Date(p.created_at);
      return p.plan_type !== 'free' && p.plan_active && planDate >= start && planDate <= end;
    });

    const newClientSubs = clientSubscriptions.filter(s => {
      if (!start || !end) return false;
      const subDate = new Date(s.created_at);
      return s.is_active && subDate >= start && subDate <= end;
    });

    // Taxa de conversão (novos pagantes / novos cadastros no período)
    const newProfsInPeriod = professionals.filter(p => {
      if (!start || !end) return false;
      const createdAt = new Date(p.created_at);
      return createdAt >= start && createdAt <= end;
    });

    const conversionRate = newProfsInPeriod.length > 0
      ? ((newPaidProfessionals.length / newProfsInPeriod.length) * 100)
      : 0;

    return {
      paidProfessionals: paidProfessionals.length,
      freeProfessionals: freeProfessionals.length,
      activeClientSubs: activeClientSubs.length,
      clientsWithoutSub: clientsWithoutSub.length,
      newPaidProfessionals: newPaidProfessionals.length,
      newClientSubs: newClientSubs.length,
      conversionRate,
      totalPaying: paidProfessionals.length + activeClientSubs.length,
      totalFree: freeProfessionals.length + clientsWithoutSub.length
    };
  };

  // Helper: Calcular métricas de churn e inadimplência
  const calculateChurnMetrics = () => {
    const { start, end } = getPeriodDates(financialPeriodFilter);

    // Cancelamentos de profissionais
    const cancelledProfessionals = professionals.filter(p => {
      if (!p.plan_cancelled_at) return false;
      if (!start || !end) return true;
      const cancelDate = new Date(p.plan_cancelled_at);
      return cancelDate >= start && cancelDate <= end;
    });

    // Cancelamentos de clientes
    const cancelledClientSubs = clientSubscriptions.filter(s => {
      if (!s.cancelled_at) return false;
      if (!start || !end) return true;
      const cancelDate = new Date(s.cancelled_at);
      return cancelDate >= start && cancelDate <= end;
    });

    // Total de cancelamentos
    const totalCancellations = cancelledProfessionals.length + cancelledClientSubs.length;

    // MRR perdido (estimativa baseada nos planos cancelados)
    const lostMRR = cancelledProfessionals.reduce((sum, p) => {
      const planConfig = planConfigs.find(pc => pc.type === p.plan_type);
      return sum + (planConfig?.price || 0);
    }, 0);

    // Taxa de churn
    const totalPayingAtStart = professionals.filter(p =>
      p.plan_type !== 'free' && p.plan_active
    ).length + clientSubscriptions.filter(s => s.is_active).length;

    const churnRate = totalPayingAtStart > 0
      ? ((totalCancellations / totalPayingAtStart) * 100)
      : 0;

    // Motivos de cancelamento
    const cancellationReasons = {};
    cancelledProfessionals.forEach(p => {
      const reason = p.plan_cancellation_reason || 'Não informado';
      cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
    });
    cancelledClientSubs.forEach(s => {
      const reason = s.cancellation_reason || 'Não informado';
      cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
    });

    // Inadimplência - pagamentos pendentes
    const pendingPayments = payments.filter(p => p.status === 'pending');
    const pendingValue = pendingPayments.reduce((sum, p) =>
      sum + (p.total_price || p.amount || 0), 0
    );

    // Taxa de inadimplência
    const totalPayments = payments.length;
    const defaultRate = totalPayments > 0
      ? ((pendingPayments.length / totalPayments) * 100)
      : 0;

    // Aging (dias em aberto)
    const now = new Date();
    const pendingWithAging = pendingPayments.map(p => {
      const created = new Date(p.created_at);
      const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return { ...p, daysOpen };
    }).sort((a, b) => b.daysOpen - a.daysOpen);

    // Agrupar por faixa de aging
    const agingBuckets = {
      '0-7 dias': 0,
      '8-15 dias': 0,
      '16-30 dias': 0,
      '31+ dias': 0
    };
    pendingWithAging.forEach(p => {
      if (p.daysOpen <= 7) agingBuckets['0-7 dias']++;
      else if (p.daysOpen <= 15) agingBuckets['8-15 dias']++;
      else if (p.daysOpen <= 30) agingBuckets['16-30 dias']++;
      else agingBuckets['31+ dias']++;
    });

    return {
      totalCancellations,
      cancelledProfessionals: cancelledProfessionals.length,
      cancelledClientSubs: cancelledClientSubs.length,
      churnRate,
      lostMRR,
      cancellationReasons,
      pendingPaymentsCount: pendingPayments.length,
      pendingValue,
      defaultRate,
      agingBuckets,
      pendingWithAging: pendingWithAging.slice(0, 10) // Top 10 mais antigos
    };
  };

  // Helper: Salvar despesa
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setSavingExpense(true);

    const formData = new FormData(e.target);
    const data = {
      description: formData.get('description'),
      amount: parseFloat(formData.get('amount')),
      category: formData.get('category'),
      date: formData.get('date'),
      notes: formData.get('notes') || null,
      is_recurring: formData.get('is_recurring') === 'true',
      recurring_frequency: formData.get('recurring_frequency') || null
    };

    try {
      if (editingExpense?.id) {
        await updateExpenseMutation.mutateAsync({ id: editingExpense.id, data });
      } else {
        await createExpenseMutation.mutateAsync(data);
      }
    } catch (error) {
      alert('Erro ao salvar despesa: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSavingExpense(false);
    }
  };

  // Helper: Exportar despesas CSV
  const exportExpensesCSV = () => {
    const { start, end } = getPeriodDates(financialPeriodFilter);
    const filtered = expenses.filter(e => {
      if (!start || !end) return true;
      const expenseDate = new Date(e.date);
      return expenseDate >= start && expenseDate <= end;
    });

    const categoryLabels = {
      'infraestrutura': 'Infraestrutura',
      'marketing': 'Marketing',
      'taxas_pagamento': 'Taxas de Pagamento',
      'ferramentas': 'Ferramentas',
      'operacional': 'Operacional',
      'pessoal': 'Pessoal'
    };

    const headers = ['Data', 'Descricao', 'Categoria', 'Valor', 'Recorrente', 'Observacoes'];
    const rows = filtered.map(e => [
      new Date(e.date).toLocaleDateString('pt-BR'),
      `"${e.description}"`,
      categoryLabels[e.category] || e.category,
      e.amount,
      e.is_recurring ? 'Sim' : 'Nao',
      `"${e.notes || ''}"`
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `despesas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Helper: Exportar relatório financeiro completo CSV
  const exportFinancialReportCSV = () => {
    const metrics = calculateFinancialMetrics();
    const clientMetrics = calculateClientMetrics();
    const churnMetrics = calculateChurnMetrics();

    const periodLabel = {
      'este_mes': 'Este Mes',
      'ultimo_mes': 'Ultimo Mes',
      '3_meses': 'Ultimos 3 Meses',
      'ano': 'Este Ano',
      'todos': 'Todo Periodo'
    }[financialPeriodFilter];

    const lines = [
      `RELATORIO FINANCEIRO - ${periodLabel}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      'VISAO GERAL',
      `Receita Total,${metrics.totalRevenue.toFixed(2)}`,
      `Despesas Total,${metrics.totalExpenses.toFixed(2)}`,
      `Lucro Liquido,${metrics.netProfit.toFixed(2)}`,
      `ROI,${metrics.roi.toFixed(1)}%`,
      `Margem de Lucro,${metrics.profitMargin.toFixed(1)}%`,
      `Ticket Medio,${metrics.averageTicket.toFixed(2)}`,
      `MRR,${metrics.mrr.toFixed(2)}`,
      '',
      'CLIENTES',
      `Profissionais Pagantes,${clientMetrics.paidProfessionals}`,
      `Profissionais Free,${clientMetrics.freeProfessionals}`,
      `Clientes com Assinatura,${clientMetrics.activeClientSubs}`,
      `Clientes sem Assinatura,${clientMetrics.clientsWithoutSub}`,
      `Novos Pagantes (periodo),${clientMetrics.newPaidProfessionals + clientMetrics.newClientSubs}`,
      `Taxa de Conversao,${clientMetrics.conversionRate.toFixed(1)}%`,
      '',
      'CHURN',
      `Total Cancelamentos,${churnMetrics.totalCancellations}`,
      `Taxa de Churn,${churnMetrics.churnRate.toFixed(1)}%`,
      `MRR Perdido,${churnMetrics.lostMRR.toFixed(2)}`,
      '',
      'INADIMPLENCIA',
      `Pagamentos Pendentes,${churnMetrics.pendingPaymentsCount}`,
      `Valor em Aberto,${churnMetrics.pendingValue.toFixed(2)}`,
      `Taxa de Inadimplencia,${churnMetrics.defaultRate.toFixed(1)}%`
    ];

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Helper: Exportar relatório financeiro em PDF
  const exportFinancialReportPDF = () => {
    const metrics = calculateFinancialMetrics();
    const clientMetrics = calculateClientMetrics();
    const churnMetrics = calculateChurnMetrics();

    const periodLabel = {
      'este_mes': 'Este Mes',
      'ultimo_mes': 'Ultimo Mes',
      '3_meses': 'Ultimos 3 Meses',
      'ano': 'Este Ano',
      'todos': 'Todo Periodo'
    }[financialPeriodFilter];

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const boxWidth = pageWidth - (margin * 2);
    let y = 20;

    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATORIO FINANCEIRO', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${periodLabel}`, pageWidth / 2, 28, { align: 'center' });

    y = 45;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
    y += 10;

    // === VISÃO GERAL ===
    doc.setFillColor(240, 253, 244);
    doc.rect(margin, y, boxWidth, 52, 'F');
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VISAO GERAL', margin + 4, y + 10);

    doc.setFontSize(10);
    let row1Y = y + 22;
    let row2Y = y + 34;
    let row3Y = y + 46;

    // Row 1
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Receita Total:', margin + 4, row1Y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrency(metrics.totalRevenue), margin + 38, row1Y);

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Despesas:', margin + 70, row1Y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(metrics.totalExpenses), margin + 95, row1Y);

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Lucro Liquido:', margin + 130, row1Y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(metrics.netProfit >= 0 ? 34 : 239, metrics.netProfit >= 0 ? 197 : 68, metrics.netProfit >= 0 ? 94 : 68);
    doc.text(formatCurrency(metrics.netProfit), margin + 162, row1Y);

    // Row 2
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('ROI:', margin + 4, row2Y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(`${metrics.roi.toFixed(1)}%`, margin + 16, row2Y);

    doc.setFont('helvetica', 'normal');
    doc.text('Margem:', margin + 70, row2Y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${metrics.profitMargin.toFixed(1)}%`, margin + 95, row2Y);

    doc.setFont('helvetica', 'normal');
    doc.text('Ticket Medio:', margin + 130, row2Y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(metrics.averageTicket), margin + 162, row2Y);

    // Row 3
    doc.setFont('helvetica', 'normal');
    doc.text('MRR:', margin + 4, row3Y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(metrics.mrr), margin + 18, row3Y);

    doc.setFont('helvetica', 'normal');
    doc.text('Transacoes:', margin + 70, row3Y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${metrics.transactionCount}`, margin + 100, row3Y);

    y += 60;

    // === CLIENTES ===
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, y, boxWidth, 40, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('METRICAS DE CLIENTES', margin + 4, y + 10);

    doc.setFontSize(10);
    row1Y = y + 22;
    row2Y = y + 34;

    // Row 1
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Prof. Pagantes:', margin + 4, row1Y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${clientMetrics.paidProfessionals}`, margin + 42, row1Y);

    doc.setFont('helvetica', 'normal');
    doc.text('Prof. Free:', margin + 65, row1Y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${clientMetrics.freeProfessionals}`, margin + 92, row1Y);

    doc.setFont('helvetica', 'normal');
    doc.text('Clientes Assinantes:', margin + 115, row1Y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${clientMetrics.activeClientSubs}`, margin + 162, row1Y);

    // Row 2
    doc.setFont('helvetica', 'normal');
    doc.text('Novos Pagantes:', margin + 4, row2Y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${clientMetrics.newPaidProfessionals + clientMetrics.newClientSubs}`, margin + 45, row2Y);

    doc.setFont('helvetica', 'normal');
    doc.text('Taxa de Conversao:', margin + 65, row2Y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(`${clientMetrics.conversionRate.toFixed(1)}%`, margin + 112, row2Y);

    y += 48;

    // === CHURN E INADIMPLÊNCIA (lado a lado) ===
    const halfWidth = (boxWidth - 6) / 2;

    // CHURN (esquerda)
    doc.setFillColor(254, 242, 242);
    doc.rect(margin, y, halfWidth, 45, 'F');
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CHURN', margin + 4, y + 10);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Cancelamentos:', margin + 4, y + 22);
    doc.setFont('helvetica', 'bold');
    doc.text(`${churnMetrics.totalCancellations}`, margin + 42, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.text('Taxa de Churn:', margin + 4, y + 32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(`${churnMetrics.churnRate.toFixed(1)}%`, margin + 42, y + 32);

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('MRR Perdido:', margin + 4, y + 42);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(churnMetrics.lostMRR), margin + 38, y + 42);

    // INADIMPLÊNCIA (direita)
    const rightX = margin + halfWidth + 6;
    doc.setFillColor(254, 249, 195);
    doc.rect(rightX, y, halfWidth, 45, 'F');
    doc.setTextColor(180, 140, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INADIMPLENCIA', rightX + 4, y + 10);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Pendentes:', rightX + 4, y + 22);
    doc.setFont('helvetica', 'bold');
    doc.text(`${churnMetrics.pendingPaymentsCount}`, rightX + 35, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.text('Valor em Aberto:', rightX + 4, y + 32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 140, 0);
    doc.text(formatCurrency(churnMetrics.pendingValue), rightX + 45, y + 32);

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('Taxa:', rightX + 4, y + 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${churnMetrics.defaultRate.toFixed(1)}%`, rightX + 20, y + 42);

    y += 53;

    // === DESPESAS POR CATEGORIA ===
    const expenseCategories = Object.entries(metrics.expensesByCategory);
    if (expenseCategories.length > 0) {
      const catBoxHeight = 15 + Math.ceil(expenseCategories.length / 2) * 12;
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, boxWidth, catBoxHeight, 'F');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DESPESAS POR CATEGORIA', margin + 4, y + 10);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      let catY = y + 22;
      let catCol = 0;

      expenseCategories.forEach(([cat, amount], index) => {
        const catX = catCol === 0 ? margin + 4 : margin + boxWidth / 2;
        doc.setFont('helvetica', 'normal');
        doc.text(`${expenseCategoryLabels[cat] || cat}:`, catX, catY);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(amount), catX + 50, catY);

        catCol++;
        if (catCol >= 2) {
          catCol = 0;
          catY += 12;
        }
      });

      y += catBoxHeight + 8;
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('ConectPro - Dashboard Financeiro', pageWidth / 2, 285, { align: 'center' });

    doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Labels de categoria de despesa
  const expenseCategoryLabels = {
    'infraestrutura': 'Infraestrutura',
    'marketing': 'Marketing',
    'taxas_pagamento': 'Taxas de Pagamento',
    'ferramentas': 'Ferramentas',
    'operacional': 'Operacional',
    'pessoal': 'Pessoal'
  };

  // Cores de categoria de despesa
  const expenseCategoryColors = {
    'infraestrutura': 'bg-blue-500',
    'marketing': 'bg-purple-500',
    'taxas_pagamento': 'bg-orange-500',
    'ferramentas': 'bg-cyan-500',
    'operacional': 'bg-slate-500',
    'pessoal': 'bg-pink-500'
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

  // Mostrar loading enquanto verifica permissões
  if (isLoadingAuth || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

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

        {/* Stats Cards - Design Clean */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <DollarSign className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Faturamento</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {stats.currentMonthRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-xl">
                  <Briefcase className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Profissionais</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.activeProfessionals} <span className="text-sm font-normal text-slate-400">/ {stats.totalProfessionals}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-xl">
                  <Users className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Clientes</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.activeClients} <span className="text-sm font-normal text-slate-400">assinantes</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Planos Pagos</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.paidPlans} <span className="text-sm font-normal text-slate-400">ativos</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Visao Geral</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="indicacoes" className="flex items-center gap-1">
              <Gift className="w-4 h-4" />
              Indicacoes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-8">
              {/* Grid Principal de Métricas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Card Principal - Faturamento */}
                <Card className="lg:row-span-2 border-0 shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-500">Faturamento</span>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Este Mes</p>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.currentMonthRevenue)}</p>
                      </div>

                      <div className="h-px bg-slate-100" />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Total Geral</p>
                          <p className="text-lg font-semibold text-slate-700">{formatCurrency(stats.totalRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Ticket Medio</p>
                          <p className="text-lg font-semibold text-slate-700">{formatCurrency(stats.averageTicket)}</p>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          <span className="text-sm text-slate-500">{stats.completedPayments} processados</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-400 rounded-full" />
                          <span className="text-sm text-slate-500">{stats.pendingPayments} pendentes</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cards de Usuarios */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Briefcase className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Profissionais</span>
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{stats.totalProfessionals}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{stats.activeProfessionals} ativos</span>
                      <span className="text-orange-500 font-medium">{stats.paidPlans} pagos</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${stats.totalProfessionals > 0 ? (stats.paidPlans / stats.totalProfessionals) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Users className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Clientes</span>
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{stats.totalClients}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{stats.activeClients} assinantes</span>
                      <span className="text-orange-500 font-medium">
                        {stats.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${stats.totalClients > 0 ? (stats.activeClients / stats.totalClients) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Cards de Indicações */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <UserPlus className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Indicacoes</span>
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{stats.totalReferrals}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{stats.completedReferrals} completadas</span>
                      <span className="text-orange-500 font-medium">{stats.pendingReferrals} pendentes</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${stats.totalReferrals > 0 ? (stats.completedReferrals / stats.totalReferrals) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Package className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Categorias</span>
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{stats.totalCategories}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{stats.activeCategories} ativas</span>
                      <span className="text-green-500 font-medium">
                        {stats.totalCategories > 0 ? Math.round((stats.activeCategories / stats.totalCategories) * 100) : 0}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${stats.totalCategories > 0 ? (stats.activeCategories / stats.totalCategories) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Seção Inferior */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Acesso Rapido */}
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-slate-700">Acesso Rapido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <button
                      onClick={() => setActiveTab('categories')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Gerenciar Categorias</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                    </button>
                    <button
                      onClick={() => setActiveTab('usuarios')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Ver Usuarios</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                    </button>
                    <button
                      onClick={() => setActiveTab('financial')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Ver Financeiro</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                    </button>
                    <button
                      onClick={() => setActiveTab('referrals')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <Gift className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Ver Indicacoes</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                    </button>
                  </CardContent>
                </Card>

                {/* Metricas de Performance */}
                <Card className="lg:col-span-2 border-0 shadow-sm bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-slate-700">Metricas de Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-800">
                          {stats.totalProfessionals > 0 ? Math.round((stats.paidPlans / stats.totalProfessionals) * 100) : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Conversao Planos</p>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-800">
                          {stats.totalReferrals > 0 ? Math.round((stats.completedReferrals / stats.totalReferrals) * 100) : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Taxa Indicacoes</p>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-800">{stats.totalCreditsAwarded}</p>
                        <p className="text-xs text-slate-500 mt-1">Creditos Dados</p>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <p className="text-2xl font-bold text-slate-800">
                          {stats.totalProfessionals > 0 ? Math.round((stats.activeProfessionals / stats.totalProfessionals) * 100) : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Prof. Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Gerenciar Categorias</CardTitle>
                    <CardDescription>
                      {categories.length} categoria{categories.length !== 1 ? 's' : ''} cadastrada{categories.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar categoria..."
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          setCategoryPage(1);
                        }}
                        className="pl-10"
                      />
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
                </div>
              </CardHeader>
              <CardContent>
                {loadingCategories ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  </div>
                ) : (() => {
                  // Filtrar categorias por busca
                  const filteredCategories = categories.filter(cat =>
                    cat.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
                    cat.slug?.toLowerCase().includes(categorySearch.toLowerCase()) ||
                    cat.category_group?.toLowerCase().includes(categorySearch.toLowerCase())
                  );

                  // Paginação
                  const totalPages = Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE);
                  const startIndex = (categoryPage - 1) * CATEGORIES_PER_PAGE;
                  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + CATEGORIES_PER_PAGE);

                  if (filteredCategories.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">
                          {categorySearch ? 'Nenhuma categoria encontrada com esse termo' : 'Nenhuma categoria cadastrada'}
                        </p>
                        {categorySearch && (
                          <Button
                            variant="link"
                            onClick={() => setCategorySearch('')}
                            className="mt-2 text-orange-500"
                          >
                            Limpar busca
                          </Button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Ordem</TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead>Slug</TableHead>
                              <TableHead>Grupo</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedCategories.map((category, index) => (
                              <TableRow key={category.id}>
                                <TableCell className="font-medium text-slate-500">
                                  {startIndex + index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {category.emoji && <span className="text-xl">{category.emoji}</span>}
                                    <div>
                                      <p className="font-medium">{category.name}</p>
                                      {category.location && (
                                        <p className="text-xs text-slate-500">{category.location}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                  {category.slug}
                                </TableCell>
                                <TableCell>
                                  {category.category_group ? (
                                    <Badge variant="outline">{category.category_group}</Badge>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={category.is_active ? "default" : "secondary"}>
                                    {category.is_active ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                  {category.is_featured && (
                                    <Badge variant="outline" className="ml-1 text-yellow-600 border-yellow-400">
                                      Destaque
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingCategory(category);
                                        setShowCategoryDialog(true);
                                      }}
                                      title="Editar"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setCategoryToDelete(category);
                                        setShowDeleteCategoryDialog(true);
                                      }}
                                      title="Excluir"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Paginação */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                          <p className="text-sm text-slate-500">
                            Mostrando {startIndex + 1} a {Math.min(startIndex + CATEGORIES_PER_PAGE, filteredCategories.length)} de {filteredCategories.length} categorias
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCategoryPage(p => Math.max(1, p - 1))}
                              disabled={categoryPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Anterior
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (categoryPage <= 3) {
                                  pageNum = i + 1;
                                } else if (categoryPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = categoryPage - 2 + i;
                                }
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={categoryPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCategoryPage(pageNum)}
                                    className={categoryPage === pageNum ? "bg-orange-500 hover:bg-orange-600" : ""}
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCategoryPage(p => Math.min(totalPages, p + 1))}
                              disabled={categoryPage === totalPages}
                            >
                              Próximo
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Dialog de Confirmação de Exclusão */}
            <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600">Excluir Categoria</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir a categoria "{categoryToDelete?.name}"? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteCategoryDialog(false);
                      setCategoryToDelete(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (categoryToDelete) {
                        await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
                        setShowDeleteCategoryDialog(false);
                        setCategoryToDelete(null);
                      }
                    }}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    {deleteCategoryMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash className="w-4 h-4 mr-2" />
                        Excluir
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Usuarios Tab */}
          <TabsContent value="usuarios">
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-medium text-slate-700">Gerenciar Usuarios</CardTitle>
                    <CardDescription>Visualize todos os usuarios cadastrados na plataforma</CardDescription>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome, email ou cidade..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingProfiles ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  </div>
                ) : (() => {
                  // Filtrar usuarios por busca
                  const filteredUsers = profiles.filter(user =>
                    user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                    user.city?.toLowerCase().includes(userSearch.toLowerCase())
                  );

                  // Paginação
                  const userTotalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
                  const startIndex = (userPage - 1) * USERS_PER_PAGE;
                  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);

                  if (filteredUsers.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">
                          {userSearch ? 'Nenhum usuario encontrado com esse termo' : 'Nenhum usuario cadastrado'}
                        </p>
                        {userSearch && (
                          <Button
                            variant="link"
                            onClick={() => setUserSearch('')}
                            className="text-orange-500 mt-2"
                          >
                            Limpar busca
                          </Button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Pagante</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Creditos</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead className="text-right">Acoes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.map((user) => {
                            // Buscar dados do profissional se for profissional
                            const prof = user.user_type === 'profissional'
                              ? professionals.find(p => p.user_id === user.id)
                              : null;

                            // Verificar se é pagante
                            const isPaying = user.user_type === 'profissional'
                              ? prof?.plan_type && prof.plan_type !== 'free' && prof.plan_active
                              : user.subscription_active;

                            // Buscar valor do plano
                            const planName = user.user_type === 'profissional'
                              ? prof?.plan_type
                              : user.subscription_active ? 'vitalicio' : null;

                            const planConfig = planName
                              ? planConfigs.find(pc => pc.plan_key?.includes(planName) || pc.name?.toLowerCase().includes(planName))
                              : null;

                            return (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                                <TableCell>{user.phone || '-'}</TableCell>
                                <TableCell>{user.city ? `${user.city}${user.state ? ', ' + user.state : ''}` : '-'}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    user.role === 'admin' ? 'bg-red-500' :
                                    user.user_type === 'profissional' ? 'bg-orange-500' : 'bg-blue-500'
                                  }>
                                    {user.role === 'admin' ? 'Admin' : user.user_type === 'profissional' ? 'Profissional' : 'Cliente'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {isPaying ? (
                                    <Badge className="bg-green-500">Sim</Badge>
                                  ) : (
                                    <Badge variant="secondary">Nao</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {planName ? (
                                    <div className="text-sm">
                                      <span className="font-medium capitalize">{planName}</span>
                                      {planConfig?.price && (
                                        <span className="text-slate-500 ml-1">
                                          (R$ {planConfig.price.toFixed(2).replace('.', ',')})
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    // Créditos centralizados na tabela profiles
                                    const credits = user.referral_credits || 0;
                                    return (
                                      <div className="flex items-center gap-1">
                                        <Gift className="w-4 h-4 text-orange-500" />
                                        <span className={`font-medium ${credits > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                                          {credits}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                  {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(() => {
                                    // Créditos centralizados na tabela profiles
                                    const isProfessional = user.user_type === 'profissional';
                                    const hasProfessionalRecord = isProfessional && prof;
                                    const credits = user.referral_credits || 0;

                                    // Não pode adicionar créditos se:
                                    // 1. É admin
                                    // 2. É profissional sem cadastro completo (sem registro na tabela professionals)
                                    const isAdmin = user.role === 'admin';
                                    const isProfessionalWithoutRecord = isProfessional && !hasProfessionalRecord;
                                    const canAddCredits = !isAdmin && !isProfessionalWithoutRecord;

                                    let disabledReason = '';
                                    if (isAdmin) disabledReason = 'Admin não pode receber créditos';
                                    else if (isProfessionalWithoutRecord) disabledReason = 'Profissional sem cadastro completo';

                                    return (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className={`border-orange-200 text-orange-600 hover:bg-orange-50 ${!canAddCredits ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={() => {
                                          setSelectedReferrer({
                                            id: user.id,
                                            name: user.full_name || 'Usuario',
                                            type: 'client',
                                            credits: credits
                                          });
                                          setCreditAmount(1);
                                          setShowAddCreditDialog(true);
                                        }}
                                        disabled={!canAddCredits}
                                        title={disabledReason || 'Adicionar créditos'}
                                      >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Créditos
                                      </Button>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Paginação */}
                      {userTotalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                          <p className="text-sm text-slate-500">
                            Mostrando {startIndex + 1} a {Math.min(startIndex + USERS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} usuarios
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUserPage(p => Math.max(1, p - 1))}
                              disabled={userPage === 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Anterior
                            </Button>
                            {Array.from({ length: Math.min(5, userTotalPages) }, (_, i) => {
                              let pageNum;
                              if (userTotalPages <= 5) {
                                pageNum = i + 1;
                              } else if (userPage <= 3) {
                                pageNum = i + 1;
                              } else if (userPage >= userTotalPages - 2) {
                                pageNum = userTotalPages - 4 + i;
                              } else {
                                pageNum = userPage - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={userPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setUserPage(pageNum)}
                                  className={userPage === pageNum ? "bg-orange-500 hover:bg-orange-600" : ""}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                              disabled={userPage === userTotalPages}
                            >
                              Proximo
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab - Dashboard Completo */}
          <TabsContent value="financeiro">
            {(() => {
              const financialMetrics = calculateFinancialMetrics();
              const clientMetrics = calculateClientMetrics();
              const churnMetrics = calculateChurnMetrics();

              return (
                <div className="space-y-6">
                  {/* Filtro de Período Global - Design Clean */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-50 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <h2 className="text-base font-semibold text-slate-800">Dashboard Financeiro</h2>
                            <p className="text-slate-500 text-sm">Analise detalhada de receitas, despesas e ROI</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {['este_mes', 'ultimo_mes', '3_meses', 'ano', 'todos'].map((period) => (
                            <Button
                              key={period}
                              size="sm"
                              variant={financialPeriodFilter === period ? 'default' : 'outline'}
                              className={financialPeriodFilter === period
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                              }
                              onClick={() => setFinancialPeriodFilter(period)}
                            >
                              {{
                                'este_mes': 'Este Mes',
                                'ultimo_mes': 'Ultimo Mes',
                                '3_meses': '3 Meses',
                                'ano': 'Ano',
                                'todos': 'Todos'
                              }[period]}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                            onClick={exportFinancialReportCSV}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            CSV
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                            onClick={exportFinancialReportPDF}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECAO 1: VISAO GERAL - Design Clean */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Card className="bg-white border border-slate-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Receita</p>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(financialMetrics.totalRevenue)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 rounded-lg">
                            <MinusCircle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Despesas</p>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(financialMetrics.totalExpenses)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${financialMetrics.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            {financialMetrics.netProfit >= 0 ? (
                              <TrendingUp className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-rose-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Lucro</p>
                            <p className={`text-lg font-bold ${financialMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatCurrency(financialMetrics.netProfit)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-50 rounded-lg">
                            <Percent className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">ROI</p>
                            <p className="text-lg font-bold text-slate-800">{financialMetrics.roi.toFixed(1)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <Receipt className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Ticket</p>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(financialMetrics.averageTicket)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Métricas de Faturamento por Indicação - Design Clean */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-orange-500" />
                        Faturamento por Indicacoes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <p className="text-2xl font-bold text-slate-800">{formatCurrency(financialMetrics.referralRevenue)}</p>
                          <p className="text-xs text-slate-500 mt-1">Receita</p>
                          <p className="text-xs text-slate-400">{financialMetrics.referralPaymentsCount} pagamento(s)</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <p className="text-2xl font-bold text-orange-500">{financialMetrics.referralRevenuePercentage.toFixed(1)}%</p>
                          <p className="text-xs text-slate-500 mt-1">do Total</p>
                          <p className="text-xs text-slate-400">{formatCurrency(financialMetrics.totalRevenue)}</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <p className="text-2xl font-bold text-slate-800">{profiles.filter(p => p.referred_by_code).length}</p>
                          <p className="text-xs text-slate-500 mt-1">Indicados</p>
                          <p className="text-xs text-slate-400">usuarios</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECAO 2: CLIENTES */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-700">
                        <Users className="w-4 h-4 text-slate-500" />
                        Metricas de Clientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-green-600">{clientMetrics.paidProfessionals}</p>
                          <p className="text-sm text-slate-600">Profissionais Pagantes</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-slate-600">{clientMetrics.freeProfessionals}</p>
                          <p className="text-sm text-slate-600">Profissionais Free</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-blue-600">{clientMetrics.activeClientSubs}</p>
                          <p className="text-sm text-slate-600">Clientes Assinantes</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-purple-600">{clientMetrics.conversionRate.toFixed(1)}%</p>
                          <p className="text-sm text-slate-600">Taxa de Conversao</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-slate-600">Novos pagantes no periodo: <strong>{clientMetrics.newPaidProfessionals + clientMetrics.newClientSubs}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-slate-600">Total pagantes: <strong>{clientMetrics.totalPaying}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                          <span className="text-slate-600">Total free: <strong>{clientMetrics.totalFree}</strong></span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECAO 3: CHURN & INADIMPLENCIA */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Churn */}
                    <Card className="bg-white border border-slate-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-700">
                          <TrendingDown className="w-4 h-4 text-slate-500" />
                          Cancelamentos (Churn)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">{churnMetrics.totalCancellations}</p>
                            <p className="text-xs text-slate-600">Total</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-orange-600">{churnMetrics.churnRate.toFixed(1)}%</p>
                            <p className="text-xs text-slate-600">Taxa Churn</p>
                          </div>
                          <div className="bg-rose-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-rose-600">{formatCurrency(churnMetrics.lostMRR)}</p>
                            <p className="text-xs text-slate-600">MRR Perdido</p>
                          </div>
                        </div>
                        {Object.keys(churnMetrics.cancellationReasons).length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">Motivos de Cancelamento:</p>
                            <div className="space-y-1">
                              {Object.entries(churnMetrics.cancellationReasons)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([reason, count]) => (
                                  <div key={reason} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 truncate">{reason}</span>
                                    <Badge variant="outline">{count}</Badge>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Inadimplencia */}
                    <Card className="bg-white border border-slate-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-700">
                          <AlertTriangle className="w-4 h-4 text-slate-500" />
                          Inadimplencia
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-yellow-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-yellow-600">{churnMetrics.pendingPaymentsCount}</p>
                            <p className="text-xs text-slate-600">Pendentes</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-amber-600">{formatCurrency(churnMetrics.pendingValue)}</p>
                            <p className="text-xs text-slate-600">Em Aberto</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-orange-600">{churnMetrics.defaultRate.toFixed(1)}%</p>
                            <p className="text-xs text-slate-600">Taxa</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Aging (dias em aberto):</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(churnMetrics.agingBuckets).map(([bucket, count]) => (
                              <div key={bucket} className="flex justify-between items-center bg-slate-50 rounded px-3 py-2">
                                <span className="text-sm text-slate-600">{bucket}</span>
                                <Badge variant="outline" className={
                                  bucket === '31+ dias' ? 'border-red-500 text-red-600' :
                                  bucket === '16-30 dias' ? 'border-orange-500 text-orange-600' :
                                  'border-slate-300'
                                }>{count}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* SECAO 4: DESPESAS & ROI */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader>
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-700">
                            <Wallet className="w-4 h-4 text-slate-500" />
                            Despesas & ROI
                          </CardTitle>
                          <CardDescription>Gerencie custos para calcular o ROI real</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="border-slate-200" onClick={exportExpensesCSV}>
                            <Download className="w-4 h-4 mr-1" />
                            Exportar
                          </Button>
                          <Button
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={() => {
                              setEditingExpense(null);
                              setShowExpenseDialog(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Nova Despesa
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Resumo por Categoria */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                        {Object.entries(financialMetrics.expensesByCategory).map(([category, amount]) => (
                          <div key={category} className={`${expenseCategoryColors[category]} bg-opacity-10 rounded-lg p-3`}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${expenseCategoryColors[category]}`}></div>
                              <span className="text-xs text-slate-600 truncate">{expenseCategoryLabels[category]}</span>
                            </div>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(amount)}</p>
                          </div>
                        ))}
                        {Object.keys(financialMetrics.expensesByCategory).length === 0 && (
                          <div className="col-span-full text-center text-slate-500 py-4">
                            Nenhuma despesa registrada no periodo
                          </div>
                        )}
                      </div>

                      {/* Tabela de Despesas */}
                      {loadingExpenses ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descricao</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Recorrente</TableHead>
                                <TableHead>Acoes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                const { start, end } = getPeriodDates(financialPeriodFilter);
                                const filteredExpenses = expenses.filter(e => {
                                  if (!start || !end) return true;
                                  const expenseDate = new Date(e.date);
                                  return expenseDate >= start && expenseDate <= end;
                                }).slice(0, 20);

                                if (filteredExpenses.length === 0) {
                                  return (
                                    <TableRow>
                                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                        Nenhuma despesa encontrada no periodo
                                      </TableCell>
                                    </TableRow>
                                  );
                                }

                                return filteredExpenses.map((expense) => (
                                  <TableRow key={expense.id}>
                                    <TableCell>{new Date(expense.date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="font-medium">{expense.description}</TableCell>
                                    <TableCell>
                                      <Badge className={expenseCategoryColors[expense.category]}>
                                        {expenseCategoryLabels[expense.category]}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-red-600">
                                      {formatCurrency(expense.amount)}
                                    </TableCell>
                                    <TableCell>
                                      {expense.is_recurring ? (
                                        <Badge variant="outline" className="border-blue-500 text-blue-600">
                                          <RefreshCw className="w-3 h-3 mr-1" />
                                          {expense.recurring_frequency === 'daily' ? 'Diaria' :
                                           expense.recurring_frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                                        </Badge>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingExpense(expense);
                                            setShowExpenseDialog(true);
                                          }}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-500 hover:text-red-700"
                                          onClick={() => {
                                            if (confirm('Excluir esta despesa?')) {
                                              deleteExpenseMutation.mutate(expense.id);
                                            }
                                          }}
                                        >
                                          <Trash className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ));
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* SECAO 5: TRANSACOES RECENTES */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader>
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-700">
                            <CreditCard className="w-4 h-4 text-slate-500" />
                            Transacoes Recentes
                          </CardTitle>
                          <CardDescription>Historico de pagamentos</CardDescription>
                        </div>
                        <Button onClick={exportPaymentsCSV} variant="outline" className="flex items-center gap-2 border-slate-200">
                          <Download className="w-4 h-4" />
                          Exportar CSV
                        </Button>
                      </div>

                      {/* Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Buscar por nome ou email..."
                            value={paymentSearch}
                            onChange={(e) => setPaymentSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="processed">Processado</SelectItem>
                            <SelectItem value="approved">Aprovado</SelectItem>
                            <SelectItem value="failed">Falhou</SelectItem>
                            <SelectItem value="refunded">Reembolsado</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={paymentPeriodFilter} onValueChange={setPaymentPeriodFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Periodo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todo Periodo</SelectItem>
                            <SelectItem value="today">Hoje</SelectItem>
                            <SelectItem value="7days">Ultimos 7 dias</SelectItem>
                            <SelectItem value="30days">Ultimos 30 dias</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          onClick={() => {
                            setPaymentSearch('');
                            setPaymentStatusFilter('all');
                            setPaymentPeriodFilter('all');
                          }}
                        >
                          <Filter className="w-4 h-4 mr-2" />
                          Limpar Filtros
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {loadingPayments ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Metodo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Acoes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getFilteredPayments().length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                                    Nenhum pagamento encontrado
                                  </TableCell>
                                </TableRow>
                              ) : (
                                getFilteredPayments().slice(0, 30).map((payment) => {
                                  const profile = profiles.find(p => p.id === payment.user_id);
                                  const prof = professionals.find(p => p.user_id === payment.user_id);
                                  const clientName = profile?.full_name || prof?.name || 'N/A';
                                  const clientEmail = profile?.email || prof?.email || payment.payer_email || 'N/A';

                                  return (
                                    <TableRow key={payment.id}>
                                      <TableCell className="text-sm">
                                        {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                                      </TableCell>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium text-sm">{clientName}</p>
                                          <p className="text-xs text-slate-500">{clientEmail}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {payment.plan_type || payment.description || 'N/A'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-semibold text-green-600">
                                        {formatCurrency(payment.total_price || payment.amount)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={`text-xs ${payment.payment_method === 'pix' ? 'bg-teal-500' : 'bg-blue-500'}`}>
                                          {payment.payment_method === 'pix' ? 'PIX' : payment.payment_method === 'credit_card' ? 'Cartao' : payment.payment_method || 'N/A'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={`text-xs ${
                                          payment.status === 'processed' || payment.status === 'approved' ? 'bg-green-500' :
                                          payment.status === 'pending' ? 'bg-yellow-500' :
                                          payment.status === 'failed' ? 'bg-red-500' :
                                          payment.status === 'refunded' ? 'bg-purple-500' : 'bg-slate-500'
                                        }`}>
                                          {payment.status === 'processed' || payment.status === 'approved' ? 'Aprovado' :
                                           payment.status === 'pending' ? 'Pendente' :
                                           payment.status === 'failed' ? 'Falhou' :
                                           payment.status === 'refunded' ? 'Reembolsado' : payment.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedPayment({
                                              ...payment,
                                              clientName,
                                              clientEmail
                                            });
                                            setShowPaymentDialog(true);
                                          }}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                          {getFilteredPayments().length > 30 && (
                            <p className="text-center text-sm text-slate-500 mt-4">
                              Mostrando 30 de {getFilteredPayments().length} resultados
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="indicacoes">
            {/* Stats Cards - Design Clean */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-xl">
                      <UserPlus className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total</p>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.totalReferrals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Completadas</p>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.completedReferrals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pendentes</p>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.pendingReferrals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-xl">
                      <Gift className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Creditos</p>
                      <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.totalCreditsAwarded}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Referrals Table */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Lista de Indicacoes</CardTitle>
                      <CardDescription>Todas as indicacoes do sistema</CardDescription>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Buscar..."
                          value={referralSearch}
                          onChange={(e) => setReferralSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      <Select value={referralStatusFilter} onValueChange={setReferralStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="completed">Completada</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={referralTypeFilter} onValueChange={setReferralTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Tipos</SelectItem>
                          <SelectItem value="professional">Profissional</SelectItem>
                          <SelectItem value="client">Cliente</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setReferralSearch('');
                          setReferralStatusFilter('all');
                          setReferralTypeFilter('all');
                        }}
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Limpar
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {loadingReferrals ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Quem Indicou</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Indicado</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Acoes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredReferrals().length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                  Nenhuma indicacao encontrada
                                </TableCell>
                              </TableRow>
                            ) : (
                              getFilteredReferrals().slice(0, 50).map((referral) => {
                                const referrerType = getReferrerType(referral);
                                const referrer = getReferrerData(referral);
                                const referred = profiles.find(p => p.id === referral.referred_user_id);

                                return (
                                  <TableRow key={referral.id}>
                                    <TableCell>
                                      {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {referrer?.name || referrer?.full_name || 'Desconhecido'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {referrerType === 'professional' ? 'Profissional' : 'Cliente'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {referred?.full_name || 'Desconhecido'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={referral.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
                                        {referral.status === 'completed' ? 'Completada' : 'Pendente'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {referral.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          className="bg-green-500 hover:bg-green-600"
                                          onClick={() => completeReferralMutation.mutate(referral.id)}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Aprovar
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Referrers */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Top Indicadores
                    </CardTitle>
                    <CardDescription>Ranking dos maiores indicadores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingReferrals || loadingProfessionals || loadingProfiles ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getTopReferrers().length === 0 ? (
                          <p className="text-center text-slate-500 py-4">Nenhum indicador encontrado</p>
                        ) : (
                          getTopReferrers().map((referrer, index) => (
                            <div
                              key={`${referrer.type}_${referrer.id}`}
                              className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg"
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-slate-400' :
                                index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{referrer.name}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Badge variant="outline" className="text-xs">
                                    {referrer.type === 'professional' ? 'Prof.' : 'Cliente'}
                                  </Badge>
                                  <span>{referrer.totalReferrals} indicacoes</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-purple-600">{referrer.credits}</p>
                                <p className="text-xs text-slate-500">creditos</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReferrer(referrer);
                                  setCreditAmount(1);
                                  setShowAddCreditDialog(true);
                                }}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
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
                <Label>Grupo da Categoria</Label>
                <Select name="category_group" defaultValue={editingCategory?.category_group || '__none__'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem grupo</SelectItem>
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
                <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)} disabled={savingCategory}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={savingCategory}>
                  {savingCategory ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
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

        {/* Payment Detail Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-xl">Detalhes do Pagamento</DialogTitle>
              <DialogDescription>
                Informacoes completas da transacao
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="py-4 space-y-5">
                {/* Status e Valor em destaque */}
                <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Valor</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedPayment.total_price || selectedPayment.amount)}
                    </p>
                  </div>
                  <Badge className={`text-sm px-3 py-1 ${
                    selectedPayment.status === 'processed' || selectedPayment.status === 'approved' ? 'bg-green-500' :
                    selectedPayment.status === 'pending' ? 'bg-yellow-500' :
                    selectedPayment.status === 'failed' ? 'bg-red-500' : 'bg-slate-500'
                  }`}>
                    {selectedPayment.status === 'processed' || selectedPayment.status === 'approved' ? 'Aprovado' :
                     selectedPayment.status === 'pending' ? 'Pendente' :
                     selectedPayment.status === 'failed' ? 'Falhou' : selectedPayment.status}
                  </Badge>
                </div>

                {/* Informações do Cliente */}
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Cliente</p>
                  <p className="font-semibold text-slate-900">{selectedPayment.clientName}</p>
                  <p className="text-sm text-slate-500">{selectedPayment.clientEmail}</p>
                </div>

                {/* Grid de informações */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Data</p>
                    <p className="font-medium text-slate-900">
                      {new Date(selectedPayment.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(selectedPayment.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Metodo</p>
                    <Badge className={`${selectedPayment.payment_method === 'pix' ? 'bg-teal-500' : 'bg-blue-500'}`}>
                      {selectedPayment.payment_method === 'pix' ? 'PIX' :
                       selectedPayment.payment_method === 'credit_card' ? 'Cartao' :
                       selectedPayment.payment_method || 'N/A'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Plano</p>
                    <p className="font-medium text-slate-900">{selectedPayment.plan_type || selectedPayment.description || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Parcelas</p>
                    <p className="font-medium text-slate-900">{selectedPayment.installments || 1}x</p>
                  </div>
                </div>

                {/* ID da Transação */}
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">ID da Transacao</p>
                  <p className="text-xs font-mono text-slate-600 break-all">
                    {selectedPayment.external_reference || selectedPayment.mp_payment_id || selectedPayment.id}
                  </p>
                </div>
              </div>
            )}
            <div className="pt-4 border-t flex justify-end">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Expense Dialog */}
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
              <DialogDescription>
                {editingExpense ? 'Atualize os dados da despesa' : 'Registre uma nova despesa para calculo de ROI'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <Label>Descricao *</Label>
                <Input
                  name="description"
                  defaultValue={editingExpense?.description}
                  placeholder="Ex: Assinatura Supabase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingExpense?.amount}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input
                    name="date"
                    type="date"
                    defaultValue={editingExpense?.date || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Categoria *</Label>
                <Select name="category" defaultValue={editingExpense?.category || 'operacional'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infraestrutura">Infraestrutura (Supabase, Vercel, dominio)</SelectItem>
                    <SelectItem value="marketing">Marketing (anuncios, influencers)</SelectItem>
                    <SelectItem value="taxas_pagamento">Taxas de Pagamento (MP, Kirvano)</SelectItem>
                    <SelectItem value="ferramentas">Ferramentas (Software, APIs)</SelectItem>
                    <SelectItem value="operacional">Operacional (outros custos)</SelectItem>
                    <SelectItem value="pessoal">Pessoal (salarios, freelancers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observacoes</Label>
                <Textarea
                  name="notes"
                  defaultValue={editingExpense?.notes}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    name="is_recurring"
                    value="true"
                    defaultChecked={editingExpense?.is_recurring}
                    className="w-4 h-4"
                    onChange={(e) => {
                      const freqSelect = document.getElementById('recurring_frequency');
                      if (freqSelect) {
                        freqSelect.disabled = !e.target.checked;
                      }
                    }}
                  />
                  <Label htmlFor="is_recurring" className="flex items-center gap-2 cursor-pointer">
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    Despesa Recorrente
                  </Label>
                </div>
                <div>
                  <Label>Frequencia</Label>
                  <Select
                    name="recurring_frequency"
                    defaultValue={editingExpense?.recurring_frequency || 'monthly'}
                  >
                    <SelectTrigger id="recurring_frequency" disabled={!editingExpense?.is_recurring}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowExpenseDialog(false);
                    setEditingExpense(null);
                  }}
                  disabled={savingExpense}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-500 hover:bg-red-600" disabled={savingExpense}>
                  {savingExpense ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Credit Dialog */}
        <Dialog open={showAddCreditDialog} onOpenChange={setShowAddCreditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Creditos</DialogTitle>
              <DialogDescription>
                Adicione creditos de indicacao manualmente
              </DialogDescription>
            </DialogHeader>
            {selectedReferrer && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <Label className="text-slate-500 text-sm">Indicador</Label>
                  <p className="font-medium text-lg">{selectedReferrer.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedReferrer.type === 'professional' ? 'Profissional' : 'Cliente'}
                  </Badge>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <Label className="text-slate-500 text-sm">Creditos Atuais</Label>
                  <p className="font-bold text-2xl text-orange-600">{selectedReferrer.credits}</p>
                </div>

                <div>
                  <Label>Quantidade de Creditos a Adicionar</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreditAmount(Math.max(1, creditAmount - 1))}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreditAmount(creditAmount + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAddCreditDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      if (!selectedReferrer?.id) {
                        alert('Erro: ID do usuario nao encontrado');
                        return;
                      }

                      // Créditos centralizados na tabela profiles
                      addClientCreditMutation.mutate({
                        id: selectedReferrer.id,
                        credits: creditAmount
                      });
                      setShowAddCreditDialog(false);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar {creditAmount} Credito{creditAmount > 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
