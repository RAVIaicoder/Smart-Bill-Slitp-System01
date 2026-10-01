// Flutter / Dart Mock Data & Persistent State Service for Smart Split Bill Web
// Mirrored with SQLite database structure:
// users, user_profiles, groups, group_members, bills, bill_items, bill_splits, payments, chat, budget

export interface User {
  id: number;
  email: string;
  phone: string;
  fullName: string;
  upiId: string;
  currency: string;
  role: 'user' | 'admin';
  password?: string;
  avatar?: string;
  bio?: string;
  country?: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  currency: string;
  createdBy: number;
  memberCount: number;
  totalExpenses: number;
  targetBudget?: number;
  userRole: 'admin' | 'member';
  createdAt: string;
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  upiId: string;
  role: 'admin' | 'member';
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface BillSplit {
  userId: number;
  fullName: string;
  owedAmount: number;
  percentage?: number;
  shares?: number;
  isSettled: boolean;
}

export interface Bill {
  id: number;
  groupId: number;
  groupName: string;
  paidBy: number;
  paidByName: string;
  title: string;
  description: string;
  totalAmount: number;
  category: string;
  splitType: 'equal' | 'percentage' | 'exact' | 'shares';
  createdAt: string;
  items: BillItem[];
  splits: BillSplit[];
}

export interface Payment {
  id: number;
  groupId: number;
  groupName: string;
  payerId: number;
  payerName: string;
  payeeId: number;
  payeeName: string;
  amount: number;
  paymentMethod: 'UPI' | 'Google Pay' | 'PhonePe' | 'Cash';
  transactionRef: string;
  status: 'Paid' | 'Pending';
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  groupId: number;
  userId: number;
  userName: string;
  text: string;
  isSystem: boolean;
  time: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'payment' | 'bill' | 'group' | 'info';
  isRead: boolean;
  time: string;
}

export interface AuditLog {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  details: string;
  timestamp: string;
}

// Format and mask phone numbers for student privacy: displays prefix + XXXXX (e.g. 90820XXXXX or +91 90820XXXXX)
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 10) {
    const prefix = digits.slice(-10, -5);
    const hasCountryCode = clean.startsWith('+') || digits.length > 10;
    return `${hasCountryCode ? '+91 ' : ''}${prefix}XXXXX`;
  }
  if (clean.length > 5) {
    return clean.slice(0, 5) + 'XXXXX';
  }
  return '90820XXXXX';
}

// Purge legacy demo caches from previous sessions
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const legacyKeys = [
      'smart_split_current_user',
      'smart_split_bill_sqlite_cache_v2_users',
      'smart_split_bill_sqlite_cache_v2_groups',
      'smart_split_bill_sqlite_cache_v2_members',
      'smart_split_bill_sqlite_cache_v2_bills',
      'smart_split_bill_sqlite_cache_v2_payments',
      'smart_split_bill_sqlite_cache_v2_chats',
      'smart_split_bill_sqlite_cache_v2_notifications',
      'smart_split_bill_sqlite_cache_v2_audit_logs',
      'smart_split_bill_sqlite_cache_v1_users',
      'smart_split_bill_sqlite_cache_v1_groups'
    ];
    legacyKeys.forEach(k => {
      try {
        const val = localStorage.getItem(k);
        if (val && (val.includes('Rahul') || val.includes('Goa Trip') || val.includes('smartsplitbill.local'))) {
          localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }
    });
  }
} catch {
  // ignore
}

const STORAGE_KEY = 'smart_split_bill_v3_fresh';

