import { supabase } from './supabase';

// Generic entity service factory
const createEntityService = (tableName) => ({
  // List records with optional filters
  async list(filters = {}) {
    let query = supabase.from(tableName).select('*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value.operator) {
          // Support for operators like { operator: 'gte', value: 5 }
          switch (value.operator) {
            case 'gte':
              query = query.gte(key, value.value);
              break;
            case 'lte':
              query = query.lte(key, value.value);
              break;
            case 'gt':
              query = query.gt(key, value.value);
              break;
            case 'lt':
              query = query.lt(key, value.value);
              break;
            case 'like':
              query = query.like(key, value.value);
              break;
            case 'ilike':
              query = query.ilike(key, value.value);
              break;
            case 'neq':
              query = query.neq(key, value.value);
              break;
            default:
              query = query.eq(key, value.value);
          }
        } else {
          query = query.eq(key, value);
        }
      }
    });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Filter records (supports multiple calling conventions)
  // Can be called as:
  // - filter({ filters: {...}, orderBy: {...}, limit: n })
  // - filter({ field: value }, '-field', limit) - legacy style
  // - filter({ field: value }) - simple filters
  async filter(filtersOrConfig = {}, orderByStr = null, limitNum = null) {
    let filters = {};
    let orderBy = null;
    let limit = null;
    let offset = null;

    // Detect calling convention
    if (filtersOrConfig.filters !== undefined) {
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

    let query = supabase.from(tableName).select('*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply ordering
    if (orderBy) {
      const { field, direction = 'asc' } = orderBy;
      query = query.order(field, { ascending: direction === 'asc' });
    }

    // Apply pagination
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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

    if (error) throw error;
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
export const SiteText = createEntityService('site_texts');
export const AppContent = createEntityService('app_content');
export const Reminder = createEntityService('reminders');
export const Referral = createEntityService('referrals');
export const JobOpportunity = createEntityService('job_opportunities');

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

  // Find by user_id
  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
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

// Extended Job Opportunity Service
export const JobOpportunityService = {
  ...JobOpportunity,

  // Get active opportunities with filters
  async getActive({ city, state, profession, limit = 20, offset = 0 }) {
    let query = supabase
      .from('job_opportunities')
      .select('*, professionals(name, photos, rating)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (city) query = query.ilike('city', `%${city}%`);
    if (state) query = query.eq('state', state);
    if (profession) query = query.ilike('profession', `%${profession}%`);

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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update user profile
  async update(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export default {
  Profile,
  Professional,
  ProfessionalService,
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
  ContactRequest,
  SavedSearch,
  SiteText,
  AppContent,
  Reminder,
  Referral,
  ReferralService,
  generateReferralCode,
  JobOpportunity,
  JobOpportunityService,
  User
};
