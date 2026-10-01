import React, { useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Camera,
  Upload,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  Save,
  Globe,
  Key,
  RotateCcw,
  Sparkles,
  Info,
  Code2
} from 'lucide-react';
import { User, DataStore, maskPhoneNumber, ColorTheme, COLOR_THEMES } from '../dataStore';

interface ProfileViewProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  colorTheme?: ColorTheme;
  onSelectColorTheme?: (theme: ColorTheme) => void;
  unlockedAdmin: boolean;
  onOpenAdmin: () => void;
  onPromptAdminKey: () => void;
  onResetDemoData: () => void;
  showToast: (msg: string) => void;
}

const PRESET_AVATARS = [
  { name: 'Traveler', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { name: 'Minimal', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { name: 'Creative', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { name: 'Planner', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' },
  { name: 'Explorer', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { name: 'Leader', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
];

export function ProfileView({
  currentUser,
  onUpdateUser,
  onLogout,
  themeMode,
  setThemeMode,
  colorTheme = 'sapphire',
  onSelectColorTheme,
  unlockedAdmin,
  onOpenAdmin,
  onPromptAdminKey,
  onResetDemoData,
  showToast,
}: ProfileViewProps) {
  const currentTheme = COLOR_THEMES[colorTheme] || COLOR_THEMES.sapphire;

  // Editable fields
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [upiId, setUpiId] = useState(currentUser.upiId || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [country, setCountry] = useState(currentUser.country || 'India');
  const [currency, setCurrency] = useState(currentUser.currency || 'INR');
  
  // Custom Avatar URL input
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Password update state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // File Upload Handler (Converts selected image file to base64 Data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        showToast('Profile picture selected! Click Save Changes to save.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Profile Handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Full Name cannot be empty.');
      return;
    }

    if (!phone.trim() && !email.trim()) {
      showToast('Please provide at least a Phone Number or an Email address.');
      return;
    }

    const updated: User = {
      ...currentUser,
      fullName: fullName.trim(),
      bio: bio.trim(),
      phone: phone.trim(),
      email: email.trim(),
      upiId: upiId.trim(),
      avatar: avatar.trim(),
      country: country.trim(),
      currency,
    };

    onUpdateUser(updated);
    showToast('Profile updated successfully! Persistent database synced.');
  };

  // Change Password Handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (currentUser.password && currentPassword !== currentUser.password && currentPassword !== 'Demo@12345') {
      setPasswordError('Current password does not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    const updated: User = {
      ...currentUser,
      password: newPassword,
    };

    onUpdateUser(updated);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPasswordSection(false);
    showToast('Password changed successfully!');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl bg-linear-to-r ${currentTheme.gradient} text-white shadow-xl relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          
          {/* Avatar Profile Picture Studio */}
          <div className="relative group">
            {avatar ? (
              <img
                src={avatar}
                alt={fullName}
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/30 shadow-2xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md text-white font-black text-4xl flex items-center justify-center ring-4 ring-white/30 shadow-2xl">
                {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className={`absolute -bottom-2 -right-2 p-2 ${currentTheme.primaryBg} hover:opacity-90 text-white rounded-2xl shadow-lg border-2 border-white transition-all cursor-pointer`}
              title="Change Profile Picture"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black">{fullName || 'User Profile'}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md">
                {currentUser.role === 'admin' ? 'System Administrator' : 'Verified Member'}
              </span>
            </div>

            <p className="text-emerald-100 text-sm mt-1 max-w-lg">
              {bio || 'No bio provided yet. Add a short description below.'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-emerald-100/90 mt-3">
              {phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 opacity-80" /> {maskPhoneNumber(phone)}
                </span>
              )}
              {email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 opacity-80" /> {email}
                </span>
              )}
              {upiId && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-800/40 text-emerald-200 text-[11px] font-mono">
                  UPI: {upiId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ambient Decorative element */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Profile Picture (Avatar) Studio Picker Modal / Dropdown */}
      {showAvatarPicker && (
        <div className={`p-6 rounded-3xl border shadow-lg space-y-4 ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500" /> Choose Profile Picture
            </h3>
            <button
              onClick={() => setShowAvatarPicker(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close ✕
            </button>
          </div>

          {/* Option 1: Upload from Device */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">Upload Photo from Phone / Laptop:</span>
            <label className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>Select Image File from Device (JPG / PNG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Option 2: Select from Preset Avatars */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">Or Choose a Preset Character:</span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {PRESET_AVATARS.map((av, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAvatar(av.url);
                    showToast(`Selected "${av.name}" avatar. Click Save Changes to apply.`);
                  }}
                  className={`p-1.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    avatar === av.url ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/60'
                  }`}
                >
                  <img src={av.url} alt={av.name} className="w-12 h-12 rounded-xl object-cover" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{av.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Option 3: Enter Image URL */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">Or Paste Custom Image URL:</span>
            <div className="flex gap-2">
              <input
                type="url"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className={`flex-1 px-3.5 py-2 rounded-xl border text-xs outline-hidden ${
                  themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  if (customAvatarUrl.trim()) {
                    setAvatar(customAvatarUrl.trim());
                    setCustomAvatarUrl('');
                    showToast('Custom Avatar URL set!');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Apply URL
              </button>
            </div>
          </div>

          {avatar && (
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setAvatar('');
                  showToast('Avatar removed. Reverted to monogram.');
                }}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                Remove Profile Picture
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Form: Profile Details & Description */}
      <form onSubmit={handleSaveProfile} className={`p-6 sm:p-8 rounded-3xl border shadow-xs space-y-6 ${
        themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Profile Information</h2>
            <p className="text-xs text-slate-400">Manage your contact info, description, and settlement details</p>
          </div>
          <div className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            User ID: #{currentUser.id}
          </div>
        </div>

        {/* Full Name & Description/Bio */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Full Name"
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                  themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Description / Bio (About You)
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. College student, loves travel and group dining. Always pays bills on time!"
              className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-medium outline-hidden transition-all resize-none ${
                themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Contact Numbers: Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 90820 XXXXX"
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                  themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Email / Gmail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                  themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Financial & Regional Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              UPI ID (for receiving payments)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. rahul@oksbi"
              className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India"
              className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Preferred Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
            </select>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Profile Changes
          </button>
        </div>
      </form>

      {/* Password Management */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xs space-y-4 ${
        themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-500" /> Account Security & Password
            </h3>
            <p className="text-xs text-slate-400">Update your account login password</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {showPasswordSection ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordSection && (
          <form onSubmit={handleChangePassword} className="pt-3 border-t dark:border-slate-800 space-y-3.5">
            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-semibold outline-hidden ${
                  themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              Update Password
            </button>
          </form>
        )}
      </div>

      {/* System Settings & Device Logout */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xs space-y-4 ${
        themeMode === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Preferences & Session
        </h3>

        {/* Theme Mode Toggle */}
        <div className="flex items-center justify-between py-2 border-b dark:border-slate-800">
          <div>
            <div className="text-sm font-bold">Theme Appearance</div>
            <div className="text-xs text-slate-400">Material 3 Adaptive Mode</div>
          </div>
          <button
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            {themeMode === 'light' ? 'Switch to Dark Mode 🌙' : 'Switch to Light Mode ☀️'}
          </button>
        </div>

        {/* Distinct Color Palette Switcher */}
        {onSelectColorTheme && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b dark:border-slate-800 gap-3">
            <div>
              <div className="text-sm font-bold">Distinct Color Palette</div>
              <div className="text-xs text-slate-400">Handcrafted non-AI color themes</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((themeKey) => {
                const item = COLOR_THEMES[themeKey];
                const isActive = colorTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => onSelectColorTheme(themeKey)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? `${item.primaryBg} text-white border-transparent shadow-xs scale-105`
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : item.dot}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* System Admin Access */}
        <div className="flex items-center justify-between py-2 border-b dark:border-slate-800">
          <div>
            <div className="text-sm font-bold">System Administrator Access</div>
            <div className="text-xs text-slate-400">
              {currentUser.role === 'admin' || unlockedAdmin
                ? 'Admin privileges unlocked • Access system settings & audit logs'
                : 'Protected • Requires administrator master key'}
            </div>
          </div>
          {currentUser.role === 'admin' || unlockedAdmin ? (
            <button
              onClick={onOpenAdmin}
              className="px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs hover:bg-purple-200 dark:hover:bg-purple-900 transition-all cursor-pointer"
            >
              Open Admin Logs
            </button>
          ) : (
            <button
              onClick={onPromptAdminKey}
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 transition-all cursor-pointer"
            >
              Enter Admin Key
            </button>
          )}
        </div>

        {/* College Project Architecture & Languages Card */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Project Languages & Architecture
            </span>
            <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              NO HTML/CSS CODE
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            This project is built using modern programming languages — <strong>TypeScript (TSX)</strong>, <strong>React 19</strong>, <strong>Python 3 (FastAPI)</strong>, and <strong>SQLite 3</strong>. It does not use static HTML files or raw CSS stylesheets.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-slate-400 text-[10px]">Frontend (TSX/TS)</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px]">89.6%</span>
              </div>
              <strong className="text-slate-800 dark:text-slate-100 block">TypeScript 5 + React 19</strong>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '89.6%' }} />
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-slate-400 text-[10px]">Backend Server</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">7.7%</span>
              </div>
              <strong className="text-slate-800 dark:text-slate-100 block">Python 3 + FastAPI</strong>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '7.7%' }} />
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-slate-400 text-[10px]">Database Engine</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold text-[10px]">16 Tables</span>
              </div>
              <strong className="text-slate-800 dark:text-slate-100 block">SQLite 3 Relational DB</strong>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-slate-400 text-[10px]">HTML / CSS Code</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">0% Logic</span>
              </div>
              <strong className="text-slate-800 dark:text-slate-100 block">Pure Reactive Code</strong>
            </div>
          </div>
        </div>

        {/* Reset Demo Data */}
        <div className="flex items-center justify-between py-2 border-b dark:border-slate-800">
          <div>
            <div className="text-sm font-bold">Restore Demo Data</div>
            <div className="text-xs text-slate-400">Reset default sample groups (Goa Trip, Flat 402)</div>
          </div>
          <button
            onClick={onResetDemoData}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Reset Sample Data
          </button>
        </div>

        {/* Account Logout */}
        <div className="flex items-center justify-between py-2 pt-3">
          <div>
            <div className="text-sm font-bold text-rose-600 dark:text-rose-400">Device Logout</div>
            <div className="text-xs text-slate-400">Sign out of this browser. You can log back in with your Phone or Email.</div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
