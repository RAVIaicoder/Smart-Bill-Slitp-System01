import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Download,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  Database,
  Copy,
  Check,
} from 'lucide-react';
import { SupabaseService, Lead } from '../supabaseClient';
import { maskPhoneNumber } from '../dataStore';

interface SupabaseLeadsManagerProps {
  themeMode?: 'light' | 'dark';
}

export const SupabaseLeadsManager: React.FC<SupabaseLeadsManagerProps> = ({
  themeMode = 'light',
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    tableExists: boolean;
    message: string;
    leadCount?: number;
  } | null>(null);
  const [checkingConn, setCheckingConn] = useState<boolean>(false);

  // New Lead form
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [source, setSource] = useState<Lead['source']>('lead_form');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Supabase SQL Schema Modal
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const SUPABASE_SQL_SCRIPT = `-- SMART SPLIT BILL - SUPABASE DATABASE SCHEMA
-- Run this in Supabase: SQL Editor -> New Query -> Run

CREATE TABLE IF NOT EXISTS public.leads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    note TEXT,
    source TEXT DEFAULT 'registration',
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY,
    email TEXT,
    phone TEXT,
    full_name TEXT NOT NULL,
    upi_id TEXT,
    password TEXT,
    bio TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'user',
    currency TEXT DEFAULT 'INR',
    country TEXT DEFAULT 'India',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.groups (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    currency TEXT DEFAULT 'INR',
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id BIGINT,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bills (
    id BIGINT PRIMARY KEY,
    group_id BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
    paid_by BIGINT,
    title TEXT NOT NULL,
    description TEXT,
    total_amount NUMERIC(12, 2) NOT NULL,
    category TEXT DEFAULT 'Other',
    split_type TEXT DEFAULT 'equal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bill_splits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT REFERENCES public.bills(id) ON DELETE CASCADE,
    user_id BIGINT,
    owed_amount NUMERIC(12, 2) NOT NULL,
    percentage NUMERIC(5, 2),
    shares INTEGER DEFAULT 1,
    is_settled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.payments (
    id BIGINT PRIMARY KEY,
    group_id BIGINT REFERENCES public.groups(id) ON DELETE CASCADE,
    payer_id BIGINT,
    payee_id BIGINT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT DEFAULT 'UPI',
    transaction_ref TEXT,
    status TEXT DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access leads" ON public.leads;
DROP POLICY IF EXISTS "Public access users" ON public.users;
DROP POLICY IF EXISTS "Public access groups" ON public.groups;
DROP POLICY IF EXISTS "Public access group_members" ON public.group_members;
DROP POLICY IF EXISTS "Public access bills" ON public.bills;
DROP POLICY IF EXISTS "Public access bill_splits" ON public.bill_splits;
DROP POLICY IF EXISTS "Public access payments" ON public.payments;

CREATE POLICY "Public access leads" ON public.leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access groups" ON public.groups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access group_members" ON public.group_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access bills" ON public.bills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access bill_splits" ON public.bill_splits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;

  const copySqlCode = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  useEffect(() => {
    loadLeads();
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setCheckingConn(true);
    const result = await SupabaseService.checkConnection();
    setConnectionStatus(result);
    setCheckingConn(false);
  };

  const loadLeads = async () => {
    setLoading(true);
    const { leads: fetchedLeads } = await SupabaseService.getLeads();
    setLeads(fetchedLeads);
    setLoading(false);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSubmitting(true);
    setFormFeedback(null);

    const result = await SupabaseService.saveLead({
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      note: note.trim() || undefined,
      source: source,
      status: 'new',
    });

    setSubmitting(false);

    if (result.success) {
      setFormFeedback({
        type: 'success',
        message: 'Lead recorded successfully in database!',
      });
      setFullName('');
      setEmail('');
      setPhone('');
      setNote('');
      loadLeads();
      setTimeout(() => {
        setShowAddLeadModal(false);
        setFormFeedback(null);
      }, 1200);
    } else {
      setFormFeedback({
        type: 'error',
        message: result.error || 'Failed to save lead.',
      });
    }
  };

  const handleDeleteLead = (id?: number | string) => {
    if (!id) return;
    if (confirm('Are you sure you want to remove this lead record?')) {
      SupabaseService.deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const exportLeadsCSV = () => {
    if (leads.length === 0) return;
    const headers = ['ID', 'Date', 'Full Name', 'Email', 'Phone', 'Source', 'Status', 'Note'];
    const rows = leads.map((l) => [
      l.id || '',
      l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
      `"${(l.full_name || '').replace(/"/g, '""')}"`,
      l.email || '',
      l.phone || '',
      l.source,
      l.status,
      `"${(l.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      (l.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.phone || '').includes(searchQuery) ||
      (l.note || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Secure Database Status */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          themeMode === 'dark'
            ? 'bg-slate-800/90 border-slate-700/80'
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl border border-blue-500/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Leads & Registered Members
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud Protected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total Inquiries & Registrations: <span className="font-bold text-slate-700 dark:text-slate-200">{leads.length}</span> records
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowSqlModal(true)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'border-indigo-700 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300'
                  : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
              }`}
              title="View and copy Supabase SQL database schema"
            >
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              SQL Schema
            </button>

            <button
              onClick={checkConnection}
              disabled={checkingConn}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'border-slate-700 hover:bg-slate-700 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingConn ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={exportLeadsCSV}
              disabled={leads.length === 0}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'border-slate-700 hover:bg-slate-700 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
          themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, email, phone..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium outline-hidden ${
              themeMode === 'dark'
                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-medium text-slate-400">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold outline-hidden ${
              themeMode === 'dark'
                ? 'bg-slate-900 border-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All ({leads.length})</option>
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          themeMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                themeMode === 'dark'
                  ? 'bg-slate-800/80 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <tr>
                <th className="py-3 px-4">Contact / Lead</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading leads from cloud database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`transition-colors ${
                      themeMode === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                          {lead.full_name?.charAt(0) || 'L'}
                        </div>
                        <div>
                          <div>{lead.full_name}</div>
                          {lead.note && (
                            <div className="text-[11px] text-slate-400 font-normal line-clamp-1 max-w-xs">
                              {lead.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {lead.phone ? (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {lead.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {lead.email ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {lead.email}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          lead.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : lead.status === 'contacted'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Add New Lead / Contact
              </h3>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {formFeedback && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
                  formFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleAddLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className={`w-full p-2.5 rounded-xl border font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 90820 XXXXX"
                  className={`w-full p-2.5 rounded-xl border font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. priya@example.com"
                  className={`w-full p-2.5 rounded-xl border font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as Lead['source'])}
                  className={`w-full p-2.5 rounded-xl border font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="lead_form">Lead Form</option>
                  <option value="contact">Contact Inquiry</option>
                  <option value="admin">Admin Created</option>
                  <option value="registration">Registration</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Notes / Requirements</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Requested group bill splitting demonstration"
                  className={`w-full p-2.5 rounded-xl border font-medium outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="flex-1 py-2.5 rounded-xl border font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase SQL Schema & Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl border shadow-2xl ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Supabase SQL Database Setup
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    No new database needed! Run this once in your existing Supabase project.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick 3-Step Guide */}
            <div className="py-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">Step 1</span>
                <span>Open your Supabase Project dashboard.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">Step 2</span>
                <span>Go to <strong>SQL Editor</strong> &gt; click <strong>New Query</strong>.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Step 3</span>
                <span>Paste the SQL below &amp; click <strong>Run</strong>.</span>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-200 my-2">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
                <span>supabase_schema.sql (PostgreSQL + RLS Policies)</span>
                <button
                  onClick={copySqlCode}
                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-auto max-h-64 scrollbar-thin select-all">
                {SUPABASE_SQL_SCRIPT}
              </pre>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Includes public RLS policies for instant read/write permissions
              </span>
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
