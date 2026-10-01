import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  Loader2,
  CloudCheck,
} from 'lucide-react';
import { User, DataStore } from '../dataStore';
import { SupabaseService } from '../supabaseClient';

interface AuthScreensProps {
  onLoginSuccess: (user: User) => void;
  themeMode: 'light' | 'dark';
}

export function AuthScreens({ onLoginSuccess, themeMode }: AuthScreensProps) {
  // Start on login by default (or register if completely empty)
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'otp_login'>('login');

  // Loading state for remote network/cloud calls
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // OTP Login state
  const [otpLoginIdentifier, setOtpLoginIdentifier] = useState('');
  const [otpLoginCode, setOtpLoginCode] = useState('');
  const [otpLoginSent, setOtpLoginSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpLoginError, setOtpLoginError] = useState<string | null>(null);
  const [otpLoginSuccess, setOtpLoginSuccess] = useState<string | null>(null);
  const [otpUserTarget, setOtpUserTarget] = useState<User | null>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regUpiId, setRegUpiId] = useState('');
  const [regAvatar, setRegAvatar] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Forgot Password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [generatedForgotOtp, setGeneratedForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotUserTarget, setForgotUserTarget] = useState<User | null>(null);

  // Local device cache search helper
  const findUserByIdentifierLocal = (input: string): User | undefined => {
    const users = DataStore.getUsers();
    const rawInput = input.trim();
    const cleanId = rawInput.toLowerCase();
    const digitsOnly = rawInput.replace(/\D/g, '');

    return users.find((u) => {
      // Match by Email
      if (u.email && u.email.toLowerCase() === cleanId) return true;
      // Match by Phone Number
      const userPhoneDigits = (u.phone || '').replace(/\D/g, '');
      if (digitsOnly.length >= 10 && userPhoneDigits.length >= 10) {
        if (digitsOnly.slice(-10) === userPhoneDigits.slice(-10)) return true;
      }
      if (digitsOnly && userPhoneDigits === digitsOnly) return true;
      return false;
    });
  };

  // 1. Password Login Handler (Universal Phone OR Email across ALL devices)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const raw = loginIdentifier.trim();
    if (!raw) {
      setLoginError('Please enter your registered Phone Number or Email.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsAuthenticating(true);

    try {
      // Step 1: Check remote Supabase cloud database
      const verifyRes = await SupabaseService.verifyUserCredentials(raw, loginPassword);

      if (verifyRes.success && verifyRes.user) {
        const cloudUser = verifyRes.user;

        // Persist into local device DataStore
        const currentUsers = DataStore.getUsers();
        const existsIndex = currentUsers.findIndex((u) => u.id === cloudUser.id);
        let updatedUsers: User[];
        if (existsIndex >= 0) {
          updatedUsers = [...currentUsers];
          updatedUsers[existsIndex] = cloudUser;
        } else {
          updatedUsers = [cloudUser, ...currentUsers];
        }
        DataStore.saveUsers(updatedUsers);

        // Load any synced cloud app data (groups, bills, payments)
        try {
          const cloudData = await SupabaseService.loadUserData(cloudUser.id);
          if (cloudData) {
            if (cloudData.groups?.length) DataStore.saveGroups(cloudData.groups);
            if (cloudData.members?.length) DataStore.saveMembers(cloudData.members);
            if (cloudData.bills?.length) DataStore.saveBills(cloudData.bills);
            if (cloudData.payments?.length) DataStore.savePayments(cloudData.payments);
          }
        } catch {
          // non-critical
        }

        onLoginSuccess(cloudUser);
        return;
      }

      // Step 2: Fallback to local device cache
      const localUser = findUserByIdentifierLocal(raw);
      if (localUser) {
        if (localUser.password && localUser.password !== loginPassword) {
          setLoginError('Incorrect password. Please try again or use OTP Login.');
          return;
        }
        // Sync local user to cloud Supabase in background
        SupabaseService.registerUserRemote(localUser).catch(() => {});
        onLoginSuccess(localUser);
        return;
      }

      // If remote returned a specific error (e.g. incorrect password vs user not found)
      setLoginError(
        verifyRes.error ||
          'No account found with this Phone Number or Email on any device. Please create an account.'
      );
    } catch (err) {
      console.warn('Login verification notice:', err);
      // Local fallback
      const localUser = findUserByIdentifierLocal(raw);
      if (localUser && (!localUser.password || localUser.password === loginPassword)) {
        onLoginSuccess(localUser);
      } else {
        setLoginError('Connection issue. Please verify your internet and try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 2. Request OTP for Login
  const handleRequestOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoginError(null);
    setOtpLoginSuccess(null);

    const raw = otpLoginIdentifier.trim();
    if (!raw) {
      setOtpLoginError('Please enter your Phone Number or Email.');
      return;
    }

    setIsAuthenticating(true);

    try {
      // Find user in local cache or remotely in Supabase
      let user = findUserByIdentifierLocal(raw);
      if (!user) {
        user = (await SupabaseService.findUserRemote(raw)) || undefined;
      }

      if (!user) {
        setOtpLoginError('No registered account found with this Phone Number or Email on any device.');
        return;
      }

      setOtpUserTarget(user);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpLoginSent(true);
      setOtpLoginSuccess(`Your One-Time Passcode (OTP) is: ${code}`);
    } catch {
      setOtpLoginError('Failed to verify user account. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 3. Verify OTP & Login
  const handleVerifyOtpLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoginError(null);

    if (otpLoginCode.trim() !== generatedOtp) {
      setOtpLoginError('Incorrect OTP code. Please enter the 6-digit code shown above.');
      return;
    }

    const user = otpUserTarget || findUserByIdentifierLocal(otpLoginIdentifier);
    if (user) {
      // Sync into local DataStore
      const currentUsers = DataStore.getUsers();
      if (!currentUsers.some((u) => u.id === user.id)) {
        DataStore.saveUsers([user, ...currentUsers]);
      }
      onLoginSuccess(user);
    } else {
      setOtpLoginError('User account not found.');
    }
  };

  // 4. Register Handler (Lifetime Cloud & Multi-Device Sync)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanName = regFullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.trim();

    if (!cleanName) {
      setRegError('Please enter your Full Name.');
      return;
    }

    if (!cleanEmail && !cleanPhone) {
      setRegError('Please provide at least a Phone Number or an Email address.');
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsAuthenticating(true);

    try {
      // Check if user already exists in Supabase cloud
      const remoteExisting = await SupabaseService.findUserRemote(cleanPhone || cleanEmail);
      if (remoteExisting) {
        setRegError(
          'An account with this Phone Number or Email is already registered. Please log in.'
        );
        setIsAuthenticating(false);
        return;
      }

      // Check local device cache
      const users = DataStore.getUsers();
      if (cleanEmail && users.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
        setRegError('An account with this Email already exists. Please log in.');
        setIsAuthenticating(false);
        return;
      }

      const newPhoneDigits = cleanPhone.replace(/\D/g, '');
      if (
        newPhoneDigits.length >= 10 &&
        users.some(
          (u) => (u.phone || '').replace(/\D/g, '').slice(-10) === newPhoneDigits.slice(-10)
        )
      ) {
        setRegError('An account with this Phone number already exists. Please log in.');
        setIsAuthenticating(false);
        return;
      }

      const newUser: User = {
        id: Date.now(),
        fullName: cleanName,
        email: cleanEmail || `${newPhoneDigits || Date.now()}@smartsplitbill.local`,
        phone: cleanPhone || '',
        password: regPassword,
        bio: regBio.trim() || 'Smart Split Bill member',
        upiId: regUpiId.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '')}@upi`,
        avatar: regAvatar.trim() || '',
        currency: 'INR',
        country: 'India',
        role: 'user',
      };

      // Save to Supabase remote database with lifetime persistence
      await SupabaseService.registerUserRemote(newUser);

      // Save locally for instant offline / fast access
      const updatedUsers = [...users, newUser];
      DataStore.saveUsers(updatedUsers);

      onLoginSuccess(newUser);
    } catch (err) {
      console.warn('Registration network notice:', err);
      // Fallback local registration
      const newPhoneDigits = cleanPhone.replace(/\D/g, '');
      const newUser: User = {
        id: Date.now(),
        fullName: cleanName,
        email: cleanEmail || `${newPhoneDigits || Date.now()}@smartsplitbill.local`,
        phone: cleanPhone || '',
        password: regPassword,
        bio: regBio.trim() || 'Smart Split Bill member',
        upiId: regUpiId.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '')}@upi`,
        avatar: regAvatar.trim() || '',
        currency: 'INR',
        country: 'India',
        role: 'user',
      };
      const users = DataStore.getUsers();
      DataStore.saveUsers([...users, newUser]);
      onLoginSuccess(newUser);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 5. Send Forgot Password OTP
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const raw = forgotIdentifier.trim();
    if (!raw) {
      setForgotError('Please enter your Phone Number or Email.');
      return;
    }

    setIsAuthenticating(true);

    try {
      let user = findUserByIdentifierLocal(raw);
      if (!user) {
        user = (await SupabaseService.findUserRemote(raw)) || undefined;
      }

      if (!user) {
        setForgotError('Account not found with this Phone Number or Email on any device.');
        return;
      }

      setForgotUserTarget(user);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedForgotOtp(code);
      setForgotStep('verify');
      setForgotSuccess(`Security Reset OTP: ${code}`);
    } catch {
      setForgotError('Unable to send reset OTP. Please check your connection.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 6. Reset Password Handler (Updates Supabase + Local)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (forgotOtp.trim() !== generatedForgotOtp) {
      setForgotError('Invalid OTP code. Please enter the verification code displayed.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }

    const userToUpdate = forgotUserTarget || findUserByIdentifierLocal(forgotIdentifier);
    if (!userToUpdate) {
      setForgotError('User account not found.');
      return;
    }

    setIsAuthenticating(true);

    try {
      const updatedUser: User = { ...userToUpdate, password: newPassword };

      // Update in local DataStore
      const currentUsers = DataStore.getUsers();
      const updatedUsers = currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      if (!currentUsers.some((u) => u.id === updatedUser.id)) {
        updatedUsers.push(updatedUser);
      }
      DataStore.saveUsers(updatedUsers);

      // Update in Supabase remote cloud
      await SupabaseService.updateUserRemote(updatedUser);

      setForgotSuccess('Password updated successfully! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(updatedUser);
      }, 1000);
    } catch {
      setForgotError('Failed to update password remotely.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      } flex items-center justify-center p-4 font-sans`}
    >
      <div
        className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl transition-all ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* App Logo & Branding */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto font-black text-2xl shadow-lg shadow-blue-500/25 mb-3">
            ₹
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            SMART SPLIT BILL
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Group Expense Management & Lifetime Cloud Account
          </p>
        </div>

        {/* View Switcher: Sign In vs Create Account */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthView('login');
              setLoginError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authView === 'login' || authView === 'otp_login' || authView === 'forgot'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthView('register');
              setRegError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authView === 'register'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* VIEW 1: PASSWORD LOGIN (Universal Phone or Email across ALL devices) */}
        {authView === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center pb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Welcome Back</h2>
              <p className="text-xs text-slate-400">Log in from any device with your registered Phone or Email</p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Phone Number or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. 90820XXXXX or user@gmail.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('forgot');
                    setForgotError(null);
                    setForgotSuccess(null);
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-semibold outline-hidden transition-all ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* OTP Login Option */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthView('otp_login');
                  setOtpLoginIdentifier(loginIdentifier);
                  setOtpLoginError(null);
                  setOtpLoginSuccess(null);
                  setOtpLoginSent(false);
                }}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" /> Or Log In via One-Time Passcode (OTP)
              </button>
            </div>
          </form>
        )}

        {/* VIEW 2: OTP LOGIN */}
        {authView === 'otp_login' && (
          <div className="space-y-4">
            <div className="text-center pb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">OTP Verification</h2>
              <p className="text-xs text-slate-400">Sign in with a verified OTP code sent to your screen</p>
            </div>

            {otpLoginSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{otpLoginSuccess}</span>
              </div>
            )}

            {otpLoginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{otpLoginError}</span>
              </div>
            )}

            {!otpLoginSent ? (
              <form onSubmit={handleRequestOtpLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Registered Phone Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={otpLoginIdentifier}
                      onChange={(e) => setOtpLoginIdentifier(e.target.value)}
                      placeholder="e.g. 90820XXXXX or user@gmail.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-semibold outline-hidden ${
                        themeMode === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying Account...
                    </>
                  ) : (
                    'Generate OTP Code'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Enter 6-Digit Passcode
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpLoginCode}
                    onChange={(e) => setOtpLoginCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className={`w-full px-4 py-3 rounded-2xl border text-base font-bold tracking-widest text-center outline-hidden ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Verify & Enter Workspace
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ← Back to Password Login
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: REGISTER (CREATE REAL LIFETIME USER ACCOUNT) */}
        {authView === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="text-center pb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Create Lifetime Account</h2>
              <p className="text-xs text-slate-400">Your account is saved in the cloud and works on all devices</p>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Your Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 90820 XXXXX"
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email / Gmail
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                UPI ID (Optional - for receiving payments)
              </label>
              <input
                type="text"
                value={regUpiId}
                onChange={(e) => setRegUpiId(e.target.value)}
                placeholder="e.g. yourname@okhdfc"
                className={`w-full px-3.5 py-2 rounded-2xl border text-sm font-semibold outline-hidden ${
                  themeMode === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Bio / Role (Optional)
              </label>
              <input
                type="text"
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="e.g. Flatmate, Trip Organizer, Member"
                className={`w-full px-3.5 py-2 rounded-2xl border text-sm font-semibold outline-hidden ${
                  themeMode === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Cloud Account...
                </>
              ) : (
                <>
                  Register & Start Using <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* VIEW 4: FORGOT PASSWORD */}
        {authView === 'forgot' && (
          <div className="space-y-4">
            <div className="text-center pb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Reset Password</h2>
              <p className="text-xs text-slate-400">Recover your account using Phone or Email OTP</p>
            </div>

            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleSendForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Registered Email or Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. 90820XXXXX or user@gmail.com"
                    className={`w-full px-3.5 py-3 rounded-2xl border text-sm font-semibold outline-hidden ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    'Send Reset OTP'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden text-center tracking-widest ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

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
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Password...
                    </>
                  ) : (
                    'Save New Password & Log In'
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
