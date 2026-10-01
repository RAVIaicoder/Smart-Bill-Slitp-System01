/**
 * Smart Split Bill - Pure Flutter/Dart Inspired Material 3 Architecture
 * 
 * Features:
 * 1. Material 3 Fintech Navigation (NavigationRail on desktop/tablet, NavigationBar on mobile)
 * 2. SQLite Backend Architecture & Persistent Data Storage
 * 3. Smart Bill Splitting (Equal, Percentage, Exact Amount, Custom Shares)
 * 4. Itemized Bill Calculator with Multi-Consumer Allocation
 * 5. Smart Digital Bill Receipt with 1-Click Browser Print & PDF export
 * 6. Dynamic UPI QR Code Generation & UPI Deep-Link Intent (Google Pay, PhonePe, Paytm)
 * 7. Simplified Settlement Engine ("Who Owes Whom" Minimal Cash Flow)
 * 8. Real-time Group Chat & Activity Event Feed
 * 9. Monthly Budget Tracker & Threshold Warning Badges
 * 10. Admin Panel with User Monitoring & Audit Log Inspection
 * 11. Multi-Device Persistent Account Login (Real Users with Phone/Email & Password Authentication)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet,
  Users,
  Receipt,
  QrCode,
  PieChart,
  Bell,
  Settings,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Printer,
  Share2,
  Download,
  Copy,
  Search,
  LogOut,
  Send,
  Sparkles,
  AlertTriangle,
  Menu,
  X,
  CreditCard,
  ChevronRight,
  TrendingUp,
  FileText,
  DollarSign,
  UserCheck,
  RefreshCw,
  Eye,
  Info,
  Database
} from 'lucide-react';
import {
  DataStore,
  User,
  Group,
  GroupMember,
  Bill,
  Payment,
  ChatMessage,
  NotificationItem,
  AuditLog,
  maskPhoneNumber,
  ColorTheme,
  COLOR_THEMES
} from './dataStore.ts';
import { AuthScreens } from './components/AuthScreens.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { SupabaseLeadsManager } from './components/SupabaseLeadsManager.tsx';
import { SupabaseService } from './supabaseClient.ts';

export default function App() {
  // Distinct Color Palette (Royal Sapphire by default for non-generic, premium executive look)
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    try {
      return (localStorage.getItem('smart_split_palette') as ColorTheme) || 'sapphire';
    } catch {
      return 'sapphire';
    }
  });

  const handleSetColorTheme = (t: ColorTheme) => {
    setColorTheme(t);
    try {
      localStorage.setItem('smart_split_palette', t);
    } catch {
      // ignore
    }
    showToast(`Active Palette: ${COLOR_THEMES[t].name}`);
  };

  const currentTheme = COLOR_THEMES[colorTheme] || COLOR_THEMES.sapphire;

  // Authentication & Session (permanent lifetime session across reloads and device on/off)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('smart_split_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName === 'Rahul Sharma' && parsed.email === 'rahul@smartsplitbill.local') {
          localStorage.removeItem('smart_split_current_user');
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Navigation: 'dashboard' | 'groups' | 'group_detail' | 'add_bill' | 'bill_detail' | 'settle' | 'reports' | 'budget' | 'profile' | 'admin' | 'notifications'
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('smart_split_theme_mode') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('smart_split_theme_mode', themeMode);
    } catch {
      // ignore
    }
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  // App Data State (synced with persistent SQLite schema)
  const [users, setUsers] = useState<User[]>(() => DataStore.getUsers());
  const [groups, setGroups] = useState<Group[]>(() => DataStore.getGroups());
  const [members, setMembers] = useState<GroupMember[]>(() => DataStore.getMembers());
  const [bills, setBills] = useState<Bill[]>(() => DataStore.getBills());
  const [payments, setPayments] = useState<Payment[]>(() => DataStore.getPayments());
  const [chats, setChats] = useState<ChatMessage[]>(() => DataStore.getChats());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => DataStore.getNotifications());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => DataStore.getAuditLogs());

  // Modals & UI States
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [qrModalData, setQrModalData] = useState<{ payeeName: string; upiId: string; amount: number; note: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Group & Member Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupTarget, setNewGroupTarget] = useState('25000');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberUpi, setNewMemberUpi] = useState('');

  // Target Budget Edit Modal
  const [showSetTargetModal, setShowSetTargetModal] = useState<boolean>(false);
  const [targetBudgetInput, setTargetBudgetInput] = useState<string>('30000');

  // Leave Group Modal State
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState<boolean>(false);

  // Admin Access Protection State
  const [unlockedAdmin, setUnlockedAdmin] = useState<boolean>(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  // Add Bill Custom Category State
  const [billCategory, setBillCategory] = useState<string>('Food');
  const [customCategoryName, setCustomCategoryName] = useState<string>('');

  // Group Chat Input State
  const [newChatText, setNewChatText] = useState<string>('');

  // Save current user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('smart_split_current_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Load cloud data for currentUser when logging in from any device
  useEffect(() => {
    if (!currentUser) return;
    SupabaseService.loadUserData(currentUser.id).then((cloudData) => {
      if (cloudData) {
        if (cloudData.groups?.length && groups.length === 0) {
          setGroups(cloudData.groups);
          DataStore.saveGroups(cloudData.groups);
        }
        if (cloudData.members?.length && members.length === 0) {
          setMembers(cloudData.members);
          DataStore.saveMembers(cloudData.members);
        }
        if (cloudData.bills?.length && bills.length === 0) {
          setBills(cloudData.bills);
          DataStore.saveBills(cloudData.bills);
        }
        if (cloudData.payments?.length && payments.length === 0) {
          setPayments(cloudData.payments);
          DataStore.savePayments(cloudData.payments);
        }
      }
    }).catch(() => {});
  }, [currentUser?.id]);

  // Auto-sync user groups/bills/payments to Supabase cloud in background
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      SupabaseService.saveUserData(currentUser.id, {
        groups,
        members,
        bills,
        payments,
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [groups, members, bills, payments, currentUser?.id]);

  // Sync selectedGroupId with first available group
  useEffect(() => {
    if (groups.length > 0) {
      if (!selectedGroupId || !groups.some((g) => g.id === selectedGroupId)) {
        setSelectedGroupId(groups[0].id);
      }
    } else {
      setSelectedGroupId(null);
    }
  }, [groups, selectedGroupId]);

  // Sync selectedBillId with first available bill
  useEffect(() => {
    if (bills.length > 0) {
      if (!selectedBillId || !bills.some((b) => b.id === selectedBillId)) {
        setSelectedBillId(bills[0].id);
      }
    } else {
      setSelectedBillId(null);
    }
  }, [bills, selectedBillId]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Group Details Helper
  const currentGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find((g) => g.id === selectedGroupId) || groups[0] || null;
  }, [groups, selectedGroupId]);

  const currentGroupMembers = useMemo(() => {
    if (!currentGroup) return [];
    return members.filter((m) => m.groupId === currentGroup.id);
  }, [members, currentGroup]);

  const currentGroupBills = useMemo(() => {
    if (!currentGroup) return [];
    return bills.filter((b) => b.groupId === currentGroup.id);
  }, [bills, currentGroup]);

  const currentBill = useMemo(() => {
    if (bills.length === 0) return null;
    return bills.find((b) => b.id === selectedBillId) || bills[0] || null;
  }, [bills, selectedBillId]);

  // Financial Metrics for Current User
  const metrics = useMemo(() => {
    if (!currentUser) return { totalExpense: 0, youOwe: 0, toReceive: 0, pending: 0 };

    let totalExpense = 0;
    let youOwe = 0;
    let toReceive = 0;

    bills.forEach((b) => {
      // Total amount paid by current user across all groups
      if (b.paidBy === currentUser.id) {
        totalExpense += b.totalAmount;
      }

      b.splits.forEach((s) => {
        if (!s.isSettled) {
          // If current user is debtor
          if (s.userId === currentUser.id && b.paidBy !== currentUser.id) {
            youOwe += s.owedAmount;
          }
          // If current user is creditor
          if (b.paidBy === currentUser.id && s.userId !== currentUser.id) {
            toReceive += s.owedAmount;
          }
        }
      });
    });

    return {
      totalExpense,
      youOwe,
      toReceive,
      pending: youOwe,
    };
  }, [bills, currentUser]);

  // Dynamic Category Spending Breakdown for Reports
  const categoryBreakdown = useMemo(() => {
    if (bills.length === 0) return [];
    const map: { [cat: string]: number } = {};
    let total = 0;
    bills.forEach((b) => {
      map[b.category] = (map[b.category] || 0) + b.totalAmount;
      total += b.totalAmount;
    });
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'];
    return Object.entries(map).map(([cat, amount], idx) => ({
      cat,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: colors[idx % colors.length],
    }));
  }, [bills]);

  // Simplified Settlement Calculation ("Who Owes Whom" Minimal Cash Flow)
  const settlementSummary = useMemo(() => {
    if (!currentGroup) return [];

    // Calculate net balances for each group member
    const balanceMap: { [userId: number]: { name: string; upiId: string; balance: number } } = {};

    currentGroupMembers.forEach((m) => {
      balanceMap[m.userId] = { name: m.fullName, upiId: m.upiId, balance: 0 };
    });

    currentGroupBills.forEach((b) => {
      // Payer contributed full total amount
      if (balanceMap[b.paidBy]) {
        balanceMap[b.paidBy].balance += b.totalAmount;
      }
      // Each split deducts owed amount
      b.splits.forEach((s) => {
        if (balanceMap[s.userId]) {
          balanceMap[s.userId].balance -= s.owedAmount;
        }
      });
    });

    // Factor in verified payments
    payments
      .filter((p) => p.groupId === currentGroup.id && p.status === 'Paid')
      .forEach((p) => {
        if (balanceMap[p.payerId]) balanceMap[p.payerId].balance += p.amount;
        if (balanceMap[p.payeeId]) balanceMap[p.payeeId].balance -= p.amount;
      });

    // Match Debtors & Creditors
    const debtors: { userId: number; name: string; amount: number }[] = [];
    const creditors: { userId: number; name: string; upiId: string; amount: number }[] = [];

    Object.entries(balanceMap).forEach(([uid, data]) => {
      const b = Math.round(data.balance * 100) / 100;
      if (b < -0.01) {
        debtors.push({ userId: Number(uid), name: data.name, amount: Math.abs(b) });
      } else if (b > 0.01) {
        creditors.push({ userId: Number(uid), name: data.name, upiId: data.upiId, amount: b });
      }
    });

    const settlements: {
      payerId: number;
      payerName: string;
      payeeId: number;
      payeeName: string;
      payeeUpi: string;
      amount: number;
    }[] = [];

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const transfer = Math.min(debtor.amount, creditor.amount);

      if (transfer > 0.01) {
        settlements.push({
          payerId: debtor.userId,
          payerName: debtor.name,
          payeeId: creditor.userId,
          payeeName: creditor.name,
          payeeUpi: creditor.upiId,
          amount: Math.round(transfer),
        });
      }

      debtor.amount -= transfer;
      creditor.amount -= transfer;

      if (debtor.amount <= 0.01) i++;
      if (creditor.amount <= 0.01) j++;
    }

    return settlements;
  }, [currentGroup, currentGroupMembers, currentGroupBills, payments]);

  // Handler: Switch user account (Multi-device cross-login simulation)
  const handleSwitchAccount = (u: User) => {
    setCurrentUser(u);
    showToast(`Switched account to ${u.fullName}`);
  };

  // Handler: Logout user and return to login screen
  const handleLogout = () => {
    localStorage.removeItem('smart_split_current_user');
    setCurrentUser(null);
    showToast('Logged out successfully.');
  };

  // Handler: Update User Profile & sync across all persistent stores
  const handleUpdateUser = (updated: User) => {
    setCurrentUser(updated);
    localStorage.setItem('smart_split_current_user', JSON.stringify(updated));

    // Update in DataStore users
    const currentUsers = DataStore.getUsers();
    const updatedUsers = currentUsers.map((u) => (u.id === updated.id ? updated : u));
    DataStore.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    // Sync to Supabase cloud
    SupabaseService.updateUserRemote(updated).catch(console.warn);

    // Update member records with updated profile information
    const currentMembers = DataStore.getMembers();
    const updatedMembers = currentMembers.map((m) => {
      if (m.userId === updated.id) {
        return {
          ...m,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          upiId: updated.upiId,
        };
      }
      return m;
    });
    DataStore.saveMembers(updatedMembers);
    setMembers(updatedMembers);
  };

  // Handler: Member leaves group
  const handleLeaveGroup = () => {
    if (!currentGroup || !currentUser) return;
    const updatedMembers = members.filter(
      (m) => !(m.groupId === currentGroup.id && m.userId === currentUser.id)
    );
    const updatedGroups = groups.map((g) =>
      g.id === currentGroup.id ? { ...g, memberCount: Math.max(1, g.memberCount - 1) } : g
    );
    setMembers(updatedMembers);
    setGroups(updatedGroups);
    DataStore.saveMembers(updatedMembers);
    DataStore.saveGroups(updatedGroups);

    const leaveChat: ChatMessage = {
      id: Date.now(),
      groupId: currentGroup.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      text: `${currentUser.fullName} left the group.`,
      isSystem: true,
      time: 'Just now',
    };
    const updatedChats = [...chats, leaveChat];
    setChats(updatedChats);
    DataStore.saveChats(updatedChats);

    setShowLeaveGroupModal(false);
    setActiveTab('groups');
    showToast(`You have exited "${currentGroup.name}".`);
  };

  // Handler: Admin removes member from group
  const handleRemoveMember = (targetMember: GroupMember) => {
    if (!currentGroup || !currentUser) return;
    if (targetMember.userId === currentUser.id) {
      handleLeaveGroup();
      return;
    }
    const updatedMembers = members.filter((m) => m.id !== targetMember.id);
    const updatedGroups = groups.map((g) =>
      g.id === currentGroup.id ? { ...g, memberCount: Math.max(1, g.memberCount - 1) } : g
    );
    setMembers(updatedMembers);
    setGroups(updatedGroups);
    DataStore.saveMembers(updatedMembers);
    DataStore.saveGroups(updatedGroups);

    const kickChat: ChatMessage = {
      id: Date.now(),
      groupId: currentGroup.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      text: `Admin ${currentUser.fullName} removed ${targetMember.fullName} from the group.`,
      isSystem: true,
      time: 'Just now',
    };
    const updatedChats = [...chats, kickChat];
    setChats(updatedChats);
    DataStore.saveChats(updatedChats);

    showToast(`${targetMember.fullName} was removed from the group.`);
  };

  // Handler: Send Group Chat Message
  const handleSendGroupChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim() || !currentGroup || !currentUser) return;

    const msg: ChatMessage = {
      id: Date.now(),
      groupId: currentGroup.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      text: newChatText.trim(),
      isSystem: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updatedChats = [...chats, msg];
    setChats(updatedChats);
    DataStore.saveChats(updatedChats);
    setNewChatText('');
  };

  // Handler: Unlock Admin Console with Password
  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError(null);
    if (adminPasswordInput === 'Admin@12345') {
      setUnlockedAdmin(true);
      setShowAdminPasswordModal(false);
      setAdminPasswordInput('');
      setActiveTab('admin');
      showToast('Admin console unlocked successfully!');
    } else {
      setAdminPasswordError('Incorrect password! Demo Admin key is Admin@12345');
    }
  };

  // Handler: Set Group Target Budget
  const handleSetTargetBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup) return;
    const val = parseFloat(targetBudgetInput) || 25000;
    const updatedGroups = groups.map((g) =>
      g.id === currentGroup.id ? { ...g, targetBudget: val } : g
    );
    setGroups(updatedGroups);
    DataStore.saveGroups(updatedGroups);
    setShowSetTargetModal(false);
    showToast(`Target budget for "${currentGroup.name}" set to ₹${val.toLocaleString('en-IN')}!`);
  };

  // Handler: Create New Group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser) return;

    const targetVal = parseFloat(newGroupTarget) || 25000;

    const newGroup: Group = {
      id: Date.now(),
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || 'Shared expenses pool',
      currency: 'INR',
      createdBy: currentUser.id,
      memberCount: 1,
      totalExpenses: 0,
      targetBudget: targetVal,
      userRole: 'admin',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const newMember: GroupMember = {
      id: Date.now(),
      groupId: newGroup.id,
      userId: currentUser.id,
      fullName: currentUser.fullName,
      email: currentUser.email,
      phone: currentUser.phone,
      upiId: currentUser.upiId,
      role: 'admin',
    };

    const updatedGroups = [newGroup, ...groups];
    const updatedMembers = [...members, newMember];

    setGroups(updatedGroups);
    setMembers(updatedMembers);
    DataStore.saveGroups(updatedGroups);
    DataStore.saveMembers(updatedMembers);

    setSelectedGroupId(newGroup.id);
    setShowCreateGroupModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupTarget('25000');
    showToast(`Group "${newGroup.name}" created with ₹${targetVal.toLocaleString('en-IN')} target!`);
  };

  // Handler: Add Member to current group (supports real friends / users)
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup) return;

    const rawName = newMemberName.trim();
    const rawEmail = newMemberEmail.trim().toLowerCase();
    const rawPhone = newMemberPhone.trim();
    const rawUpi = newMemberUpi.trim();

    if (!rawName) {
      showToast('Please enter the member\'s full name.');
      return;
    }

    if (currentGroupMembers.some((m) => 
      (rawEmail && m.email && m.email.toLowerCase() === rawEmail) ||
      (rawPhone && m.phone && m.phone === rawPhone) ||
      m.fullName.toLowerCase() === rawName.toLowerCase()
    )) {
      showToast(`${rawName} is already a member of this group!`);
      return;
    }

    // Find existing registered user or create user record
    let targetUser = users.find(
      (u) =>
        (rawEmail && u.email && u.email.toLowerCase() === rawEmail) ||
        (rawPhone && u.phone && u.phone === rawPhone)
    );

    if (!targetUser) {
      targetUser = {
        id: Date.now(),
        fullName: rawName,
        email: rawEmail || `${Date.now()}@smartsplitbill.local`,
        phone: rawPhone || '',
        upiId: rawUpi || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`,
        currency: 'INR',
        country: 'India',
        role: 'user',
        bio: 'Group member',
      };
      const updatedUsers = [...users, targetUser];
      setUsers(updatedUsers);
      DataStore.saveUsers(updatedUsers);
    }

    const newMember: GroupMember = {
      id: Date.now(),
      groupId: currentGroup.id,
      userId: targetUser.id,
      fullName: targetUser.fullName,
      email: targetUser.email,
      phone: targetUser.phone,
      upiId: targetUser.upiId,
      role: 'member',
    };

    const updatedMembers = [...members, newMember];
    const updatedGroups = groups.map((g) =>
      g.id === currentGroup.id ? { ...g, memberCount: g.memberCount + 1 } : g
    );

    setMembers(updatedMembers);
    setGroups(updatedGroups);
    DataStore.saveMembers(updatedMembers);
    DataStore.saveGroups(updatedGroups);

    // Save added member as a lead in Supabase
    SupabaseService.saveLead({
      full_name: targetUser.fullName,
      email: rawEmail || undefined,
      phone: rawPhone || undefined,
      note: `Added as member to group "${currentGroup.name}"`,
      source: 'add_member',
      status: 'active',
      metadata: { groupId: currentGroup.id, groupName: currentGroup.name, upiId: targetUser.upiId },
    }).catch((err) => console.warn('Supabase lead save notice:', err));

    // Add notification
    const newNotif: NotificationItem = {
      id: Date.now(),
      title: 'Added to Group',
      message: `You added ${targetUser.fullName} to ${currentGroup.name}`,
      type: 'group',
      isRead: false,
      time: 'Just now',
    };
    const updatedNotifs = [newNotif, ...notifications];
    setNotifications(updatedNotifs);
    DataStore.saveNotifications(updatedNotifs);

    setShowAddMemberModal(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPhone('');
    setNewMemberUpi('');
    showToast(`Added ${targetUser.fullName} to ${currentGroup.name}!`);
  };

  // Handler: Settle Payment
  const handleSettlePayment = (payerId: number, payeeId: number, amount: number, payeeUpi: string) => {
    if (!currentGroup) return;

    const payer = users.find((u) => u.id === payerId)?.fullName || 'User';
    const payee = users.find((u) => u.id === payeeId)?.fullName || 'User';

    const newPay: Payment = {
      id: Date.now(),
      groupId: currentGroup.id,
      groupName: currentGroup.name,
      payerId,
      payerName: payer,
      payeeId,
      payeeName: payee,
      amount,
      paymentMethod: 'UPI',
      transactionRef: `UPI-REF-${Math.floor(100000000 + Math.random() * 900000000)}`,
      status: 'Paid',
      createdAt: new Date().toLocaleString(),
    };

    const updatedPayments = [newPay, ...payments];
    setPayments(updatedPayments);
    DataStore.savePayments(updatedPayments);

    // Update splits to settled
    const updatedBills = bills.map((b) => {
      if (b.groupId === currentGroup.id) {
        const updatedSplits = b.splits.map((s) => {
          if (s.userId === payerId && b.paidBy === payeeId) {
            return { ...s, isSettled: true };
          }
          return s;
        });
        return { ...b, splits: updatedSplits };
      }
      return b;
    });

    setBills(updatedBills);
    DataStore.saveBills(updatedBills);

    // Group message event
    const newChat: ChatMessage = {
      id: Date.now(),
      groupId: currentGroup.id,
      userId: payerId,
      userName: payer,
      text: `Settled payment of ₹${amount} to ${payee} via UPI (Ref: ${newPay.transactionRef})`,
      isSystem: true,
      time: 'Just now',
    };
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    DataStore.saveChats(updatedChats);

    showToast(`₹${amount} settled successfully! Payment recorded in database.`);
  };

  // Generate UPI QR Code URL (Standard Vector SVG API)
  const getUpiQrUrl = (upiId: string, name: string, amount: number, note: string) => {
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}&color=059669`;
  };

  // Print Bill Handler
  const handlePrintBill = () => {
    window.print();
  };

  // If not logged in, display full Authentication Screen (Login / Register / Forgot Password)
  if (!currentUser) {
    return (
      <AuthScreens
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          showToast(`Welcome back, ${u.fullName}!`);
        }}
        themeMode={themeMode}
      />
    );
  }

  return (
    <div className={`min-h-screen ${themeMode === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col font-sans`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* TOP APP BAR (Material 3 Adaptive Header) */}
      <header className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b px-4 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl ${currentTheme.iconBg} text-white flex items-center justify-center font-bold shadow-md`}>
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-black tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  SMART BILL SPLITTING
                </h1>
              </div>
              <p className={`text-xs ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'} hidden sm:block`}>
                Smart Bill Splitting + Smart Bill Printing + Group Expense System
              </p>
            </div>
          </div>
        </div>

        {/* User Session Quick Actions, Color Palette Switcher & Logout */}
        <div className="flex items-center gap-2">
          {/* Distinct Color Palette Switcher */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shadow-xs"
            title="Switch Distinct Design Theme"
          >
            <button
              type="button"
              onClick={() => handleSetColorTheme('sapphire')}
              title="Royal Sapphire (Stripe / FinTech)"
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                colorTheme === 'sapphire' ? 'bg-blue-600 text-white shadow-xs scale-105 ring-1 ring-blue-400' : 'text-slate-400 hover:text-blue-500'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-1 ring-white" />
            </button>
            <button
              type="button"
              onClick={() => handleSetColorTheme('teal')}
              title="Nordic Teal (Wise / Modern)"
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                colorTheme === 'teal' ? 'bg-teal-600 text-white shadow-xs scale-105 ring-1 ring-teal-400' : 'text-slate-400 hover:text-teal-500'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-1 ring-white" />
            </button>
            <button
              type="button"
              onClick={() => handleSetColorTheme('amber')}
              title="Tokyo Amber (Executive / Ledger)"
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                colorTheme === 'amber' ? 'bg-amber-600 text-white shadow-xs scale-105 ring-1 ring-amber-400' : 'text-slate-400 hover:text-amber-500'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Toggle Material 3 Theme"
          >
            {themeMode === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Notifications Icon */}
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <Bell className="w-5 h-5" />
            {notifications.some((n) => !n.isRead) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            )}
          </button>

          {/* Logged-In User Profile Info & Logout */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2">
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 px-2.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer group shadow-xs"
              title="Click to view & edit Profile (Description, Phone, Photo, UPI)"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.fullName}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/50 group-hover:ring-emerald-500 transition-all shadow-xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/30 group-hover:scale-105 transition-all shadow-xs">
                  {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {currentUser?.fullName}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {currentUser?.role === 'admin' ? 'System Admin' : currentUser?.phone ? maskPhoneNumber(currentUser.phone) : currentUser?.email}
                </div>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Logout from this device"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT (NavigationRail on desktop, responsive main content) */}
      <div className="flex flex-1 overflow-hidden">
        {/* DESKTOP NAVIGATION RAIL (Flutter Material 3 Style) */}
        <aside className={`w-64 border-r hidden md:flex flex-col justify-between p-4 ${themeMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Core Modules
            </div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? `${currentTheme.primaryBg} text-white shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'groups' || activeTab === 'group_detail'
                  ? `${currentTheme.primaryBg} text-white shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Expense Groups</span>
            </button>

            <button
              onClick={() => setActiveTab('add_bill')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'add_bill'
                  ? `${currentTheme.primaryBg} text-white shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Smart Bill</span>
            </button>

            <button
              onClick={() => setActiveTab('bill_detail')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'bill_detail'
                  ? `${currentTheme.primaryBg} text-white shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Digital Bill Print</span>
            </button>

            <button
              onClick={() => setActiveTab('settle')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'settle'
                  ? `${currentTheme.primaryBg} text-white shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>UPI Payments & QR</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'reports'
                  ? `${currentTheme.primaryBg} text-white shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Reports & Analytics</span>
            </button>

            <div className="pt-4 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              System & Preferences
            </div>

            {/* Admin tab is only visible to System Admin or when unlocked with Master Key */}
            {(currentUser?.role === 'admin' || unlockedAdmin) && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin & Audit Logs</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? `${currentTheme.primaryBg} text-white shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Profile & Settings</span>
            </button>
          </div>
        </aside>

        {/* MOBILE NAVIGATION DRAWER */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden flex" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className={`w-72 h-full p-4 flex flex-col justify-between ${themeMode === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800">
                  <span className={`font-bold ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>Smart Bill Splitting</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {['dashboard', 'groups', 'add_bill', 'bill_detail', 'settle', 'reports', 'admin', 'profile'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold capitalize ${
                      activeTab === tab
                        ? `${currentTheme.primaryBg} text-white`
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Welcome Banner */}
              <div className={`p-6 rounded-3xl ${
                themeMode === 'dark'
                  ? `bg-linear-to-r ${currentTheme.gradient} text-white shadow-xl`
                  : `${currentTheme.lightBg} border-2 ${currentTheme.accentBorder} text-slate-900 shadow-md`
              } flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                <div>
                  <h2 className={`text-2xl font-black tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Smart Bill Splitting
                  </h2>
                  <p className={`text-sm mt-1 ${themeMode === 'dark' ? 'text-white/80' : 'text-slate-600'}`}>
                    Welcome back, {currentUser?.fullName}! Your financial split balances and group settlements are up to date.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('add_bill')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-white text-slate-900 hover:bg-slate-100'
                        : `${currentTheme.primaryBg} text-white ${currentTheme.primaryHover}`
                    }`}
                  >
                    <Plus className="w-4 h-4" /> Add Bill
                  </button>
                  <button
                    onClick={() => setActiveTab('settle')}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm border transition-all flex items-center gap-2 cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-black/20 hover:bg-black/30 text-white border-white/20'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                    }`}
                  >
                    <QrCode className="w-4 h-4" /> UPI Pay
                  </button>
                </div>
              </div>

              {/* 4 FINTECH METRIC CARDS (Total Expense, You Owe, To Receive, Pending) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expense</span>
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      ₹{metrics.totalExpense.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Total expenses paid by you</p>
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-500">You Owe</span>
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      ₹{metrics.youOwe.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Pending payments to friends</p>
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">To Receive</span>
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{metrics.toReceive.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Others owe you in groups</p>
                  </div>
                </div>

                <div className={`p-5 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Active Groups</span>
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {groups.length} Groups
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{bills.length} Total bills logged</p>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN GRID: Recent Bills & Groups */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Bills Column */}
                <div className={`lg:col-span-2 p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Bills</h3>
                      <p className="text-xs text-slate-400">Click any bill to view itemized breakdown & print</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('add_bill')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Bill
                    </button>
                  </div>

                  <div className="space-y-3">
                    {bills.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">
                        No bills logged yet. Tap "Add Bill" to record your first shared expense.
                      </div>
                    ) : (
                      bills.slice(0, 4).map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBillId(b.id);
                            setSelectedGroupId(b.groupId);
                            setActiveTab('bill_detail');
                          }}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all hover:border-emerald-500 flex items-center justify-between ${
                            themeMode === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                              ₹
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white">{b.title}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{b.groupName}</span>
                                <span>•</span>
                                <span>Paid by {b.paidByName}</span>
                                <span>•</span>
                                <span>{b.createdAt}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-base text-slate-900 dark:text-white">
                              ₹{b.totalAmount.toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {b.splitType} split
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Expense Groups Column */}
                <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Groups</h3>
                      <p className="text-xs text-slate-400">Expense pools</p>
                    </div>
                    <button
                      onClick={() => setShowCreateGroupModal(true)}
                      className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-200 cursor-pointer"
                      title="Create Group"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {groups.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 font-medium">
                        No groups yet. Tap "+" above to create your first group.
                      </div>
                    ) : (
                      groups.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => {
                            setSelectedGroupId(g.id);
                            setActiveTab('group_detail');
                          }}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:border-emerald-500 flex items-center justify-between ${
                            themeMode === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white">{g.name}</div>
                              <div className="text-xs text-slate-400">{g.memberCount} members</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GROUPS & EXPENSE POOLS */}
          {activeTab === 'groups' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Expense Groups
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage trips, flatmates, office lunches and team events
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create New Group
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.length === 0 ? (
                  <div className="col-span-full py-16 text-center space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-500/10">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">No Groups Created Yet</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Create your first group to start adding real members and logging shared expenses.
                    </p>
                    <button
                      onClick={() => setShowCreateGroupModal(true)}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Create First Group
                    </button>
                  </div>
                ) : (
                  groups.map((g) => (
                    <div
                      key={g.id}
                      className={`p-6 rounded-3xl border transition-all hover:shadow-lg ${
                        themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                      } flex flex-col justify-between`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {g.currency} Currency
                          </span>
                          <span className="text-xs text-slate-400">Role: {g.userRole}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{g.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {g.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{g.memberCount}</span> Members
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGroupId(g.id);
                            setActiveTab('group_detail');
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          Open Group <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GROUP DETAILS & REAL-TIME CHAT */}
          {activeTab === 'group_detail' && (
            !currentGroup ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-2xl shadow-lg">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">No Group Selected</h3>
                <p className="text-xs text-slate-400">
                  Please select or create an expense group to view members and split details.
                </p>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className={`px-5 py-2.5 rounded-2xl ${currentTheme.primaryBg} ${currentTheme.primaryHover} text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer`}
                >
                  <Plus className="w-4 h-4" /> Create Group
                </button>
              </div>
            ) : (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('groups')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    ←
                  </button>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {currentGroup.name}
                    </h2>
                    <p className="text-xs text-slate-400">{currentGroup.description}</p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setTargetBudgetInput(String(currentGroup.targetBudget || 25000));
                      setShowSetTargetModal(true);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className={`w-3.5 h-3.5 ${currentTheme.primaryText}`} /> Target Budget
                  </button>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className={`px-3.5 py-2 rounded-xl border ${currentTheme.primaryBorder} ${currentTheme.primaryText} font-bold text-xs hover:${currentTheme.lightBg} flex items-center gap-1.5 cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Member
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('add_bill');
                    }}
                    className={`px-3.5 py-2 rounded-xl ${currentTheme.primaryBg} text-white font-bold text-xs ${currentTheme.primaryHover} flex items-center gap-1.5 shadow-xs cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Bill
                  </button>
                  <button
                    onClick={() => setShowLeaveGroupModal(true)}
                    className="px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 transition-all"
                    title="Exit / Leave this group"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Exit Group
                  </button>
                </div>
              </div>

              {/* Group Target Budget Progress Card */}
              <div className={`p-5 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                <div className="flex-1 w-full space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Target Budget:
                      <span className="text-emerald-600 font-black">₹{(currentGroup.targetBudget || 25000).toLocaleString('en-IN')}</span>
                    </span>
                    <span className="text-slate-500 font-semibold">
                      Spent: ₹{(currentGroup.totalExpenses || 0).toLocaleString('en-IN')} (
                      {Math.min(100, Math.round(((currentGroup.totalExpenses || 0) / (currentGroup.targetBudget || 25000)) * 100))}%
                      )
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ((currentGroup.totalExpenses || 0) / (currentGroup.targetBudget || 25000)) > 0.9
                          ? 'bg-rose-500'
                          : ((currentGroup.totalExpenses || 0) / (currentGroup.targetBudget || 25000)) > 0.7
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round(((currentGroup.totalExpenses || 0) / (currentGroup.targetBudget || 25000)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTargetBudgetInput(String(currentGroup.targetBudget || 25000));
                    setShowSetTargetModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0"
                >
                  Edit Target
                </button>
              </div>

              {/* Tabs: Bills / Balances ("Who owes whom") / Group Chat */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Bills & Balances */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Settlement Plan ("Who Owes Whom") */}
                  <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          Minimal Settlement Plan ("Who Owes Whom")
                        </h3>
                        <p className="text-xs text-slate-400">
                          Greedy Minimum Cash Flow algorithm simplifies group debts
                        </p>
                      </div>
                    </div>

                    {settlementSummary.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
                        All group debts are completely settled! 🎉
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {settlementSummary.map((s, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border flex items-center justify-between ${
                              themeMode === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                                ₹
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                  <span className="text-rose-500">{s.payerName}</span> owes{' '}
                                  <span className="text-emerald-600">{s.payeeName}</span>
                                </div>
                                <div className="text-xs text-slate-400">UPI: {s.payeeUpi}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-base font-black text-slate-900 dark:text-white">
                                ₹{s.amount.toLocaleString('en-IN')}
                              </span>
                              <button
                                onClick={() => {
                                  setQrModalData({
                                    payeeName: s.payeeName,
                                    upiId: s.payeeUpi,
                                    amount: s.amount,
                                    note: `Settlement for ${currentGroup.name}`,
                                  });
                                  setShowQRModal(true);
                                }}
                                className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-xs"
                                title="Show UPI QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSettlePayment(s.payerId, s.payeeId, s.amount, s.payeeUpi)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                              >
                                Mark Settled
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Group Bills List */}
                  <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Bills in this Group ({currentGroupBills.length})
                    </h3>

                    <div className="space-y-3">
                      {currentGroupBills.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBillId(b.id);
                            setActiveTab('bill_detail');
                          }}
                          className={`p-4 rounded-2xl border cursor-pointer hover:border-emerald-500 transition-all flex items-center justify-between ${
                            themeMode === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">{b.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Paid by {b.paidByName} • {b.createdAt} • {b.items.length} items itemized
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-base text-slate-900 dark:text-white">
                              ₹{b.totalAmount.toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600">View & Print →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Col: Group Members & Instant Chat Activity */}
                <div className="space-y-6">
                  {/* Members Card with Admin / Member role and Kick option */}
                  <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Members ({currentGroupMembers.length})
                      </h3>
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {currentGroupMembers.map((m) => {
                        const isGroupAdmin = currentGroup.createdBy === currentUser?.id || currentGroupMembers.find((mem) => mem.userId === currentUser?.id)?.role === 'admin';
                        return (
                          <div key={m.id} className="flex items-center justify-between text-xs py-1">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 font-bold flex items-center justify-center text-[11px]">
                                {m.fullName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {m.fullName}
                                  {m.userId === currentUser?.id && (
                                    <span className="text-[10px] text-emerald-600 font-semibold">(You)</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">{m.upiId}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.role === 'admin'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {m.role}
                              </span>
                              {isGroupAdmin && m.userId !== currentUser?.id && (
                                <button
                                  onClick={() => handleRemoveMember(m)}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title={`Remove ${m.fullName} from group`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group Activity & Live Chat */}
                  <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Send className="w-4 h-4 text-emerald-500" /> Group Chat & Discussion
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                      </span>
                    </div>

                    <div className="h-64 overflow-y-auto space-y-2.5 pr-1">
                      {chats
                        .filter((c) => c.groupId === currentGroup.id)
                        .map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded-xl text-xs ${
                              msg.isSystem
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium'
                                : msg.userId === currentUser?.id
                                ? 'bg-emerald-500 text-white ml-6'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-6'
                            }`}
                          >
                            {!msg.isSystem && (
                              <div className="font-bold text-[10px] opacity-75 mb-0.5">{msg.userName}</div>
                            )}
                            <div>{msg.text}</div>
                            <div className="text-[9px] opacity-60 text-right mt-1">{msg.time}</div>
                          </div>
                        ))}
                    </div>

                    {/* Chat Message Input Form */}
                    <form onSubmit={handleSendGroupChat} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={newChatText}
                        onChange={(e) => setNewChatText(e.target.value)}
                        placeholder="Write a message to group..."
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-hidden ${
                          themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                      <button
                        type="submit"
                        className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
                        title="Send message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* TAB 4: ADD SMART BILL (Equal, Percentage, Exact, Custom Shares) */}
          {activeTab === 'add_bill' && (
            !currentGroup ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-2xl shadow-lg">
                  <Receipt className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Create a Group First</h3>
                <p className="text-xs text-slate-400">
                  You need to create a group before you can add bills and split expenses.
                </p>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Group Now
                </button>
              </div>
            ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-6 rounded-3xl bg-linear-to-r from-emerald-600 to-teal-700 text-white shadow-xl">
                <h2 className="text-2xl font-black">Add Smart Bill</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Itemized bill calculation with Equal, Percentage, Exact Amount, or Custom Shares split
                </p>
              </div>

              <div className={`p-6 sm:p-8 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-6`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const title = (form.elements.namedItem('bill_title') as HTMLInputElement).value;
                    const amount = parseFloat((form.elements.namedItem('bill_amount') as HTMLInputElement).value);
                    const splitType = (form.elements.namedItem('split_type') as HTMLSelectElement).value as any;

                    if (!title || !amount || amount <= 0 || !currentUser || !currentGroup) return;

                    const finalCategory = billCategory === 'Other' && customCategoryName.trim() ? customCategoryName.trim() : billCategory;

                    // Compute splits across current group members
                    const memberCount = Math.max(1, currentGroupMembers.length);
                    const splitShare = Math.round((amount / memberCount) * 100) / 100;

                    const newBill: Bill = {
                      id: Date.now(),
                      groupId: currentGroup.id,
                      groupName: currentGroup.name,
                      paidBy: currentUser.id,
                      paidByName: currentUser.fullName,
                      title,
                      description: 'Itemized expense added via Smart Split Bill UI',
                      totalAmount: amount,
                      category: finalCategory,
                      splitType,
                      createdAt: new Date().toLocaleString(),
                      items: [
                        { id: '1', name: title, price: amount, quantity: 1, total: amount },
                      ],
                      splits: currentGroupMembers.length > 0 ? currentGroupMembers.map((m) => ({
                        userId: m.userId,
                        fullName: m.fullName,
                        owedAmount: splitShare,
                        percentage: Math.round((100 / memberCount) * 10) / 10,
                        shares: 1,
                        isSettled: m.userId === currentUser.id,
                      })) : [{
                        userId: currentUser.id,
                        fullName: currentUser.fullName,
                        owedAmount: amount,
                        percentage: 100,
                        shares: 1,
                        isSettled: true,
                      }],
                    };

                    const updatedBills = [newBill, ...bills];
                    const updatedGroups = groups.map((g) =>
                      g.id === currentGroup.id ? { ...g, totalExpenses: (g.totalExpenses || 0) + amount } : g
                    );

                    setBills(updatedBills);
                    setGroups(updatedGroups);
                    DataStore.saveBills(updatedBills);
                    DataStore.saveGroups(updatedGroups);

                    // Add group chat notification
                    const billChat: ChatMessage = {
                      id: Date.now(),
                      groupId: currentGroup.id,
                      userId: currentUser.id,
                      userName: currentUser.fullName,
                      text: `${currentUser.fullName} added a bill: "${title}" (₹${amount}) in ${finalCategory}.`,
                      isSystem: true,
                      time: 'Just now',
                    };
                    const updatedChats = [...chats, billChat];
                    setChats(updatedChats);
                    DataStore.saveChats(updatedChats);

                    setSelectedBillId(newBill.id);
                    setActiveTab('bill_detail');
                    setCustomCategoryName('');
                    showToast(`Bill "${title}" (₹${amount}) in category "${finalCategory}" added!`);
                  }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Target Group
                      </label>
                      <select
                        value={selectedGroupId ?? ''}
                        onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                        className={`w-full p-3 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} text-sm font-semibold outline-hidden`}
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.memberCount} members)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Category
                      </label>
                      <select
                        value={billCategory}
                        onChange={(e) => setBillCategory(e.target.value)}
                        className={`w-full p-3 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} text-sm font-semibold outline-hidden`}
                      >
                        {['Food', 'Travel', 'Shopping', 'Rent', 'Utilities', 'Entertainment', 'Medical', 'Education', 'Other'].map(
                          (c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          )
                        )}
                      </select>

                      {/* Custom Category Input if Other is clicked */}
                      {billCategory === 'Other' && (
                        <div className="mt-3">
                          <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                            Type Custom Category Name
                          </label>
                          <input
                            type="text"
                            required
                            value={customCategoryName}
                            onChange={(e) => setCustomCategoryName(e.target.value)}
                            placeholder="e.g. Scuba Diving, Project Printing, Gift"
                            className={`w-full p-3 rounded-2xl border text-sm font-semibold outline-hidden ${
                              themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Bill Title / Merchant Name
                      </label>
                      <input
                        name="bill_title"
                        required
                        placeholder="e.g. Calangute Beach Shack Dinner"
                        className={`w-full p-3 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} text-sm font-semibold outline-hidden`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Total Amount (₹)
                      </label>
                      <input
                        name="bill_amount"
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 2400"
                        className={`w-full p-3 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} text-sm font-semibold outline-hidden`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Splitting Method
                    </label>
                    <select
                      name="split_type"
                      className={`w-full p-3 rounded-2xl border ${themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'} text-sm font-semibold outline-hidden`}
                    >
                      <option value="equal">A. Split Equally (Equal share per member)</option>
                      <option value="percentage">B. Split by Percentage (Totals 100%)</option>
                      <option value="exact">C. Split by Exact Amount</option>
                      <option value="shares">D. Split by Custom Shares (Ratio shares)</option>
                    </select>
                  </div>

                  {/* OCR & Receipt Upload Simulation */}
                  <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
                    <Sparkles className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Smart Receipt OCR Engine (Demo Mode)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Receipt scanning abstraction ready for Google Cloud Vision / Tesseract integration
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
                    >
                      Save Bill & Calculate Splits
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ))}

          {/* TAB 5: SMART BILL PRINTING & DIGITAL RECEIPT */}
          {activeTab === 'bill_detail' && (
            !currentBill ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-2xl shadow-lg">
                  <Receipt className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">No Bill Selected</h3>
                <p className="text-xs text-slate-400">
                  Select a bill from the dashboard or add a new bill to print a smart digital receipt.
                </p>
                <button
                  onClick={() => setActiveTab('add_bill')}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Bill
                </button>
              </div>
            ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between no-print">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  ← Back to Dashboard
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintBill}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-emerald-700"
                  >
                    <Printer className="w-4 h-4" /> Print Smart Bill
                  </button>
                </div>
              </div>

              {/* DIGITAL PRINTABLE VOUCHER RECEIPT WIDGET */}
              <div
                id="printable-bill"
                className={`p-8 sm:p-10 rounded-3xl border shadow-xl ${
                  themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                } relative`}
              >
                {/* Decorative Jagged Receipt Top */}
                <div className="text-center pb-6 border-b-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center font-bold text-xl mb-2">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight uppercase">SMART SPLIT BILL</h2>
                  <p className="text-xs text-slate-400">Digital Tax Invoice & Expense Settlement Voucher</p>
                  <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Voucher Ref: SSB-{currentBill.id} • Group: {currentBill.groupName}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-5 text-xs border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400">Bill Title:</span>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{currentBill.title}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Date & Time:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{currentBill.createdAt}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Paid By:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{currentBill.paidByName}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Split Method:</span>
                    <div className="font-bold capitalize text-slate-800 dark:text-slate-200 mt-0.5">
                      {currentBill.splitType} Split
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="py-5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                    <span>Item Description</span>
                    <span>Total (₹)</span>
                  </div>

                  {currentBill.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-xs py-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {it.name} <span className="text-slate-400">(Qty: {it.quantity})</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{it.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-black">
                    <span>Total Amount</span>
                    <span className="text-emerald-600">₹{currentBill.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Member-wise Split Breakdown */}
                <div className="py-5 border-t-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Member-Wise Split Share
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentBill.splits.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs"
                      >
                        <div className="font-bold">{s.fullName}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-black">₹{s.owedAmount}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                              s.isSettled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {s.isSettled ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Stamp */}
                <div className="text-center pt-4 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  Generated by Smart Split Bill Engine • Persistent Database Verified
                </div>
              </div>
            </div>
          ))}

          {/* TAB 6: UPI PAYMENTS & DYNAMIC QR */}
          {activeTab === 'settle' && (
            !currentGroup ? (
              <div className="py-16 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-2xl shadow-lg">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">No Groups to Settle</h3>
                <p className="text-xs text-slate-400">
                  Create or select a group to view and settle pending balances via UPI QR.
                </p>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Group
                </button>
              </div>
            ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-6 rounded-3xl bg-linear-to-r from-emerald-600 to-teal-700 text-white shadow-xl flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">UPI Payments & QR Settlement</h2>
                  <p className="text-emerald-100 text-sm mt-1">
                    Scan with Google Pay, PhonePe, Paytm, or BHIM to settle group expenses instantly
                  </p>
                </div>
                <QrCode className="w-10 h-10 opacity-80 hidden sm:block" />
              </div>

              {/* Simplified Debts Table */}
              <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Debts to Settle in {currentGroup.name}
                </h3>

                {settlementSummary.length === 0 ? (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400">
                    No pending debts to settle in this group! All balances are balanced.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settlementSummary.map((s, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          themeMode === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold">
                            {s.payerName} → {s.payeeName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">Payee UPI ID: {s.payeeUpi}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-emerald-600">
                            ₹{s.amount.toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => {
                              setQrModalData({
                                payeeName: s.payeeName,
                                upiId: s.payeeUpi,
                                amount: s.amount,
                                note: `Settlement for ${currentGroup.name}`,
                              });
                              setShowQRModal(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs"
                          >
                            <QrCode className="w-4 h-4" /> Generate QR
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment History Log */}
              <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Payment History & Transaction References
                </h3>

                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                        themeMode === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {p.payerName} paid ₹{p.amount} to {p.payeeName}
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            Ref: {p.transactionRef} • Method: {p.paymentMethod} • {p.createdAt}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* TAB 7: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Financial Reports & Analytics
                  </h2>
                  <p className="text-xs text-slate-400">Monthly breakdown and category-wise spending</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export Report
                </button>
              </div>

              {/* Category Spending Bars */}
              <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Category Spending</h3>

                <div className="space-y-3">
                  {categoryBreakdown.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No expense data recorded yet. Add bills in any group to view category spending breakdown.
                    </div>
                  ) : (
                    categoryBreakdown.map((row, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{row.cat}</span>
                          <span>₹{row.amount.toLocaleString('en-IN')} ({row.pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ADMIN & SQLITE AUDIT LOGS */}
          {activeTab === 'admin' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">System Admin & Audit Logs</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    System logs, registered users, and event audit trails
                  </p>
                </div>
                <ShieldCheck className="w-10 h-10 opacity-80 hidden sm:block text-slate-400" />
              </div>

              {/* Registered Users Table */}
              <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Registered Users ({users.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2">ID</th>
                        <th className="py-2">Name</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">UPI ID</th>
                        <th className="py-2">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="py-2.5 font-bold">{u.id}</td>
                          <td className="py-2.5 font-bold">{u.fullName}</td>
                          <td className="py-2.5 text-slate-400">{u.email}</td>
                          <td className="py-2.5 text-slate-400">{u.upiId}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] bg-slate-100 dark:bg-slate-800">
                              {u.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Log Trail */}
              <div className={`p-6 rounded-3xl border ${themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} shadow-xs space-y-4`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  System Audit Logs (Persistent Events)
                </h3>

                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-600">[{log.action}]</span>{' '}
                        <span className="text-slate-800 dark:text-slate-200">{log.details}</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">By {log.userName}</div>
                      </div>
                      <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embedded Supabase Leads & Database Hub inside Admin */}
              <div className="pt-2">
                <SupabaseLeadsManager themeMode={themeMode} />
              </div>
            </div>
          )}



          {/* TAB 9: PROFILE & SETTINGS */}
          {activeTab === 'profile' && currentUser && (
            <ProfileView
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              colorTheme={colorTheme}
              onSelectColorTheme={handleSetColorTheme}
              unlockedAdmin={unlockedAdmin}
              onOpenAdmin={() => setActiveTab('admin')}
              onPromptAdminKey={() => {
                setAdminPasswordError(null);
                setShowAdminPasswordModal(true);
              }}
              onResetDemoData={() => {
                DataStore.resetToDemoData();
                setGroups(DataStore.getGroups());
                setBills(DataStore.getBills());
                setPayments(DataStore.getPayments());
                showToast('Reset to original demo data successfully!');
              }}
              showToast={showToast}
            />
          )}

          {/* TAB 10: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Notifications</h2>

              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{n.message}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: CREATE NEW EXPENSE GROUP */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black">Create Expense Group</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Group Name
                </label>
                <input
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Manali Trip / Flat 302"
                  className={`w-full p-3 rounded-2xl border ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  } text-sm font-semibold outline-hidden`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Shared trip expenses, travel, hotels and food..."
                  className={`w-full p-3 rounded-2xl border ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  } text-sm font-semibold outline-hidden`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MEMBER */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black">Add Member to {currentGroup?.name || 'Group'}</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Member's Full Name *
                </label>
                <input
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Rohan Verma, Ananya Sen"
                  className={`w-full p-3 rounded-2xl border ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  } text-sm font-semibold outline-hidden`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="+91 90820 XXXXX"
                    className={`w-full p-2.5 rounded-2xl border ${
                      themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    } text-sm font-semibold outline-hidden`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Email / Gmail
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className={`w-full p-2.5 rounded-2xl border ${
                      themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    } text-sm font-semibold outline-hidden`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  UPI ID (Optional - for settlements)
                </label>
                <input
                  type="text"
                  value={newMemberUpi}
                  onChange={(e) => setNewMemberUpi(e.target.value)}
                  placeholder="e.g. rohan@okhdfc"
                  className={`w-full p-2.5 rounded-2xl border ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  } text-sm font-semibold outline-hidden`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DYNAMIC UPI QR CODE DISPLAY */}
      {showQRModal && qrModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm p-6 sm:p-8 rounded-3xl border shadow-2xl text-center ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Scan & Pay via UPI</span>
              <button onClick={() => setShowQRModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-black">{qrModalData.payeeName}</h3>
            <div className="text-xs text-slate-400 mt-0.5">{qrModalData.upiId}</div>

            {/* Dynamic Vector QR Code */}
            <div className="my-5 p-4 rounded-3xl bg-white border border-slate-200 inline-block shadow-lg">
              <img
                src={getUpiQrUrl(qrModalData.upiId, qrModalData.payeeName, qrModalData.amount, qrModalData.note)}
                alt="UPI Payment QR Code"
                className="w-48 h-48 rounded-xl object-contain"
              />
            </div>

            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{qrModalData.amount.toLocaleString('en-IN')}
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Supports Google Pay, PhonePe, Paytm, and BHIM
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrModalData.upiId);
                  showToast('UPI ID copied to clipboard!');
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy UPI ID
              </button>

              <button
                onClick={() => {
                  setShowQRModal(false);
                  showToast('Payment settled successfully!');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
              >
                Done / I Have Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EXIT / LEAVE GROUP CONFIRMATION */}
      {showLeaveGroupModal && currentGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
                <LogOut className="w-5 h-5" />
              </div>
              <button onClick={() => setShowLeaveGroupModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-black">Exit "{currentGroup.name}"?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to leave this group? You will no longer receive group expense updates or notifications.
            </p>

            <div className="flex justify-end gap-2.5 pt-6">
              <button
                type="button"
                onClick={() => setShowLeaveGroupModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-md transition-all"
              >
                Yes, Leave Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SET GROUP TARGET BUDGET */}
      {showSetTargetModal && currentGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <button onClick={() => setShowSetTargetModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-black">Set Target Budget for {currentGroup.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Set an overall spending limit or target for this trip/group.
            </p>

            <form onSubmit={handleSetTargetBudget} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Target Budget Amount (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  required
                  value={targetBudgetInput}
                  onChange={(e) => setTargetBudgetInput(e.target.value)}
                  placeholder="e.g. 30000"
                  className={`w-full p-3 rounded-2xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSetTargetModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ADMIN MASTER PASSWORD UNLOCK */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm p-6 sm:p-8 rounded-3xl border shadow-2xl ${
              themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <button onClick={() => setShowAdminPasswordModal(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-black">System Admin Portal</h3>
            <p className="text-xs text-slate-400 mt-1">
              Restricted to instructors and system administrators. Enter Master Key.
            </p>

            {adminPasswordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold mt-3">
                {adminPasswordError}
              </div>
            )}

            <form onSubmit={handleUnlockAdmin} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter Admin Master Key"
                  className={`w-full p-3 rounded-2xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">Demo Admin Key: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">Admin@12345</span></p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
                >
                  Unlock Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