// Clean, fresh state - No demo accounts (Rahul Sharma, Amit, Priya removed)
// Real users register directly through the Login / Sign Up screen
export const INITIAL_USERS: User[] = [];
export const INITIAL_GROUPS: Group[] = [];
export const INITIAL_MEMBERS: GroupMember[] = [];
export const INITIAL_BILLS: Bill[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_CHATS: ChatMessage[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export class DataStore {
  private static loadState<T>(key: string, defaultVal: T): T {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static saveState<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(val));
    } catch {
      // storage unavailable
    }
  }

  static getUsers(): User[] { return this.loadState('users', INITIAL_USERS); }
  static saveUsers(users: User[]) { this.saveState('users', users); }

  static getGroups(): Group[] { return this.loadState('groups', INITIAL_GROUPS); }
  static saveGroups(groups: Group[]) { this.saveState('groups', groups); }

  static getMembers(): GroupMember[] { return this.loadState('members', INITIAL_MEMBERS); }
  static saveMembers(members: GroupMember[]) { this.saveState('members', members); }

  static getBills(): Bill[] { return this.loadState('bills', INITIAL_BILLS); }
  static saveBills(bills: Bill[]) { this.saveState('bills', bills); }

  static getPayments(): Payment[] { return this.loadState('payments', INITIAL_PAYMENTS); }
  static savePayments(payments: Payment[]) { this.saveState('payments', payments); }

  static getChats(): ChatMessage[] { return this.loadState('chats', INITIAL_CHATS); }
  static saveChats(chats: ChatMessage[]) { this.saveState('chats', chats); }

  static getNotifications(): NotificationItem[] { return this.loadState('notifications', INITIAL_NOTIFICATIONS); }
  static saveNotifications(n: NotificationItem[]) { this.saveState('notifications', n); }

  static getAuditLogs(): AuditLog[] { return this.loadState('audit_logs', INITIAL_AUDIT_LOGS); }
  static saveAuditLogs(logs: AuditLog[]) { this.saveState('audit_logs', logs); }

  static clearAllData() {
    this.saveUsers([]);
    this.saveGroups([]);
    this.saveMembers([]);
    this.saveBills([]);
    this.savePayments([]);
    this.saveChats([]);
    this.saveNotifications([]);
    this.saveAuditLogs([]);
    try {
      localStorage.removeItem('smart_split_current_user');
    } catch {
      // ignore
    }
  }

  static resetToDemoData() {
    this.clearAllData();
  }
}

export type ColorTheme = 'sapphire' | 'teal' | 'amber';

export interface ThemeColors {
  name: string;
  id: ColorTheme;
  description: string;
  primaryBg: string;
  primaryHover: string;
  primaryText: string;
  primaryBorder: string;
  gradient: string;
  lightBg: string;
  badge: string;
  iconBg: string;
  accentBorder: string;
  dot: string;
}

export const COLOR_THEMES: Record<ColorTheme, ThemeColors> = {
  sapphire: {
    name: 'Royal Sapphire',
    id: 'sapphire',
    description: 'Executive Cobalt & Slate (Stripe / Mercury FinTech)',
    primaryBg: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-700',
    primaryText: 'text-blue-600 dark:text-blue-400',
    primaryBorder: 'border-blue-500',
    gradient: 'from-blue-600 via-indigo-600 to-blue-800',
    lightBg: 'bg-blue-50 dark:bg-blue-950/40',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    iconBg: 'bg-blue-600 shadow-blue-500/25',
    accentBorder: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  teal: {
    name: 'Nordic Teal',
    id: 'teal',
    description: 'Scandinavian Marine & Mint (Wise / Modern style)',
    primaryBg: 'bg-teal-600',
    primaryHover: 'hover:bg-teal-700',
    primaryText: 'text-teal-600 dark:text-teal-400',
    primaryBorder: 'border-teal-500',
    gradient: 'from-teal-600 via-emerald-600 to-teal-800',
    lightBg: 'bg-teal-50 dark:bg-teal-950/40',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    iconBg: 'bg-teal-600 shadow-teal-500/25',
    accentBorder: 'border-teal-200 dark:border-teal-800',
    dot: 'bg-teal-500',
  },
  amber: {
    name: 'Tokyo Amber',
    id: 'amber',
    description: 'Obsidian & Brass Gold (Luxury Ledger style)',
    primaryBg: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-700',
    primaryText: 'text-amber-600 dark:text-amber-400',
    primaryBorder: 'border-amber-500',
    gradient: 'from-amber-600 via-orange-600 to-amber-800',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    iconBg: 'bg-amber-600 shadow-amber-500/25',
    accentBorder: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
};
