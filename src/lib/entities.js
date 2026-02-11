import { supabase } from './supabase';

// Helper para obter headers de autenticação
const getAuthHeaders = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const headers = {
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json'
  };

  // Buscar token do localStorage
  const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (supabaseKey) {
    try {
      const stored = JSON.parse(localStorage.getItem(supabaseKey));
      if (stored?.access_token) {
        headers['Authorization'] = `Bearer ${stored.access_token}`;
      }
    } catch (e) {
      // Ignorar erro
    }
  }

  return { headers, supabaseUrl };
};

// Generic entity service factory
const createEntityService = (tableName) => ({
  // List records with optional filters (usa fetch direto)
  async list(filters = {}) {
    const { headers, supabaseUrl } = getAuthHeaders();

    // Construir query string para filtros simples
    let queryParams = 'select=*';
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && typeof value !== 'object') {
        queryParams += `&${key}=eq.${value}`;
      }
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?${queryParams}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data || [];
  },

  // Filter records (supports multiple calling conventions)
  // Can be called as:
  // - filter({ filters: {...}, orderBy: {...}, limit: n })
  // - filter({ orderBy: {...}, limit: n }) - config style without filters
  // - filter({ field: value }, '-field', limit) - legacy style
  // - filter({ field: value }) - simple filters
  async filter(filtersOrConfig = {}, orderByStr = null, limitNum = null) {
    let filters = {};
    let orderBy = null;
    let limit = null;
    let offset = null;

    // Detect calling convention - check for known config keys
    const configKeys = ['filters', 'orderBy', 'limit', 'offset'];
    const hasConfigKeys = configKeys.some(key => key in filtersOrConfig);

    if (hasConfigKeys) {
      // New style: { filters, orderBy, limit, offset }
      filters = filtersOrConfig.filters || {};
      orderBy = filtersOrConfig.orderBy;
      limit = filtersOrConfig.limit;
      offset = filtersOrConfig.offset;
    } else {
      // Legacy/simple style: filter({ field: value }, '-field', limit)
      filters = filtersOrConfig;
      if (orderByStr && typeof orderByStr === 'string') {
        const desc = orderByStr.startsWith('-');
        const field = desc ? orderByStr.substring(1) : orderByStr;
        orderBy = { field, direction: desc ? 'desc' : 'asc' };
      }
      if (limitNum && typeof limitNum === 'number') {
        limit = limitNum;
      }
    }

    // Usar fetch direto para maior confiabilidade
    const { headers, supabaseUrl } = getAuthHeaders();

    // Construir query string
    let queryParams = 'select=*';

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams += `&${key}=in.(${value.join(',')})`;
        } else if (typeof value === 'boolean') {
          queryParams += `&${key}=eq.${value}`;
        } else {
          queryParams += `&${key}=eq.${encodeURIComponent(value)}`;
        }
      }
    });

    // Apply ordering
    if (orderBy) {
      const { field, direction = 'asc' } = orderBy;
      queryParams += `&order=${field}.${direction}`;
    }

    // Apply pagination
    if (limit) {
      queryParams += `&limit=${limit}`;
    }
    if (offset) {
      queryParams += `&offset=${offset}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${tableName}?${queryParams}`,
        {
          method: 'GET',
          headers,
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data || [];
    } catch (err) {
      return [];
    }
  },

  // Get single record by ID
  async get(id) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new record
  async create(record) {
    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  // Update record
  async update(id, updates) {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete record
  async delete(id) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Upsert record (insert or update)
  async upsert(record, conflictColumns = ['id']) {
    const { data, error } = await supabase
      .from(tableName)
      .upsert(record, { onConflict: conflictColumns.join(',') })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Count records
  async count(filters = {}) {
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { count, error } = await query;
    if (error) throw error;
    return count;
  }
});

// Entity Services
export const Profile = createEntityService('profiles');
export const Professional = createEntityService('professionals');
export const Category = createEntityService('categories');
export const QuoteRequest = createEntityService('quote_requests');
export const QuoteResponse = createEntityService('quote_responses');
export const Appointment = createEntityService('appointments');
export const Review = createEntityService('reviews');
export const Notification = createEntityService('notifications');
export const Message = createEntityService('messages');
export const Availability = createEntityService('availability');
export const DailyAvailability = createEntityService('daily_availability');
export const PlanConfig = createEntityService('plan_configs');
export const ClientSubscription = createEntityService('client_subscriptions');
export const ContactRequest = createEntityService('contact_requests');
export const SavedSearch = createEntityService('saved_searches');
export const AppContent = createEntityService('app_content');
export const Reminder = createEntityService('reminders');
export const Referral = createEntityService('referrals');
export const Payment = createEntityService('payments');
export const JobOpportunity = createEntityService('job_opportunities');
export const PortfolioItem = createEntityService('portfolio_items');
export const PortfolioPhoto = createEntityService('portfolio_photos');
export const Expense = createEntityService('expenses');
export const QuoteMessage = createEntityService('quote_messages');
export const DirectConversation = createEntityService('direct_conversations');

// Generate unique 8-character referral code
export const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Extended Professional Service with special methods
export const ProfessionalService = {
  ...Professional,

  // Create professional com autenticação via fetch direto
  async createWithAuth(record) {
    // Buscar token do localStorage
    const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    let accessToken = null;
    if (supabaseKey) {
      try {
        const stored = JSON.parse(localStorage.getItem(supabaseKey));
        accessToken = stored?.access_token;
      } catch (e) {
        // Ignorar erro
      }
    }

    if (!accessToken) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/professionals`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(record)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao criar perfil profissional: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data?.[0] || data;
  },

  // Find by slug
  async findBySlug(slug) {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Find by user_id (usa fetch direto para evitar problemas de sessão)
  async findByUserId(userId) {
    if (!userId) return null;

    // Buscar token do localStorage
    const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    let accessToken = null;
    if (supabaseKey) {
      try {
        const stored = JSON.parse(localStorage.getItem(supabaseKey));
        accessToken = stored?.access_token;
      } catch (e) {
        // Ignorar erro
      }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const headers = {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    };

    // Adicionar Authorization se tiver token
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/professionals?user_id=eq.${userId}&select=*`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.[0] || null;
  },

  // Find by referral code
  async findByReferralCode(code) {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('referral_code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Award referral credit to a professional
  async awardReferralCredit(professionalId) {
    const { data: professional, error: fetchError } = await supabase
      .from('professionals')
      .select('referral_credits, total_referrals')
      .eq('id', professionalId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('professionals')
      .update({
        referral_credits: (professional.referral_credits || 0) + 1,
        total_referrals: (professional.total_referrals || 0) + 1
      })
      .eq('id', professionalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Use a referral credit
  async useReferralCredit(professionalId) {
    const { data: professional, error: fetchError } = await supabase
      .from('professionals')
      .select('referral_credits')
      .eq('id', professionalId)
      .single();

    if (fetchError) throw fetchError;

    if ((professional.referral_credits || 0) <= 0) {
      throw new Error('Sem creditos de indicacao disponiveis');
    }

    const { data, error } = await supabase
      .from('professionals')
      .update({
        referral_credits: professional.referral_credits - 1
      })
      .eq('id', professionalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Verificar se profissional pode responder orçamento (via backend)
  async canRespondQuote(professionalId) {
    const { data, error } = await supabase.rpc('can_professional_respond_quote', {
      professional_uuid: professionalId
    });

    if (error) {
      throw error;
    }

    return data;
  },

  // Verificar e expirar planos (chamada manual ou cron)
  async checkPlanExpirations() {
    const { data, error } = await supabase.rpc('check_all_plan_expirations');

    if (error) {
      throw error;
    }

    return data;
  },

  // Search professionals with filters
  async search({ city, state, profession, category, minRating, isApproved = true, featured, limit = 20, offset = 0 }) {
    let query = supabase
      .from('professionals')
      .select('*')
      .eq('is_approved', isApproved)
      .eq('is_blocked', false);

    if (city) query = query.ilike('city', `%${city}%`);
    if (state) query = query.eq('state', state);
    if (profession) query = query.ilike('profession', `%${profession}%`);
    if (category) query = query.ilike('profession', `%${category}%`);
    if (minRating) query = query.gte('rating', minRating);
    if (featured !== undefined) query = query.eq('featured', featured);

    query = query
      .order('ranking_score', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get featured professionals
  async getFeatured(limit = 6) {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('is_approved', true)
      .eq('is_blocked', false)
      .eq('featured', true)
      .order('ranking_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};

// Extended Referral Service
export const ReferralService = {
  ...Referral,

  // Create a new referral
  async createReferral(referrerProfessionalId, referredUserId, referredUserType) {
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_professional_id: referrerProfessionalId,
        referred_user_id: referredUserId,
        referred_user_type: referredUserType,
        status: 'pending',
        credit_awarded: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Complete a referral and award credit
  async completeReferral(referralId) {
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('*, referrer_professional_id')
      .eq('id', referralId)
      .single();

    if (fetchError) throw fetchError;

    if (referral.credit_awarded) {
      return referral;
    }

    // Award credit to referrer
    await ProfessionalService.awardReferralCredit(referral.referrer_professional_id);

    // Update referral status
    const { data, error } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        credit_awarded: true,
        credited_at: new Date().toISOString()
      })
      .eq('id', referralId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get referrals by professional
  async getByProfessional(professionalId) {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// Extended Client Referral Service (para clientes)
export const ClientReferralService = {
  // Find user by referral code (em profiles)
  async findByReferralCode(code) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('referral_code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Award referral credit to a client
  async awardReferralCredit(userId) {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('referral_credits, total_referrals')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        referral_credits: (profile.referral_credits || 0) + 1,
        total_referrals: (profile.total_referrals || 0) + 1
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Use a referral credit
  async useReferralCredit(userId) {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('referral_credits')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    if ((profile.referral_credits || 0) <= 0) {
      throw new Error('Sem creditos de indicacao disponiveis');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        referral_credits: profile.referral_credits - 1
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Create a referral from a client
  async createReferral(referrerUserId, referredUserId, referredUserType) {
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_user_id: referrerUserId,
        referrer_type: 'client',
        referred_user_id: referredUserId,
        referred_user_type: referredUserType,
        status: 'pending',
        credit_awarded: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Complete a client referral and award credit
  async completeReferral(referralId) {
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('*, referrer_user_id')
      .eq('id', referralId)
      .single();

    if (fetchError) throw fetchError;

    if (referral.credit_awarded) {
      return referral;
    }

    // Award credit to referrer (client)
    await this.awardReferralCredit(referral.referrer_user_id);

    // Update referral status
    const { data, error } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        credit_awarded: true,
        credited_at: new Date().toISOString()
      })
      .eq('id', referralId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get referrals by client
  async getByClient(userId) {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// Limites do Portfolio por plano
const PORTFOLIO_LIMITS = {
  FREE: { MAX_PROJECTS: 3, MAX_PHOTOS_PER_PROJECT: 5 },
  PREMIUM: { MAX_PROJECTS: 10, MAX_PHOTOS_PER_PROJECT: 10 }
};

// Extended Portfolio Service
export const PortfolioService = {
  ...PortfolioItem,

  // Obter limites baseado no profissional
  async getLimitsForProfessional(professionalId) {
    const { data: professional, error } = await supabase
      .from('professionals')
      .select('plan_type, plan_active, plan_expires_at')
      .eq('id', professionalId)
      .single();

    if (error || !professional) {
      return PORTFOLIO_LIMITS.FREE;
    }

    const isPremium = professional.plan_active &&
                      professional.plan_type !== 'free' &&
                      professional.plan_type !== null;

    // Verificar se o plano não expirou
    if (isPremium && professional.plan_expires_at) {
      const expiresAt = new Date(professional.plan_expires_at);
      if (expiresAt < new Date()) {
        return PORTFOLIO_LIMITS.FREE;
      }
    }

    return isPremium ? PORTFOLIO_LIMITS.PREMIUM : PORTFOLIO_LIMITS.FREE;
  },

  // Get all portfolio items for a professional with photos
  async getByProfessional(professionalId) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select(`
        *,
        portfolio_photos (*)
      `)
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get single portfolio item with photos
  async getWithPhotos(itemId) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select(`
        *,
        portfolio_photos (*)
      `)
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create portfolio item with photos
  async createWithPhotos(professionalId, { title, description, service_type, project_value, photos = [] }) {
    // Obter limites baseado no plano do profissional
    const limits = await this.getLimitsForProfessional(professionalId);

    // Check project limit
    const count = await this.countByProfessional(professionalId);
    if (count >= limits.MAX_PROJECTS) {
      throw new Error(`Limite máximo de ${limits.MAX_PROJECTS} trabalhos atingido`);
    }

    // Create item
    const { data: item, error: itemError } = await supabase
      .from('portfolio_items')
      .insert({
        professional_id: professionalId,
        title,
        description,
        service_type,
        project_value: project_value || null,
        display_order: count
      })
      .select()
      .single();

    if (itemError) throw itemError;

    // Add photos (respeitando limite do plano)
    if (photos.length > 0) {
      const photosToInsert = photos.slice(0, limits.MAX_PHOTOS_PER_PROJECT).map((url, index) => ({
        portfolio_item_id: item.id,
        photo_url: url,
        display_order: index
      }));

      const { error: photosError } = await supabase
        .from('portfolio_photos')
        .insert(photosToInsert);

      if (photosError) throw photosError;
    }

    return this.getWithPhotos(item.id);
  },

  // Update portfolio item
  async updateItem(itemId, updates) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add photo to portfolio item
  async addPhoto(itemId, photoUrl, caption = '') {
    // Buscar o item para obter o professional_id
    const { data: item, error: itemError } = await supabase
      .from('portfolio_items')
      .select('professional_id')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    // Obter limites baseado no plano do profissional
    const limits = await this.getLimitsForProfessional(item.professional_id);

    // Check photo limit
    const { count } = await supabase
      .from('portfolio_photos')
      .select('*', { count: 'exact', head: true })
      .eq('portfolio_item_id', itemId);

    if (count >= limits.MAX_PHOTOS_PER_PROJECT) {
      throw new Error(`Limite máximo de ${limits.MAX_PHOTOS_PER_PROJECT} fotos por trabalho atingido`);
    }

    const { data, error } = await supabase
      .from('portfolio_photos')
      .insert({
        portfolio_item_id: itemId,
        photo_url: photoUrl,
        caption,
        display_order: count
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove photo
  async removePhoto(photoId) {
    const { error } = await supabase
      .from('portfolio_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
    return true;
  },

  // Delete portfolio item (cascade deletes photos)
  async deleteItem(itemId) {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return true;
  },

  // Count items for a professional
  async countByProfessional(professionalId) {
    const { count, error } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true })
      .eq('professional_id', professionalId)
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  },

  // Count photos for an item
  async countPhotos(itemId) {
    const { count, error } = await supabase
      .from('portfolio_photos')
      .select('*', { count: 'exact', head: true })
      .eq('portfolio_item_id', itemId);

    if (error) throw error;
    return count || 0;
  }
};

// Extended Client Subscription Service
export const ClientSubscriptionService = {
  ...ClientSubscription,

  // Cancelar assinatura (mantem acesso ate expirar)
  async cancelSubscription(subscriptionId, { reason, feedback }) {
    const { data, error } = await supabase
      .from('client_subscriptions')
      .update({
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancellation_feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Verificar se assinatura esta cancelada
  async isCancelled(subscriptionId) {
    const { data, error } = await supabase
      .from('client_subscriptions')
      .select('cancelled_at')
      .eq('id', subscriptionId)
      .single();

    if (error) throw error;
    return data?.cancelled_at !== null;
  },

  // Reativar assinatura cancelada (antes de expirar)
  async reactivateSubscription(subscriptionId) {
    const { data, error } = await supabase
      .from('client_subscriptions')
      .update({
        cancelled_at: null,
        cancellation_reason: null,
        cancellation_feedback: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Buscar assinatura ativa do usuario
  async getActiveSubscription(userId) {
    const { data, error } = await supabase
      .from('client_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }
};

// Extended Professional Plan Service
export const ProfessionalPlanService = {
  // Cancelar plano do profissional (mantem acesso ate expirar)
  async cancelPlan(professionalId, { reason, feedback }) {
    const { data, error } = await supabase
      .from('professionals')
      .update({
        plan_cancelled_at: new Date().toISOString(),
        plan_cancellation_reason: reason,
        plan_cancellation_feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', professionalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Verificar se plano esta cancelado
  async isCancelled(professionalId) {
    const { data, error } = await supabase
      .from('professionals')
      .select('plan_cancelled_at')
      .eq('id', professionalId)
      .single();

    if (error) throw error;
    return data?.plan_cancelled_at !== null;
  },

  // Reativar plano cancelado (antes de expirar)
  async reactivatePlan(professionalId) {
    const { data, error } = await supabase
      .from('professionals')
      .update({
        plan_cancelled_at: null,
        plan_cancellation_reason: null,
        plan_cancellation_feedback: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', professionalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Extended Job Opportunity Service
export const JobOpportunityService = {
  ...JobOpportunity,

  // Criar vaga anônima (sem autenticação)
  async createAnonymous(data) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/job_opportunities`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          ...data,
          is_anonymous: true,
          professional_id: null,
          status: 'active'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao criar vaga: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result?.[0] || result;
  },

  // Get active opportunities with filters
  async getActive({ city, state, profession, limit = 20, offset = 0 }) {
    let query = supabase
      .from('job_opportunities')
      .select('*, professionals(name, photos, rating)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (city) query = query.ilike('city', `%${city}%`);
    if (state && state !== 'all') query = query.eq('state', state);
    if (profession && profession !== 'all') query = query.ilike('profession', `%${profession}%`);

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get opportunities by professional
  async getByProfessional(professionalId) {
    const { data, error } = await supabase
      .from('job_opportunities')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Increment view count
  async incrementViews(opportunityId) {
    const { data, error } = await supabase.rpc('increment_job_views', {
      opportunity_id: opportunityId
    });

    // Fallback if RPC doesn't exist
    if (error) {
      const { data: opp } = await supabase
        .from('job_opportunities')
        .select('views_count')
        .eq('id', opportunityId)
        .single();

      if (opp) {
        await supabase
          .from('job_opportunities')
          .update({ views_count: (opp.views_count || 0) + 1 })
          .eq('id', opportunityId);
      }
    }
  },

  // Mark as filled
  async markAsFilled(opportunityId) {
    const { data, error } = await supabase
      .from('job_opportunities')
      .update({ status: 'filled' })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cancel opportunity
  async cancel(opportunityId) {
    const { data, error } = await supabase
      .from('job_opportunities')
      .update({ status: 'cancelled' })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Job Application (candidaturas a vagas/oportunidades)
export const JobApplication = createEntityService('job_applications');

// Job Application Service - controla candidaturas e limite de contatos
export const JobApplicationService = {
  ...JobApplication,

  // Contar candidaturas do usuario
  async countByUser(userId) {
    const { count, error } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  },

  // Verificar se usuario ja se candidatou a esta vaga
  async hasApplied(userId, jobOpportunityId) {
    const { data, error } = await supabase
      .from('job_applications')
      .select('id')
      .eq('user_id', userId)
      .eq('job_opportunity_id', jobOpportunityId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  // Criar candidatura
  async apply(userId, jobOpportunityId, contactMethod = 'whatsapp') {
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        user_id: userId,
        job_opportunity_id: jobOpportunityId,
        contact_method: contactMethod
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Buscar candidaturas do usuario
  async getByUser(userId) {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, job_opportunities(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Verificar limite de contatos (3 para nao-assinantes)
  async canApply(userId) {
    // Verificar se usuario tem assinatura ativa de profissional
    const { data: professional } = await supabase
      .from('professionals')
      .select('plan_type, plan_active, plan_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    // Se tem plano ativo (nao free), pode candidatar sem limite
    if (professional && professional.plan_type !== 'free' && professional.plan_active) {
      const today = new Date();
      const expiresAt = professional.plan_expires_at ? new Date(professional.plan_expires_at) : null;
      if (!expiresAt || expiresAt > today) {
        return { canApply: true, remaining: 'unlimited', hasSubscription: true };
      }
    }

    // Contar candidaturas
    const count = await this.countByUser(userId);
    const limit = 3;
    const remaining = Math.max(0, limit - count);

    return {
      canApply: count < limit,
      remaining,
      used: count,
      limit,
      hasSubscription: false
    };
  }
};

// Extended Review Service
export const ReviewService = {
  ...Review,

  // Get reviews for a professional
  async getByProfessional(professionalId, { approved = true, limit = 10 } = {}) {
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('professional_id', professionalId);

    if (approved) {
      query = query.eq('is_approved', true);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// Extended Notification Service
export const NotificationService = {
  ...Notification,

  // Get unread notifications count
  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count;
  },

  // Mark all as read
  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  },

  // Get recent notifications
  async getRecent(userId, limit = 10) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};

// Extended Message Service
export const MessageService = {
  ...Message,

  // Get messages for an appointment
  async getByAppointment(appointmentId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get messages with pagination (cursor-based)
  async getByAppointmentPaginated(appointmentId, { limit = 30, cursor = null } = {}) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reverse to get chronological order
    const messages = (data || []).reverse();
    const hasMore = data?.length === limit;
    const nextCursor = data?.length > 0 ? data[data.length - 1].created_at : null;

    return {
      messages,
      hasMore,
      nextCursor
    };
  },

  // Mark messages as read
  async markAsRead(appointmentId, userId) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('appointment_id', appointmentId)
      .neq('sender_id', userId);

    if (error) throw error;
    return true;
  }
};

// Direct Conversation Service (chat without quotes)
export const DirectConversationService = {
  ...DirectConversation,

  // Get or create a direct conversation between client and professional
  async getOrCreate(clientId, professionalId, professionalUserId) {
    // First, check if conversation already exists
    const { data: existing, error: findError } = await supabase
      .from('direct_conversations')
      .select('*')
      .eq('client_id', clientId)
      .eq('professional_id', professionalId)
      .single();

    if (findError && findError.code !== 'PGRST116') throw findError;

    if (existing) {
      return existing;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('direct_conversations')
      .insert({
        client_id: clientId,
        professional_id: professionalId,
        professional_user_id: professionalUserId
      })
      .select()
      .single();

    if (createError) throw createError;
    return newConv;
  },

  // Get all direct conversations for a user
  async getForUser(userId, userType) {
    let query = supabase.from('direct_conversations').select('*');

    // Tratar admin como cliente para fins de conversas
    const isClient = userType === 'cliente' || userType === 'client' || userType === 'admin';

    if (isClient) {
      query = query.eq('client_id', userId);
    } else {
      query = query.eq('professional_user_id', userId);
    }

    const { data, error } = await query.order('last_message_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Update last message timestamp
  async updateLastMessage(conversationId) {
    const { error } = await supabase
      .from('direct_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  },

  // Check if professional has already responded in this conversation
  async hasProfessionalResponded(conversationId, professionalUserId) {
    const { count, error } = await supabase
      .from('quote_messages')
      .select('*', { count: 'exact', head: true })
      .eq('direct_conversation_id', conversationId)
      .eq('sender_id', professionalUserId);

    if (error) throw error;
    return (count || 0) > 0;
  },

  // Mark conversation as professional has paid/responded
  async markProfessionalResponded(conversationId) {
    const { error } = await supabase
      .from('direct_conversations')
      .update({ professional_responded: true })
      .eq('id', conversationId);

    if (error) throw error;
  }
};

// Extended Quote Message Service for chat in quote responses
export const QuoteMessageService = {
  ...QuoteMessage,

  // Get messages for a quote response OR direct conversation
  async getByQuoteResponse(quoteResponseId) {
    const { data, error } = await supabase
      .from('quote_messages')
      .select('*')
      .eq('quote_response_id', quoteResponseId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get messages for a quote response with pagination (cursor-based)
  async getByQuoteResponsePaginated(quoteResponseId, { limit = 30, cursor = null } = {}) {
    let query = supabase
      .from('quote_messages')
      .select('*')
      .eq('quote_response_id', quoteResponseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reverse to get chronological order
    const messages = (data || []).reverse();
    const hasMore = data?.length === limit;
    const nextCursor = data?.length > 0 ? data[data.length - 1].created_at : null;

    return {
      messages,
      hasMore,
      nextCursor
    };
  },

  // Get messages for a direct conversation
  async getByDirectConversation(directConversationId) {
    const { data, error } = await supabase
      .from('quote_messages')
      .select('*')
      .eq('direct_conversation_id', directConversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get messages for a direct conversation with pagination (cursor-based)
  async getByDirectConversationPaginated(directConversationId, { limit = 30, cursor = null } = {}) {
    let query = supabase
      .from('quote_messages')
      .select('*')
      .eq('direct_conversation_id', directConversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Reverse to get chronological order
    const messages = (data || []).reverse();
    const hasMore = data?.length === limit;
    const nextCursor = data?.length > 0 ? data[data.length - 1].created_at : null;

    return {
      messages,
      hasMore,
      nextCursor
    };
  },

  // Mark messages as read (supports both types)
  async markAsRead(conversationId, userId, isDirect = false) {
    const column = isDirect ? 'direct_conversation_id' : 'quote_response_id';
    const { error } = await supabase
      .from('quote_messages')
      .update({ is_read: true })
      .eq(column, conversationId)
      .neq('sender_id', userId);

    if (error) throw error;
    return true;
  },

  // Get unread count for a quote response
  async getUnreadCount(quoteResponseId, userId) {
    const { count, error } = await supabase
      .from('quote_messages')
      .select('*', { count: 'exact', head: true })
      .eq('quote_response_id', quoteResponseId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Get total unread count for a user (across all conversations)
  async getTotalUnreadCount(userId) {
    const { count, error } = await supabase
      .from('quote_messages')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      return 0;
    }
    return count || 0;
  },

  // Get all conversations for a user (client or professional)
  // Includes both quote-based and direct conversations
  async getConversationsForUser(userId, userType) {
    try {
      let allConversations = [];

      // ===== QUOTE-BASED CONVERSATIONS =====
      let quoteResponses = [];

      // Tratar admin como cliente para fins de conversas
      const isClient = userType === 'cliente' || userType === 'client' || userType === 'admin';

      if (isClient) {
        // Cliente/Admin: buscar quote_requests do usuario e depois as responses
        const { data: quoteRequests, error: qrError } = await supabase
          .from('quote_requests')
          .select('id, title, client_id, client_name')
          .eq('client_id', userId);

        if (qrError) throw qrError;

        if (quoteRequests && quoteRequests.length > 0) {
          const quoteRequestIds = quoteRequests.map(qr => qr.id);
          const { data: responses, error: respError } = await supabase
            .from('quote_responses')
            .select('*')
            .in('quote_request_id', quoteRequestIds)
            .order('created_at', { ascending: false });

          if (respError) throw respError;

          // Buscar user_id dos profissionais
          const professionalIds = [...new Set(responses?.map(r => r.professional_id) || [])];
          let professionalsMap = {};
          if (professionalIds.length > 0) {
            const { data: professionals } = await supabase
              .from('professionals')
              .select('id, user_id, name')
              .in('id', professionalIds);

            professionalsMap = (professionals || []).reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }

          // Enriquecer com dados do quote_request e user_id do profissional
          quoteResponses = (responses || []).map(resp => {
            const qr = quoteRequests.find(q => q.id === resp.quote_request_id);
            const prof = professionalsMap[resp.professional_id];
            return {
              ...resp,
              conversation_type: 'quote',
              quote_request_title: qr?.title,
              other_user_name: resp.professional_name || prof?.name,
              other_user_id: prof?.user_id || resp.professional_id
            };
          });
        }
      } else {
        // Profissional: buscar responses do profissional
        const { data: professional, error: profError } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (profError && profError.code !== 'PGRST116') throw profError;

        if (professional) {
          const { data: responses, error: respError } = await supabase
            .from('quote_responses')
            .select('*')
            .eq('professional_id', professional.id)
            .order('created_at', { ascending: false });

          if (respError) throw respError;

          // Buscar titulos dos quote_requests
          if (responses && responses.length > 0) {
            const quoteRequestIds = [...new Set(responses.map(r => r.quote_request_id))];
            const { data: quoteRequests } = await supabase
              .from('quote_requests')
              .select('id, title, client_id, client_name')
              .in('id', quoteRequestIds);

            quoteResponses = responses.map(resp => {
              const qr = quoteRequests?.find(q => q.id === resp.quote_request_id);
              return {
                ...resp,
                conversation_type: 'quote',
                quote_request_title: qr?.title,
                other_user_name: qr?.client_name || 'Cliente',
                other_user_id: qr?.client_id
              };
            });
          }
        }
      }

      // Para cada conversa de orcamento, buscar ultima mensagem e contagem de nao lidas
      const quoteConvsWithMessages = await Promise.all(
        quoteResponses.map(async (resp) => {
          const { data: lastMessages } = await supabase
            .from('quote_messages')
            .select('*')
            .eq('quote_response_id', resp.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from('quote_messages')
            .select('*', { count: 'exact', head: true })
            .eq('quote_response_id', resp.id)
            .neq('sender_id', userId)
            .eq('is_read', false);

          return {
            ...resp,
            last_message: lastMessages?.[0] || null,
            unread_count: unreadCount || 0
          };
        })
      );

      allConversations = [...quoteConvsWithMessages];

      // ===== DIRECT CONVERSATIONS =====
      let directConvs = [];
      if (isClient) {
        const { data, error } = await supabase
          .from('direct_conversations')
          .select('*, professionals(id, name, user_id, photos)')
          .eq('client_id', userId);

        if (!error && data) {
          directConvs = data.map(dc => ({
            id: dc.id,
            conversation_type: 'direct',
            other_user_name: dc.professionals?.name || 'Profissional',
            other_user_id: dc.professional_user_id,
            professional_id: dc.professional_id,
            created_at: dc.created_at
          }));
        }
      } else {
        // Profissional
        const { data, error } = await supabase
          .from('direct_conversations')
          .select('*, profiles:client_id(id, full_name)')
          .eq('professional_user_id', userId);

        if (!error && data) {
          directConvs = data.map(dc => ({
            id: dc.id,
            conversation_type: 'direct',
            other_user_name: dc.profiles?.full_name || 'Cliente',
            other_user_id: dc.client_id,
            created_at: dc.created_at
          }));
        }
      }

      // Para cada conversa direta, buscar ultima mensagem e contagem de nao lidas
      const directConvsWithMessages = await Promise.all(
        directConvs.map(async (dc) => {
          const { data: lastMessages } = await supabase
            .from('quote_messages')
            .select('*')
            .eq('direct_conversation_id', dc.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from('quote_messages')
            .select('*', { count: 'exact', head: true })
            .eq('direct_conversation_id', dc.id)
            .neq('sender_id', userId)
            .eq('is_read', false);

          return {
            ...dc,
            last_message: lastMessages?.[0] || null,
            unread_count: unreadCount || 0
          };
        })
      );

      allConversations = [...allConversations, ...directConvsWithMessages];

      // Ordenar todas por ultima mensagem (mais recente primeiro)
      return allConversations.sort((a, b) => {
        const dateA = a.last_message?.created_at || a.created_at;
        const dateB = b.last_message?.created_at || b.created_at;
        return new Date(dateB) - new Date(dateA);
      });
    } catch (error) {
      return [];
    }
  }
};

// Credit Transaction Entity
export const CreditTransaction = createEntityService('credit_transactions');

// Credits Service - gerencia creditos dos profissionais
export const CreditsService = {
  // Retorna status completo de creditos do profissional
  async getStatus(professionalId) {
    const { data, error } = await supabase.rpc('check_professional_credits', {
      professional_uuid: professionalId
    });

    if (error) {
      // Fallback: buscar dados diretamente
      const { data: prof } = await supabase
        .from('professionals')
        .select('credits_balance, unlimited_credits, unlimited_credits_expires_at, referral_credits')
        .eq('id', professionalId)
        .single();

      if (!prof) {
        return {
          can_respond: false,
          credits_balance: 0,
          has_unlimited: false,
          reason: 'Profissional nao encontrado'
        };
      }

      // Verificar creditos infinitos
      const hasUnlimited = prof.unlimited_credits &&
        (!prof.unlimited_credits_expires_at ||
         new Date(prof.unlimited_credits_expires_at) > new Date());

      if (hasUnlimited) {
        return {
          can_respond: true,
          credits_balance: prof.credits_balance || 0,
          has_unlimited: true,
          unlimited_expires_at: prof.unlimited_credits_expires_at,
          reason: 'Creditos infinitos ativos'
        };
      }

      // Verificar creditos avulsos
      if ((prof.credits_balance || 0) > 0) {
        return {
          can_respond: true,
          credits_balance: prof.credits_balance,
          has_unlimited: false,
          reason: 'Creditos avulsos disponiveis'
        };
      }

      // Verificar creditos de indicacao
      if ((prof.referral_credits || 0) > 0) {
        return {
          can_respond: true,
          credits_balance: 0,
          has_unlimited: false,
          referral_credits: prof.referral_credits,
          reason: 'Creditos de indicacao disponiveis'
        };
      }

      return {
        can_respond: false,
        credits_balance: 0,
        has_unlimited: false,
        reason: 'Sem creditos disponiveis'
      };
    }

    return data;
  },

  // Verifica se profissional pode responder cotacao
  async canRespond(professionalId) {
    const status = await this.getStatus(professionalId);
    return status.can_respond;
  },

  // Usa 1 credito (chamado ao responder cotacao)
  async useCredit(professionalId, quoteResponseId = null) {
    const { data, error } = await supabase.rpc('use_professional_credit', {
      professional_uuid: professionalId,
      quote_response_uuid: quoteResponseId
    });

    if (error) {
      throw new Error(error.message || 'Erro ao usar credito');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao usar credito');
    }

    return data;
  },

  // Adiciona creditos avulsos (admin)
  async addCredits(professionalId, amount, reason, adminId) {
    const { data, error } = await supabase.rpc('admin_add_credits', {
      professional_uuid: professionalId,
      credit_amount: amount,
      reason_text: reason,
      admin_uuid: adminId
    });

    if (error) {
      throw new Error(error.message || 'Erro ao adicionar creditos');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao adicionar creditos');
    }

    return data;
  },

  // Libera creditos infinitos (admin)
  async grantUnlimited(professionalId, expiresAt, reason, adminId) {
    const { data, error } = await supabase.rpc('admin_grant_unlimited_credits', {
      professional_uuid: professionalId,
      expires_at_date: expiresAt,
      reason_text: reason,
      admin_uuid: adminId
    });

    if (error) {
      throw new Error(error.message || 'Erro ao liberar creditos infinitos');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao liberar creditos infinitos');
    }

    return data;
  },

  // Remove creditos infinitos (admin)
  async revokeUnlimited(professionalId, reason, adminId) {
    const { data, error } = await supabase.rpc('admin_revoke_unlimited_credits', {
      professional_uuid: professionalId,
      reason_text: reason,
      admin_uuid: adminId
    });

    if (error) {
      throw new Error(error.message || 'Erro ao revogar creditos infinitos');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao revogar creditos infinitos');
    }

    return data;
  },

  // Busca historico de transacoes
  async getTransactions(professionalId, limit = 50) {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  },

  // Busca todas as transacoes (admin)
  async getAllTransactions(limit = 100) {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select(`
        *,
        professionals:professional_id (id, name, profession, city)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  },

  // ========== FUNCOES PARA CLIENTES ==========

  // Retorna status completo de creditos do cliente
  async getClientStatus(clientId) {
    const { data, error } = await supabase.rpc('check_client_credits', {
      client_uuid: clientId
    });

    if (error) {
      // Fallback: buscar dados diretamente
      const { data: client } = await supabase
        .from('profiles')
        .select('credits_balance, unlimited_credits, unlimited_credits_expires_at, referral_credits')
        .eq('id', clientId)
        .single();

      if (!client) {
        return {
          can_use: false,
          credits_balance: 0,
          has_unlimited: false,
          reason: 'Cliente nao encontrado'
        };
      }

      const hasUnlimited = client.unlimited_credits &&
        (!client.unlimited_credits_expires_at ||
         new Date(client.unlimited_credits_expires_at) > new Date());

      if (hasUnlimited) {
        return {
          can_use: true,
          credits_balance: client.credits_balance || 0,
          has_unlimited: true,
          unlimited_expires_at: client.unlimited_credits_expires_at,
          referral_credits: client.referral_credits || 0,
          reason: 'Creditos infinitos ativos'
        };
      }

      if ((client.credits_balance || 0) > 0) {
        return {
          can_use: true,
          credits_balance: client.credits_balance,
          has_unlimited: false,
          referral_credits: client.referral_credits || 0,
          reason: 'Creditos avulsos disponiveis'
        };
      }

      if ((client.referral_credits || 0) > 0) {
        return {
          can_use: true,
          credits_balance: 0,
          has_unlimited: false,
          referral_credits: client.referral_credits,
          reason: 'Creditos de indicacao disponiveis'
        };
      }

      return {
        can_use: false,
        credits_balance: 0,
        has_unlimited: false,
        referral_credits: 0,
        reason: 'Sem creditos disponiveis'
      };
    }

    return data;
  },

  // Adiciona creditos avulsos a cliente (admin)
  async addClientCredits(clientId, amount, reason, adminId) {
    const { data, error } = await supabase.rpc('admin_add_client_credits', {
      client_uuid: clientId,
      credit_amount: amount,
      reason_text: reason,
      admin_uuid: adminId
    });

    if (error) {
      throw new Error(error.message || 'Erro ao adicionar creditos');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao adicionar creditos');
    }

    return data;
  },

  // Libera creditos infinitos a cliente (admin)
  async grantClientUnlimited(clientId, expiresAt, reason, adminId) {
    const { data, error } = await supabase.rpc('admin_grant_client_unlimited', {
      client_uuid: clientId,
      expires_at_date: expiresAt,
      reason_text: reason,
      admin_uuid: adminId
    });

    if (error) {
      throw new Error(error.message || 'Erro ao liberar creditos infinitos');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao liberar creditos infinitos');
    }

    return data;
  },

  // Remove creditos infinitos de cliente (admin)
  async revokeClientUnlimited(clientId, reason, adminId) {
    const { data, error } = await supabase.rpc('admin_revoke_client_unlimited', {
      client_uuid: clientId,
      reason_text: reason,
      admin_uuid: adminId
    });

    if (error) {
      throw new Error(error.message || 'Erro ao revogar creditos infinitos');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao revogar creditos infinitos');
    }

    return data;
  },

  // Busca historico de transacoes do cliente
  async getClientTransactions(clientId, limit = 50) {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', clientId)
      .eq('user_type', 'client')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  },

  // Busca todas as transacoes de clientes (admin)
  async getAllClientTransactions(limit = 100) {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_type', 'client')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }
};

// Extended Availability Service
export const AvailabilityService = {
  ...Availability,

  // Get weekly availability for a professional
  async getWeeklyAvailability(professionalId) {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('professional_id', professionalId)
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Set weekly availability (upsert all days)
  async setWeeklyAvailability(professionalId, availabilityData) {
    const records = availabilityData.map(day => ({
      professional_id: professionalId,
      ...day
    }));

    const { data, error } = await supabase
      .from('availability')
      .upsert(records, { onConflict: 'professional_id,day_of_week' })
      .select();

    if (error) throw error;
    return data;
  }
};

// Extended DailyAvailability Service
export const DailyAvailabilityService = {
  ...DailyAvailability,

  // Get availability for date range
  async getDateRange(professionalId, startDate, endDate) {
    const { data, error } = await supabase
      .from('daily_availability')
      .select('*')
      .eq('professional_id', professionalId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  }
};

// User/Profile related to auth
export const User = {
  // Get user profile
  async get(userId) {
    if (!userId) return null;

    const { headers, supabaseUrl } = getAuthHeaders();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers,
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { id: userId };
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return { id: userId };
      }

      return data[0];
    } catch (err) {
      // Retornar objeto básico em vez de null para evitar loops infinitos
      return { id: userId };
    }
  },

  // Update user profile (INSERT se não existir, UPDATE se existir)
  async update(userId, updates) {
    if (!userId) throw new Error('userId is required');

    // Buscar token do localStorage
    const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    let accessToken = null;
    if (supabaseKey) {
      try {
        const stored = JSON.parse(localStorage.getItem(supabaseKey));
        accessToken = stored?.access_token;
      } catch (e) {
        // Ignorar erro
      }
    }

    if (!accessToken) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Primeiro verificar se o profile existe
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const existingData = await checkResponse.json();
    const profileExists = existingData && existingData.length > 0;

    let response;
    if (profileExists) {
      // UPDATE
      response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            ...updates,
            updated_at: new Date().toISOString()
          })
        }
      );
    } else {
      // INSERT
      response = await fetch(
        `${supabaseUrl}/rest/v1/profiles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            id: userId,
            ...updates,
            updated_at: new Date().toISOString()
          })
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao salvar perfil: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data?.[0] || data;
  }
};

// Pricing Plans Entity (pacotes de créditos e assinaturas)
export const PricingPlan = createEntityService('pricing_plans');

// Pricing Plan Service - métodos estendidos
export const PricingPlanService = {
  ...PricingPlan,

  // Buscar pacotes de créditos ativos
  async getCreditPackages() {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_type', 'credits')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Buscar plano de assinatura ativo
  async getSubscriptionPlan() {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_type', 'subscription')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  // Buscar todos os planos ativos
  async getAllActivePlans() {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Buscar plano por plan_key
  async getByPlanKey(planKey) {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_key', planKey)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }
};

// Discount Coupons Entity
export const DiscountCoupon = createEntityService('discount_coupons');

// Discount Coupon Service - métodos estendidos
export const DiscountCouponService = {
  ...DiscountCoupon,

  // Validar cupom
  async validate(code, planKey, originalPrice) {
    const { data, error } = await supabase.rpc('validate_coupon', {
      coupon_code: code,
      plan_key_param: planKey,
      original_price_param: originalPrice
    });

    if (error) {
      throw new Error(error.message || 'Erro ao validar cupom');
    }

    return data;
  },

  // Buscar todos os cupons (admin)
  async getAllCoupons() {
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buscar estatísticas de um cupom
  async getCouponStats(couponId) {
    const { data: usages, error } = await supabase
      .from('coupon_usages')
      .select('*')
      .eq('coupon_id', couponId);

    if (error) throw error;

    const totalUses = usages?.length || 0;
    const totalDiscount = usages?.reduce((sum, u) => sum + (parseFloat(u.discount_applied) || 0), 0) || 0;
    const totalRevenue = usages?.reduce((sum, u) => sum + (parseFloat(u.final_price) || 0), 0) || 0;

    return {
      totalUses,
      totalDiscount,
      totalRevenue,
      usages: usages || []
    };
  },

  // Buscar cupom por código
  async getByCode(code) {
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .ilike('code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }
};

// Coupon Usages Entity
export const CouponUsage = createEntityService('coupon_usages');

// Coupon Usage Service
export const CouponUsageService = {
  ...CouponUsage,

  // Buscar usos de um cupom
  async getByCoupon(couponId) {
    const { data, error } = await supabase
      .from('coupon_usages')
      .select('*, profiles:user_id(full_name, email)')
      .eq('coupon_id', couponId)
      .order('used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buscar usos de um usuário
  async getByUser(userId) {
    const { data, error } = await supabase
      .from('coupon_usages')
      .select('*, discount_coupons:coupon_id(code, description)')
      .eq('user_id', userId)
      .order('used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// Promotional Rules - Regras promocionais configuráveis pelo admin
export const PromotionalRule = createEntityService('promotional_rules');

export const PromotionalRuleUsage = createEntityService('promotional_rule_usages');

export const PromotionalRuleService = {
  ...PromotionalRule,

  // Buscar todas as regras (admin)
  async getAllRules() {
    const { data, error } = await supabase
      .from('promotional_rules')
      .select('*')
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buscar regras ativas
  async getActiveRules(triggerType = null) {
    let query = supabase
      .from('promotional_rules')
      .select('*')
      .eq('is_active', true)
      .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`);

    if (triggerType) {
      query = query.eq('trigger_type', triggerType);
    }

    const { data, error } = await query.order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Aplicar regras promocionais para um usuário
  async applyRules(userId, professionalId = null, triggerType = 'new_professional_signup') {
    const { data, error } = await supabase.rpc('apply_promotional_rules', {
      p_user_id: userId,
      p_professional_id: professionalId,
      p_trigger_type: triggerType
    });

    if (error) throw error;
    return data || [];
  },

  // Buscar estatísticas de uma regra
  async getRuleStats(ruleId) {
    const { data, error } = await supabase
      .from('promotional_rule_usages')
      .select('*, profiles:user_id(full_name, email)')
      .eq('rule_id', ruleId)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buscar regras aplicadas a um usuário
  async getUserRules(userId) {
    const { data, error } = await supabase
      .from('promotional_rule_usages')
      .select('*, promotional_rules:rule_id(*)')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

export default {
  Profile,
  Professional,
  ProfessionalService,
  ProfessionalPlanService,
  Category,
  QuoteRequest,
  QuoteResponse,
  Appointment,
  Review,
  ReviewService,
  Notification,
  NotificationService,
  Message,
  MessageService,
  Availability,
  AvailabilityService,
  DailyAvailability,
  DailyAvailabilityService,
  PlanConfig,
  ClientSubscription,
  ClientSubscriptionService,
  ContactRequest,
  SavedSearch,
  AppContent,
  Reminder,
  Referral,
  ReferralService,
  ClientReferralService,
  Payment,
  generateReferralCode,
  JobOpportunity,
  JobOpportunityService,
  JobApplication,
  JobApplicationService,
  PortfolioItem,
  PortfolioPhoto,
  PortfolioService,
  Expense,
  User,
  QuoteMessage,
  QuoteMessageService,
  DirectConversation,
  DirectConversationService,
  CreditTransaction,
  CreditsService,
  PricingPlan,
  PricingPlanService,
  DiscountCoupon,
  DiscountCouponService,
  CouponUsage,
  CouponUsageService,
  PromotionalRule,
  PromotionalRuleService,
  PromotionalRuleUsage
};
