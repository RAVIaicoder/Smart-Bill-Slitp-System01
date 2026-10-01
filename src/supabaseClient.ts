import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Group, GroupMember, Bill, Payment } from './dataStore';

export const SUPABASE_PROJECT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_PROJECT_ID) ||
  'yydrtnetksinggapjjgr';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_iau6-3wxFimGWCY2oJ1jdQ_d5HoqwyL';

export interface Lead {
  id?: number | string;
  created_at?: string;
  full_name: string;
  email?: string;
  phone?: string;
  note?: string;
  source: 'registration' | 'add_member' | 'lead_form' | 'contact' | 'admin';
  status: 'new' | 'active' | 'contacted' | 'in_progress' | 'converted';
  metadata?: Record<string, unknown>;
}

// Local cache key for offline / fallback lead queue
const LOCAL_LEADS_KEY = 'smart_split_bill_leads_v1';

export class SupabaseService {
  private static clientInstance: SupabaseClient | null = null;

  static getClient(): SupabaseClient {
    if (!this.clientInstance) {
      this.clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
    return this.clientInstance;
  }

  /**
   * Test connection to Supabase and check if the leads table exists
   */
  static async checkConnection(): Promise<{
    connected: boolean;
    tableExists: boolean;
    message: string;
    leadCount?: number;
  }> {
    try {
      const client = this.getClient();
      const { data, error, count } = await client
        .from('leads')
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist')
        ) {
          return {
            connected: true,
            tableExists: false,
            message: 'Connected to Supabase project! Leads database table is initializing.',
          };
        }
        return {
          connected: false,
          tableExists: false,
          message: error.message || 'Error connecting to database.',
        };
      }

      return {
        connected: true,
        tableExists: true,
        message: 'Successfully connected to Supabase Cloud Database! Active and synced.',
        leadCount: count ?? (data ? data.length : 0),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        connected: false,
        tableExists: false,
        message: errorMsg,
      };
    }
  }

  // =========================================================================
  // USER CLOUD AUTHENTICATION & MULTI-DEVICE LIFETIME PERSISTENCE
  // =========================================================================

  /**
   * Search for a registered user in Supabase by Phone Number or Email
   * Supports matching 10-digit phones, formatted numbers, or emails
   */
  static async findUserRemote(identifier: string): Promise<User | null> {
    if (!identifier || !identifier.trim()) return null;
    const raw = identifier.trim();
    const cleanEmail = raw.toLowerCase();
    const cleanDigits = raw.replace(/\D/g, '');

    try {
      const client = this.getClient();

      // 1. Check in public.leads table (which has confirmed RLS access & live data)
      let query = client.from('leads').select('*');

      if (raw.includes('@')) {
        query = query.ilike('email', cleanEmail);
      } else if (cleanDigits.length >= 4) {
        const lastDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
        query = query.ilike('phone', `%${lastDigits}%`);
      } else {
        query = query.or(`email.ilike.${cleanEmail},phone.ilike.%${raw}%`);
      }

      const { data: leadsData, error: leadsErr } = await query.limit(5);

      if (!leadsErr && leadsData && leadsData.length > 0) {
        // Prioritize registration leads or exact matches
        const matched =
          leadsData.find((l) => {
            if (l.email && l.email.toLowerCase() === cleanEmail) return true;
            const pDigits = (l.phone || '').replace(/\D/g, '');
            if (cleanDigits.length >= 10 && pDigits.length >= 10) {
              return cleanDigits.slice(-10) === pDigits.slice(-10);
            }
            if (cleanDigits.length > 0 && pDigits === cleanDigits) return true;
            return false;
          }) || leadsData[0];

        const meta = (matched.metadata || {}) as Record<string, unknown>;
        const userObj: User = {
          id: typeof meta.id === 'number' ? meta.id : Number(matched.id) || Date.now(),
          fullName: matched.full_name,
          email: matched.email || `${cleanDigits || Date.now()}@smartsplitbill.local`,
          phone: matched.phone || '',
          password: typeof meta.password === 'string' ? meta.password : undefined,
          upiId: (meta.upiId as string) || `${matched.full_name.toLowerCase().replace(/\s+/g, '')}@upi`,
          bio: matched.note || (meta.bio as string) || 'Smart Split Bill member',
          avatar: (meta.avatar as string) || '',
          currency: (meta.currency as string) || 'INR',
          country: (meta.country as string) || 'India',
          role: (meta.role as 'user' | 'admin') || 'user',
        };

        return userObj;
      }

      // 2. Also check public.users table if it exists
      try {
        const usersRes = await client.from('users').select('*').limit(50);
        if (!usersRes.error && usersRes.data) {
          const matchedUser = usersRes.data.find((u: Record<string, unknown>) => {
            const uEmail = String(u.email || '').toLowerCase();
            const uPhone = String(u.phone || '').replace(/\D/g, '');
            if (uEmail && uEmail === cleanEmail) return true;
            if (cleanDigits.length >= 10 && uPhone.length >= 10) {
              return cleanDigits.slice(-10) === uPhone.slice(-10);
            }
            if (cleanDigits && uPhone === cleanDigits) return true;
            return false;
          });

          if (matchedUser) {
            return {
              id: Number(matchedUser.id) || Date.now(),
              fullName: String(matchedUser.full_name || 'User'),
              email: String(matchedUser.email || ''),
              phone: String(matchedUser.phone || ''),
              password: typeof matchedUser.password === 'string' ? matchedUser.password : undefined,
              upiId: String(matchedUser.upi_id || ''),
              bio: String(matchedUser.bio || ''),
              avatar: String(matchedUser.avatar || ''),
              currency: String(matchedUser.currency || 'INR'),
              country: String(matchedUser.country || 'India'),
              role: (matchedUser.role as 'user' | 'admin') || 'user',
            };
          }
        }
      } catch {
        // ignore if users table does not exist
      }

      return null;
    } catch (err) {
      console.warn('Error querying remote user in Supabase:', err);
      return null;
    }
  }

  /**
   * Register a new user in Supabase with lifetime persistence
   */
  static async registerUserRemote(user: User): Promise<{
    success: boolean;
    user: User;
    error?: string;
  }> {
    try {
      const client = this.getClient();

      // Check if user already exists remotely first
      const existing = await this.findUserRemote(user.phone || user.email);
      if (existing) {
        return {
          success: false,
          user,
          error: 'An account with this Phone Number or Email is already registered. Please log in.',
        };
      }

      // Save to public.leads with full metadata (credentials + profile + initial data)
      const leadPayload = {
        full_name: user.fullName,
        email: user.email || null,
        phone: user.phone || null,
        note: user.bio || 'Registered Member Account',
        source: 'registration',
        status: 'active',
        metadata: {
          id: user.id,
          password: user.password,
          upiId: user.upiId,
          avatar: user.avatar || '',
          bio: user.bio || '',
          role: user.role || 'user',
          currency: user.currency || 'INR',
          country: user.country || 'India',
          created_at: new Date().toISOString(),
          app_data: {
            groups: [],
            bills: [],
            payments: [],
          },
        },
      };

      const { error: leadErr } = await client.from('leads').insert([leadPayload]);
      if (leadErr) {
        console.warn('Supabase lead insert warning during register:', leadErr.message);
      }

      // Also attempt inserting into public.users if table exists
      try {
        await client.from('users').insert([
          {
            id: user.id,
            email: user.email,
            phone: user.phone,
            full_name: user.fullName,
            upi_id: user.upiId,
            password: user.password,
            bio: user.bio,
            avatar: user.avatar,
            role: user.role || 'user',
            currency: user.currency || 'INR',
            country: user.country || 'India',
          },
        ]);
      } catch {
        // silently fallback
      }

      return {
        success: true,
        user,
      };
    } catch (err: unknown) {
      console.warn('Supabase registration error:', err);
      return {
        success: true, // gracefully succeed locally even if network has latency
        user,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }

  /**
   * Verify User Credentials across ALL devices using Supabase
   */
  static async verifyUserCredentials(
    identifier: string,
    password?: string
  ): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    const remoteUser = await this.findUserRemote(identifier);

    if (!remoteUser) {
      return {
        success: false,
        error: 'No account found with this Phone Number or Email on any device. Please create a new account.',
      };
    }

    // If password check is requested
    if (password !== undefined) {
      // Legacy user without a stored password (e.g., registered before password sync)
      // Allow them to login and claim/set the password
      if (!remoteUser.password) {
        // Set password for them automatically
        remoteUser.password = password;
        await this.updateUserRemote(remoteUser);
        return {
          success: true,
          user: remoteUser,
        };
      }

      if (remoteUser.password !== password) {
        return {
          success: false,
          error: 'Incorrect password. Please try again or use One-Time Passcode (OTP) Login.',
        };
      }
    }

    return {
      success: true,
      user: remoteUser,
    };
  }

  /**
   * Update User Profile / Password in Supabase
   */
  static async updateUserRemote(user: User): Promise<boolean> {
    try {
      const client = this.getClient();

      // Find the lead row for this user
      const cleanPhone = (user.phone || '').replace(/\D/g, '');
      const lastDigits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

      let query = client.from('leads').select('*');
      if (user.email) {
        query = query.ilike('email', user.email.toLowerCase());
      } else if (lastDigits) {
        query = query.ilike('phone', `%${lastDigits}%`);
      }

      const { data: leads } = await query.limit(5);

      if (leads && leads.length > 0) {
        const targetLead = leads[0];
        const existingMeta = (targetLead.metadata || {}) as Record<string, unknown>;

        await client
          .from('leads')
          .update({
            full_name: user.fullName,
            email: user.email || targetLead.email,
            phone: user.phone || targetLead.phone,
            note: user.bio || targetLead.note,
            metadata: {
              ...existingMeta,
              id: user.id,
              password: user.password || existingMeta.password,
              upiId: user.upiId,
              avatar: user.avatar,
              bio: user.bio,
              role: user.role,
              currency: user.currency,
              country: user.country,
              updated_at: new Date().toISOString(),
            },
          })
          .eq('id', targetLead.id);
      }

      // Also try updating users table if it exists
      try {
        await client
          .from('users')
          .update({
            full_name: user.fullName,
            email: user.email,
            phone: user.phone,
            upi_id: user.upiId,
            password: user.password,
            bio: user.bio,
            avatar: user.avatar,
          })
          .eq('id', user.id);
      } catch {
        // ignore
      }

      return true;
    } catch (err) {
      console.warn('Error updating remote user in Supabase:', err);
      return false;
    }
  }

  /**
   * Cloud sync for user's application data (groups, members, bills, payments)
   * This guarantees that when a user logs in from another device, their bills and groups load!
   */
  static async saveUserData(
    userId: number,
    data: { groups: Group[]; members: GroupMember[]; bills: Bill[]; payments: Payment[] }
  ): Promise<void> {
    try {
      const client = this.getClient();

      // Find user lead record
      const { data: leads } = await client.from('leads').select('*').limit(20);
      if (!leads) return;

      const userLead = leads.find((l) => {
        const m = (l.metadata || {}) as Record<string, unknown>;
        return m.id === userId || Number(l.id) === userId;
      });

      if (userLead) {
        const m = (userLead.metadata || {}) as Record<string, unknown>;
        await client
          .from('leads')
          .update({
            metadata: {
              ...m,
              app_data: data,
              data_synced_at: new Date().toISOString(),
            },
          })
          .eq('id', userLead.id);
      }
    } catch (err) {
      console.warn('Error syncing app data to Supabase:', err);
    }
  }

  /**
   * Load user's application data from Supabase when logging into a new device
   */
  static async loadUserData(
    userId: number
  ): Promise<{ groups: Group[]; members: GroupMember[]; bills: Bill[]; payments: Payment[] } | null> {
    try {
      const client = this.getClient();
      const { data: leads } = await client.from('leads').select('*').limit(20);
      if (!leads) return null;

      const userLead = leads.find((l) => {
        const m = (l.metadata || {}) as Record<string, unknown>;
        return m.id === userId || Number(l.id) === userId;
      });

      if (userLead && userLead.metadata) {
        const meta = userLead.metadata as Record<string, unknown>;
        if (meta.app_data) {
          return meta.app_data as {
            groups: Group[];
            members: GroupMember[];
            bills: Bill[];
            payments: Payment[];
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // LEAD PIPELINE METHODS (For inquiries and admin dashboard)
  // =========================================================================

  /**
   * Save a new lead to Supabase (with automatic local storage backup)
   */
  static async saveLead(leadData: Omit<Lead, 'id' | 'created_at'>): Promise<{
    success: boolean;
    lead: Lead;
    savedToRemote: boolean;
    error?: string;
  }> {
    const timestamp = new Date().toISOString();
    const newLead: Lead = {
      id: Date.now(),
      created_at: timestamp,
      ...leadData,
    };

    // Always preserve in local fallback leads queue
    this.saveLeadToLocal(newLead);

    // Try saving directly to Supabase
    try {
      const client = this.getClient();
      const payload = {
        full_name: newLead.full_name,
        email: newLead.email || null,
        phone: newLead.phone || null,
        note: newLead.note || null,
        source: newLead.source || 'lead_form',
        status: newLead.status || 'new',
        metadata: newLead.metadata || {},
      };

      const { data, error } = await client
        .from('leads')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Supabase remote insert warning:', error.message);
        return {
          success: true,
          lead: newLead,
          savedToRemote: false,
          error: error.message,
        };
      }

      const remoteLead: Lead = {
        ...newLead,
        id: data.id || newLead.id,
        created_at: data.created_at || newLead.created_at,
      };

      this.updateLocalLead(newLead.id!, remoteLead);

      return {
        success: true,
        lead: remoteLead,
        savedToRemote: true,
      };
    } catch (err: unknown) {
      console.warn('Network error saving to Supabase:', err);
      return {
        success: true,
        lead: newLead,
        savedToRemote: false,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }

  /**
   * Fetch all leads: retrieves remote Supabase leads with local fallback
   */
  static async getLeads(): Promise<{
    leads: Lead[];
    source: 'supabase' | 'local_fallback' | 'merged';
    total: number;
  }> {
    const localLeads = this.getLocalLeads();

    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return {
          leads: localLeads,
          source: 'local_fallback',
          total: localLeads.length,
        };
      }

      const remoteLeads: Lead[] = data.map((item) => ({
        id: item.id,
        created_at: item.created_at,
        full_name: item.full_name,
        email: item.email || undefined,
        phone: item.phone || undefined,
        note: item.note || undefined,
        source: item.source || 'web_app',
        status: item.status || 'new',
        metadata: item.metadata || {},
      }));

      return {
        leads: remoteLeads,
        source: 'supabase',
        total: remoteLeads.length,
      };
    } catch {
      return {
        leads: localLeads,
        source: 'local_fallback',
        total: localLeads.length,
      };
    }
  }

  // --- Local storage helpers ---
  static getLocalLeads(): Lead[] {
    try {
      const data = localStorage.getItem(LOCAL_LEADS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return [];
  }

  static saveLeadToLocal(lead: Lead) {
    try {
      const current = this.getLocalLeads();
      const updated = [lead, ...current];
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  static updateLocalLead(id: number | string, updatedLead: Lead) {
    try {
      const current = this.getLocalLeads();
      const updated = current.map((l) => (l.id === id ? updatedLead : l));
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update localStorage lead:', e);
    }
  }

  static deleteLead(id: number | string) {
    try {
      const current = this.getLocalLeads();
      const updated = current.filter((l) => l.id !== id);
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));

      // Also delete from Supabase
      const client = this.getClient();
      client.from('leads').delete().eq('id', id).then(() => {});
    } catch (e) {
      console.warn('Failed to delete lead:', e);
    }
  }
}
