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
  User
};
