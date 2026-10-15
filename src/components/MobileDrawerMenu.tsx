import React from 'react';
import { GameMode } from '../types/game';
import { useAuth } from '../context/AuthContext';

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: GameMode | 'MENU';
  onSelectMode: (mode: GameMode | 'MENU') => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenMissions: () => void;
  onOpenFriends: () => void;
  onOpenStreak: () => void;
  onOpenAuth: () => void;
  claimableMissionsCount: number;
  isTouchControlsEnabled: boolean;
  onToggleTouchControls: () => void;
}

export const MobileDrawerMenu: React.FC<MobileDrawerMenuProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  onOpenShop,
  onOpenLeaderboard,
  onOpenMissions,
  onOpenFriends,
  onOpenStreak,
  onOpenAuth,
  claimableMissionsCount,
  isTouchControlsEnabled,
  onToggleTouchControls,
}) => {
  const { user, dailyStreak, streakMultiplier } = useAuth();

  if (!isOpen) return null;

  const modes: { id: GameMode; name: string; tag: string; icon: string; is3D: boolean }[] = [
    { id: 'SOLO_3D', name: 'Solo 3D Arena', tag: '3D', icon: '🪩', is3D: true },
    { id: 'MULTIPLAYER_3D', name: 'Multiplayer 3D Ballroom', tag: '3D Live', icon: '🌐', is3D: true },
    { id: 'ROYALE_3D', name: '100-256 Conga Royale 3D', tag: '3D Island', icon: '👑', is3D: true },
    { id: 'ARENA', name: 'Solo 2D Arena', tag: '2D Classic', icon: '🕺', is3D: false },
    { id: 'MULTIPLAYER', name: 'Multiplayer 2D Ballroom', tag: '2D Live', icon: '💬', is3D: false },
    { id: 'BATTLE_ROYALE', name: '100-256 Conga Royale 2D', tag: '2D Storm', icon: '🏝️', is3D: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200 lg:hidden">
      {/* Top Bar of Mobile Drawer */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪇</span>
          <span className="font-display font-black text-xl text-white">Conga Clash</span>
          <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-1.5 py-0.5 rounded font-black uppercase">
            Mobile Menu
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* User Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl border border-slate-700">
              {user.isGuest ? '👤' : user.provider === 'google' ? '🌐' : '🔷'}
            </div>
            <div>
              <div className="font-display font-bold text-sm text-white">{user.displayName}</div>
              <div className="text-xs text-amber-400 font-bold flex items-center gap-1">
                <span>🪙</span>
                <span>{user.coins} Carnival Coins</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
          >
            {user.isGuest ? 'Sign In' : 'Account'}
          </button>
        </div>

        {/* Daily Streak Highlight */}
        <button
          onClick={() => {
            onClose();
            onOpenStreak();
          }}
          className="w-full text-left bg-gradient-to-r from-orange-950/80 via-amber-950/60 to-slate-900 border border-orange-500/40 rounded-2xl p-3.5 flex items-center justify-between shadow-lg cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🔥</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm text-white">
                  Daily Streak: Day {dailyStreak.currentStreak}
                </span>
                <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black px-1 rounded uppercase">
                  {streakMultiplier}x Boost
                </span>
              </div>
              <span className="text-xs text-orange-400 font-medium">
                {dailyStreak.claimedToday ? 'Streak active today!' : 'Tap to claim today’s reward!'}
              </span>
            </div>
          </div>
          <span className="text-slate-400 font-bold text-lg">›</span>
        </button>

        {/* 6 Game Modes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              6 Carnival Game Modes
            </span>
            <button
              onClick={() => {
                onClose();
                onSelectMode('MENU');
              }}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              Mode Hub
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onClose();
                  onSelectMode(m.id);
                }}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  currentMode === m.id
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl">{m.icon}</span>
                  <div className="truncate">
                    <div className="font-display font-bold text-xs truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-400">{m.tag}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${m.is3D ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  PLAY
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Access Menu Cards */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Features & Social
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenShop();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-amber-500/30 transition-all cursor-pointer"
            >
              <span className="text-xl">🛍️</span>
              <div>
                <div className="font-display font-bold text-xs text-white">Shop</div>
                <div className="text-[10px] text-slate-400">32 Characters</div>
              </div>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenLeaderboard();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-amber-500/30 transition-all cursor-pointer"
            >
              <span className="text-xl">🏆</span>
              <div>
                <div className="font-display font-bold text-xs text-white">Leaderboard</div>
                <div className="text-[10px] text-slate-400">Top Ranks</div>
              </div>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenMissions();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-amber-500/30 transition-all cursor-pointer relative"
            >
              <span className="text-xl">🎯</span>
              <div>
                <div className="font-display font-bold text-xs text-white">Missions</div>
                <div className="text-[10px] text-slate-400">Daily Coins</div>
              </div>
              {claimableMissionsCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center animate-bounce">
                  {claimableMissionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenFriends();
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-amber-500/30 transition-all cursor-pointer"
            >
              <span className="text-xl">💬</span>
              <div>
                <div className="font-display font-bold text-xs text-white">Friends & Chat</div>
                <div className="text-[10px] text-slate-400">Live Chat</div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Touch Joystick Toggle */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📱</span>
            <div>
              <div className="font-display font-bold text-xs text-white">On-Screen Touch Joystick</div>
              <div className="text-[10px] text-slate-400">Virtual D-Pad for steering your conga</div>
            </div>
          </div>

          <button
            onClick={onToggleTouchControls}
            className={`px-3 py-1 rounded-full text-xs font-black transition-colors cursor-pointer ${
              isTouchControlsEnabled
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {isTouchControlsEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>
    </div>
  );
};
