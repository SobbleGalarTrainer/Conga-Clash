import React, { useState } from 'react';
import { useAuth, generateCustomUserIdSuggestion } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
  reason?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, reason }) => {
  const {
    user,
    signUpWithCustomId,
    loginWithCustomId,
    loginWithGoogle,
    loginWithMicrosoft,
    logoutToGuest,
    updateNickname,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'signup' | 'signin' | 'profile'>(
    user.isGuest ? 'signup' : 'profile'
  );

  // Sign Up Form States
  const [signupNickname, setSignupNickname] = useState(
    user.isGuest ? '' : user.displayName
  );
  const [signupCustomId, setSignupCustomId] = useState(() =>
    generateCustomUserIdSuggestion('CONGA')
  );
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Sign In Form States
  const [signinIdOrEmail, setSigninIdOrEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  // Edit Nickname State (when signed in)
  const [editNickname, setEditNickname] = useState(user.displayName);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleGenerateId = () => {
    const fresh = generateCustomUserIdSuggestion(
      signupNickname.trim() ? signupNickname.trim().substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DANCE' : 'CONGA'
    );
    setSignupCustomId(fresh);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = signUpWithCustomId(
      signupNickname,
      signupCustomId,
      signupEmail || undefined,
      signupPassword || undefined
    );

    if (res.success) {
      setFeedback({ text: res.message, isError: false });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setFeedback({ text: res.message, isError: true });
    }
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = loginWithCustomId(signinIdOrEmail, signinPassword || undefined);
    if (res.success) {
      setFeedback({ text: res.message, isError: false });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setFeedback({ text: res.message, isError: true });
    }
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNickname.trim()) return;
    const ok = updateNickname(editNickname.trim());
    if (ok) {
      setFeedback({ text: 'NickName updated successfully! 🎉', isError: false });
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleCopyUserId = () => {
    const idToCopy = user.customUserId || user.id;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleGoogle = () => {
    loginWithGoogle(
      signupEmail.trim() || undefined,
      signupNickname.trim() || undefined
    );
    onClose();
  };

  const handleMicrosoft = () => {
    loginWithMicrosoft(
      signupEmail.trim() || undefined,
      signupNickname.trim() || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Title Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto mb-2.5 shadow-lg">
            👑
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            {user.isGuest ? 'Join Conga Carnival' : 'Dancer Profile & Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {reason || 'Unlock custom names, permanent User IDs, in-game currency & the shop!'}
          </p>
        </div>

        {/* Tab Switcher */}
        {user.isGuest ? (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl mb-5 text-xs font-bold border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('signup');
                setFeedback(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✨ Sign Up (New Account)
            </button>
            <button
              onClick={() => {
                setActiveTab('signin');
                setFeedback(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🔑 Log In (Existing)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl mb-5 text-xs font-bold border border-slate-800">
            <button
              onClick={() => setActiveTab('profile')}
              className="py-2 rounded-xl bg-amber-500 text-slate-950 shadow-md font-black cursor-pointer"
            >
              👤 My Account & User ID
            </button>
            <button
              onClick={() => {
                logoutToGuest();
                setActiveTab('signup');
              }}
              className="py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              🚪 Log Out to Guest
            </button>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold mb-4 border ${
              feedback.isError
                ? 'bg-rose-950/80 text-rose-200 border-rose-500/40'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* TAB 1: SIGN UP */}
        {user.isGuest && activeTab === 'signup' && (
          <div>
            <form onSubmit={handleSignUpSubmit} className="space-y-4 mb-5">
              {/* NickName Field */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Dancer NickName <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    ✓ Can be changed anytime
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Fiesta Maestro"
                  value={signupNickname}
                  onChange={(e) => setSignupNickname(e.target.value)}
                  maxLength={18}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Custom User ID Field (Immutable) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>Custom User ID</span>
                    <span className="text-rose-400 text-[10px] font-black uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      🔒 Permanent
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateId}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    🎲 Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. #CONGA-7777"
                    value={signupCustomId}
                    onChange={(e) => setSignupCustomId(e.target.value)}
                    maxLength={16}
                    required
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  ⚠️ <strong>Important:</strong> Your Custom User ID is permanent and cannot be changed after registration. Friends will use this exact ID to add you!
                </p>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="dancer@carnival.play"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-black text-sm rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 Create Account & Claim +500 Coins</span>
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-bold">
                  Or One-Click Social Sign Up
                </span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogle}
                className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.43 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.97 0 12s.45 3.86 1.24 5.43l4.04-3.14z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                onClick={handleMicrosoft}
                className="py-2.5 px-3 bg-[#2f2f2f] hover:bg-[#383838] text-white font-bold text-xs rounded-xl shadow transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-[#444]"
              >
                <svg className="w-4 h-4" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                <span>Microsoft</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SIGN IN */}
        {user.isGuest && activeTab === 'signin' && (
          <div>
            <form onSubmit={handleSignInSubmit} className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  User ID or Registered Nickname
                </label>
                <input
                  type="text"
                  placeholder="e.g. #CONGA-SOFIA or Salsa Sofia"
                  value={signinIdOrEmail}
                  onChange={(e) => setSigninIdOrEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-sm rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Log In to Carnival
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-bold">
                  Or Social Sign In
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogle}
                className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.43 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.97 0 12s.45 3.86 1.24 5.43l4.04-3.14z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.57 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
                </svg>
                <span>Google</span>
              </button>

              <button
                onClick={handleMicrosoft}
                className="py-2.5 px-3 bg-[#2f2f2f] hover:bg-[#383838] text-white font-bold text-xs rounded-xl shadow transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-[#444]"
              >
                <svg className="w-4 h-4" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                <span>Microsoft</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNT PROFILE (WHEN SIGNED IN) */}
        {!user.isGuest && activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Permanent Custom User ID Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <span>Custom User ID</span>
                  <span className="text-rose-400 text-[10px] uppercase font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    🔒 Permanent (Cannot be changed)
                  </span>
                </span>
                <button
                  onClick={handleCopyUserId}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors"
                >
                  <span>{copiedId ? '✓ Copied!' : '📋 Copy ID'}</span>
                </button>
              </div>

              <div className="font-mono font-black text-lg text-amber-400 tracking-wider">
                {user.customUserId || user.id}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Give this User ID to friends so they can send you conga friend requests!
              </p>
            </div>

            {/* Editable NickName */}
            <form onSubmit={handleSaveNickname} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Dancer NickName
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  ✓ Change anytime
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  maxLength={18}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-bold"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs rounded-xl shadow cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  Save NickName
                </button>
              </div>
            </form>

            {/* Stats & Balance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">Carnival Coins</span>
                <span className="font-display font-black text-xl text-amber-400">
                  🪙 {user.coins.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">Account Status</span>
                <span className="font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                  Active Dancer
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => {
                  logoutToGuest();
                  onClose();
                }}
                className="py-2.5 px-4 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs rounded-xl border border-rose-800/40 transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Footer info for guests */}
        {user.isGuest && (
          <div className="mt-5 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-400 underline cursor-pointer"
            >
              Continue playing as Guest ({user.displayName})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
