/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, GameStats, Character } from './types/game';
import { CHARACTERS_ROSTER } from './data/characters';
import { ArenaMode } from './components/ArenaMode';
import { ThreeCongaArena } from './components/ThreeCongaArena';
import { GauntletMode } from './components/GauntletMode';
import { VersusMode } from './components/VersusMode';
import { MultiplayerMode } from './components/MultiplayerMode';
import { BattleRoyaleMode } from './components/BattleRoyaleMode';
import { ThreeMultiplayerMode } from './components/ThreeMultiplayerMode';
import { ThreeBattleRoyaleMode } from './components/ThreeBattleRoyaleMode';
import { ThreeCongaStage } from './components/ThreeCongaStage';
import { HallOfFame } from './components/HallOfFame';
import { ShopModal } from './components/ShopModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { FriendsChatModal } from './components/FriendsChatModal';
import { AuthModal } from './components/AuthModal';
import { CustomizeModal } from './components/CustomizeModal';
import { DailyStreakBadge } from './components/DailyStreakBadge';
import { DailyStreakModal } from './components/DailyStreakModal';
import { MobileTouchControls } from './components/MobileTouchControls';
import { MobileDrawerMenu } from './components/MobileDrawerMenu';
import { AuthProvider, useAuth } from './context/AuthContext';
import { audioSystem } from './utils/audio';

const HERO_BANNER_SRC = '/src/assets/images/conga_carnival_banner_1791989623041.jpg';

function MainAppContent() {
  const {
    user,
    currentLeader,
    dailyMissions,
    showAuthPrompt,
    setShowAuthPrompt,
    authPromptReason,
    triggerAuthPrompt,
    addCoins,
    incrementMissionProgress,
    recordHighScore,
  } = useAuth();

  const [currentMode, setCurrentMode] = useState<GameMode | 'MENU'>('MENU');
  const [modeFilter, setModeFilter] = useState<'ALL' | '3D' | '2D'>('ALL');
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isTouchControlsEnabled, setIsTouchControlsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        'ontouchstart' in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        window.innerWidth < 1024
      );
    }
    return false;
  });
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMusicActive, setIsMusicActive] = useState(false);

  // Career stats
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem('conga_game_stats');
      return saved
        ? JSON.parse(saved)
        : {
            longestConga: 1,
            totalRecruits: 0,
            duelsWon: 0,
            duelsLost: 0,
            duelsTied: 0,
            carnivalTrophies: [],
            battleRoyaleWins: 0,
            bestPlacement: 100,
          };
    } catch {
      return {
        longestConga: 1,
        totalRecruits: 0,
        duelsWon: 0,
        duelsLost: 0,
        duelsTied: 0,
        carnivalTrophies: [],
        battleRoyaleWins: 0,
        bestPlacement: 100,
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('conga_game_stats', JSON.stringify(stats));
  }, [stats]);

  const handleUpdateStats = React.useCallback(
    (recruits: number, won: boolean, tied: boolean, placement?: number) => {
      setStats((prev) => {
        const newTotalRecruits = prev.totalRecruits + recruits;
        const currentTrainLength = 1 + recruits;
        const newLongest = Math.max(prev.longestConga, currentTrainLength);
        const newBestPlacement = placement ? Math.min(prev.bestPlacement, placement) : prev.bestPlacement;
        const wonBR = placement === 1 ? 1 : 0;

        // Sync with Leaderboard and Missions
        recordHighScore(newLongest, 'Dancers Conga Line');
        if (won) {
          incrementMissionProgress('duels', 1);
          addCoins(15, 'Duel Victory');
        }
        if (recruits > 0) {
          incrementMissionProgress('recruits', recruits);
          addCoins(recruits * 5, 'Dancers Recruited');
        }
        if (placement && placement <= 10) {
          incrementMissionProgress('royale', 1);
          addCoins(placement === 1 ? 250 : 50, 'Royale Placement');
        }

        return {
          ...prev,
          totalRecruits: newTotalRecruits,
          longestConga: newLongest,
          duelsWon: prev.duelsWon + (won ? 1 : 0),
          duelsLost: prev.duelsLost + (!won && !tied ? 1 : 0),
          duelsTied: prev.duelsTied + (tied ? 1 : 0),
          bestPlacement: newBestPlacement,
          battleRoyaleWins: prev.battleRoyaleWins + wonBR,
        };
      });
    },
    [addCoins, incrementMissionProgress, recordHighScore]
  );

  const handleToggleSound = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    audioSystem.setMuted(nextMuted);
    if (!nextMuted && !isMusicActive) {
      audioSystem.startMusic();
      setIsMusicActive(true);
    } else if (nextMuted) {
      audioSystem.stopMusic();
      setIsMusicActive(false);
    }
  };

  const handleStartMusic = () => {
    if (isAudioMuted) {
      setIsAudioMuted(false);
      audioSystem.setMuted(false);
    }
    audioSystem.startMusic();
    setIsMusicActive(true);
  };

  // Count uncompleted or claimable daily missions
  const claimableMissionsCount = dailyMissions.filter(
    (m) => m.currentCount >= m.targetCount && !m.isClaimed
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          {/* Zone 1: Wordmark Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentMode('MENU');
            }}
            className="font-display text-xl sm:text-2xl font-black tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span>🪇</span>
            <span>Conga Clash</span>
            <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-1.5 py-0.5 rounded font-black tracking-wider uppercase hidden sm:inline">
              6 Modes · 3D
            </span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-3 text-xs font-bold text-slate-300">
            <button
              onClick={() => {
                handleStartMusic();
                setCurrentMode('MENU');
              }}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                currentMode === 'MENU' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'hover:bg-slate-900'
              }`}
            >
              <span>🎮</span>
              <span>All 6 Modes</span>
            </button>
            <button
              onClick={() => {
                handleStartMusic();
                setCurrentMode('SOLO_3D');
              }}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg ${
                currentMode === 'SOLO_3D' || currentMode === 'THREE_ARENA' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'hover:bg-slate-900'
              }`}
            >
              <span>🪩</span>
              <span>Solo 3D</span>
            </button>
            <button
              onClick={() => {
                handleStartMusic();
                setCurrentMode('MULTIPLAYER_3D');
              }}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg ${
                currentMode === 'MULTIPLAYER_3D' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'hover:bg-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Multiplayer 3D</span>
            </button>
            <button
              onClick={() => {
                handleStartMusic();
                setCurrentMode('ROYALE_3D');
              }}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg ${
                currentMode === 'ROYALE_3D' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'hover:bg-slate-900'
              }`}
            >
              <span>👑</span>
              <span>Royale 3D</span>
            </button>
            <button
              onClick={() => setShowShopModal(true)}
              className="hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900"
            >
              <span>🛍️</span>
              <span>Shop</span>
            </button>
            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900"
            >
              <span>🏆</span>
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => setShowMissionsModal(true)}
              className="hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900 relative"
            >
              <span>🎯</span>
              <span>Missions</span>
              {claimableMissionsCount > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center animate-bounce">
                  {claimableMissionsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowFriendsModal(true)}
              className="hover:text-amber-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900"
            >
              <span>💬</span>
              <span>Friends & Chat</span>
            </button>
          </nav>

          {/* Zone 3: Daily Streak, Wallet, User Profile / Auth, Sound, Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Daily Streak Component within Header */}
            <DailyStreakBadge onClick={() => setShowStreakModal(true)} />

            {/* Currency Pill */}
            <button
              onClick={() => setShowShopModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              title="Carnival Coins — Click to Open Shop"
            >
              <span>🪙</span>
              <span className="font-display font-black text-amber-400 text-xs sm:text-sm tabular-nums">
                {user.coins}
              </span>
            </button>

            {/* Profile / Auth Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className={`hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer items-center gap-1.5 border ${
                user.isGuest
                  ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <span>{user.isGuest ? '👤' : user.provider === 'google' ? '🌐' : '🔷'}</span>
              <span className="max-w-[75px] md:max-w-[100px] truncate">{user.displayName}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 text-xs rounded-xl border transition-all cursor-pointer ${
                isAudioMuted
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
              }`}
              title={isAudioMuted ? 'Unmute Audio & Music' : 'Mute Audio'}
            >
              <span>{isAudioMuted ? '🔇' : '🔊'}</span>
            </button>

            {/* Mobile Hamburger Menu Toggle (< lg) */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center cursor-pointer relative"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <span className="text-sm font-bold">☰</span>
              {claimableMissionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center">
        {currentMode === 'MENU' && (
          <div className="w-full flex flex-col items-center gap-8">
            {/* Hero Section */}
            <div className="w-full relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
              <div className="relative aspect-[16/9] max-h-[440px] w-full overflow-hidden">
                <img
                  src={HERO_BANNER_SRC}
                  alt="Carnival Conga Line Dance Party"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/40" />

                <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 flex flex-col items-start max-w-2xl">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-amber-400 mb-2">
                    <span>Full 3D Engine</span>
                    <span aria-hidden="true">·</span>
                    <span>32 Characters</span>
                    <span aria-hidden="true">·</span>
                    <span>Rock Paper Scissors</span>
                  </div>

                  <h1 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-tight text-balance">
                    Win the duel. Grow the conga line. Own the 3D floor.
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-xl text-balance">
                    Every defeat in Rock Paper Scissors forces the losing conga line to link behind your hips! Climb the global leaderboard and unlock 32 characters in the shop.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <button
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('SOLO_3D');
                      }}
                      className="px-5 py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-black text-xs sm:text-sm rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Solo 3D Mode</span>
                      <span>💃</span>
                    </button>
                    <button
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('MULTIPLAYER_3D');
                      }}
                      className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-black text-xs sm:text-sm rounded-xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>Multiplayer 3D</span>
                      <span>🪩</span>
                    </button>
                    <button
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('ROYALE_3D');
                      }}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-display font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>100–256 Royale 3D</span>
                      <span>👑</span>
                    </button>
                    <button
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('MULTIPLAYER_2D');
                      }}
                      className="px-4 py-3 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Multiplayer 2D</span>
                      <span>🌐</span>
                    </button>
                    <button
                      onClick={() => setShowCustomizeModal(true)}
                      className="px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Customize</span>
                      <span>👑</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Strip */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="p-2 text-center">
                <span className="text-xs text-slate-400">Longest Conga Line</span>
                <div className="font-display font-black text-2xl text-amber-400 tabular-nums">
                  {stats.longestConga} <span className="text-xs font-normal text-slate-400">Dancers</span>
                </div>
              </div>
              <div className="p-2 text-center">
                <span className="text-xs text-slate-400">Dancers Recruited</span>
                <div className="font-display font-black text-2xl text-emerald-400 tabular-nums">
                  {stats.totalRecruits}
                </div>
              </div>
              <div className="p-2 text-center">
                <span className="text-xs text-slate-400">Duels Won</span>
                <div className="font-display font-black text-2xl text-cyan-400 tabular-nums">
                  {stats.duelsWon}
                </div>
              </div>
              <div className="p-2 text-center">
                <span className="text-xs text-slate-400">Current Leader</span>
                <div className="font-display font-bold text-base text-white truncate mt-1">
                  {currentLeader.name}
                </div>
              </div>
            </div>

            {/* 3D Interactive Conga Showcase Stage (Procedural Three.js) */}
            <div className="w-full">
              <ThreeCongaStage
                leader={currentLeader}
                followers={CHARACTERS_ROSTER.slice(0, 6)}
                title="3D Conga Line Showcase — In Full Motion"
              />
            </div>

            {/* Daily Missions Quick Side Panel & Modes Showcase */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Daily Missions Card (Left 1 Col) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎯</span>
                      <h3 className="font-display font-black text-base text-white">Daily Missions</h3>
                    </div>
                    <button
                      onClick={() => setShowMissionsModal(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">
                    Earn Carnival Coins to unlock characters and accessories in the shop!
                  </p>

                  <div className="space-y-2.5">
                    {dailyMissions.slice(0, 3).map((m) => {
                      const isComplete = m.currentCount >= m.targetCount;
                      const pct = Math.min(100, (m.currentCount / m.targetCount) * 100);
                      return (
                        <div key={m.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-white truncate">{m.title}</span>
                            <span className="font-black text-amber-400 shrink-0">+{m.rewardCoins} 🪙</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isComplete ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {m.currentCount}/{m.targetCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setShowMissionsModal(true)}
                  className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Open Missions Modal
                </button>
              </div>

              {/* Game Modes Selection Cards (Right 2 Cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="font-display font-black text-xl text-white flex items-center gap-2">
                      <span>Choose Your Dance Mode</span>
                      <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                        6 Modes
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select 2D or real-time Three.js 3D gameplay across Solo, Multiplayer, or Royale.
                    </p>
                  </div>

                  {/* Mode Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      onClick={() => setModeFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modeFilter === 'ALL'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All (6)
                    </button>
                    <button
                      onClick={() => setModeFilter('3D')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        modeFilter === '3D'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🪩</span>
                      <span>3D Modes (3)</span>
                    </button>
                    <button
                      onClick={() => setModeFilter('2D')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        modeFilter === '2D'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎨</span>
                      <span>2D Modes (3)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mode 1: Solo 3D Mode */}
                  {(modeFilter === 'ALL' || modeFilter === '3D') && (
                    <div
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('SOLO_3D');
                      }}
                      className="group bg-gradient-to-br from-amber-950/40 via-orange-950/20 to-slate-900 border-2 border-amber-500 hover:border-amber-400 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-xl flex flex-col justify-between hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform">💃🪩</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            3D · Singleplayer
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-white group-hover:text-amber-400 transition-colors">
                          Solo 3D Mode
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Steer your conga snake in real Three.js 3D! Bump into soloists and clash with AI rival trains to absorb their lines in 3D Rock-Paper-Scissors.
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-amber-400">
                        <span>Launch Solo 3D</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Multiplayer 3D Mode */}
                  {(modeFilter === 'ALL' || modeFilter === '3D') && (
                    <div
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('MULTIPLAYER_3D');
                      }}
                      className="group bg-gradient-to-br from-cyan-950/40 via-blue-950/20 to-slate-900 border-2 border-cyan-500 hover:border-cyan-400 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-xl flex flex-col justify-between hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform">🪩💬</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            3D · WebSockets
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-white group-hover:text-cyan-400 transition-colors">
                          Multiplayer 3D Mode
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Synchronized 3D ballroom with rotating disco ball, custom 3D character avatars, live chat window, quick emotes, and line absorption!
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-cyan-400">
                        <span>Enter 3D Ballroom</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: 100-256 Conga Royale 3D Mode */}
                  {(modeFilter === 'ALL' || modeFilter === '3D') && (
                    <div
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('ROYALE_3D');
                      }}
                      className="group bg-gradient-to-br from-rose-950/40 via-purple-950/20 to-slate-900 border-2 border-rose-500/80 hover:border-rose-400 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-xl flex flex-col justify-between hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform">👑🌪️</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            3D · 100-256 Royale
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-white group-hover:text-rose-400 transition-colors">
                          100–256 Conga Royale 3D
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Massive 100–256 player battle royale on 3D Carnival Island! Shrinking 3D purple storm cylinder, full line absorption, and 3D spectator camera.
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-rose-400">
                        <span>Drop 3D Island</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  )}

                  {/* Mode 4: Solo 2D Mode */}
                  {(modeFilter === 'ALL' || modeFilter === '2D') && (
                    <div
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('SOLO_2D');
                      }}
                      className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-400/60 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform">🕺🪇</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            2D · Classic Arena
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-white group-hover:text-amber-400 transition-colors">
                          Solo 2D Mode
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Top-down 2D conga arena with fluid snake physics. Pick up solo dancers, collect fever magnets, and clash with rival trains!
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-amber-400">
                        <span>Play Solo 2D</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  )}

                  {/* Mode 5: Multiplayer 2D Mode */}
                  {(modeFilter === 'ALL' || modeFilter === '2D') && (
                    <div
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('MULTIPLAYER_2D');
                      }}
                      className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-400/60 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform">🌐💬</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            2D · WebSockets
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-white group-hover:text-emerald-400 transition-colors">
                          Multiplayer 2D Mode
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Live 2D ballroom powered by WebSockets with synchronized chat window, quick emote reactions, and forced conga absorption!
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-emerald-400">
                        <span>Join 2D Ballroom</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  )}

                  {/* Mode 6: 100-256 Conga Royale 2D Mode */}
                  {(modeFilter === 'ALL' || modeFilter === '2D') && (
                    <div
                      onClick={() => {
                        handleStartMusic();
                        setCurrentMode('ROYALE_2D');
                      }}
                      className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-400/60 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform">🪂👑</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                            2D · 100-256 Royale
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-white group-hover:text-amber-400 transition-colors">
                          100–256 Conga Royale 2D
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Top-down battle royale across Carnival Island! Choose 100, 150, or 256 dancers, navigate shrinking dance storms, and spectate!
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-amber-400">
                        <span>Drop 2D Island</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Mode Views - 6 Modes Supported */}
        {(currentMode === 'SOLO_3D' || currentMode === 'THREE_ARENA') && (
          <ThreeCongaArena
            playerLeader={currentLeader}
            onBackToMenu={() => setCurrentMode('MENU')}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {(currentMode === 'SOLO_2D' || currentMode === 'ARENA') && (
          <ArenaMode
            playerLeader={currentLeader}
            onUpdateStats={handleUpdateStats}
            onBackToMenu={() => setCurrentMode('MENU')}
          />
        )}

        {currentMode === 'MULTIPLAYER_3D' && (
          <ThreeMultiplayerMode
            playerLeader={currentLeader}
            onBackToMenu={() => setCurrentMode('MENU')}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {(currentMode === 'MULTIPLAYER_2D' || currentMode === 'MULTIPLAYER') && (
          <MultiplayerMode
            playerLeader={currentLeader}
            onBackToMenu={() => setCurrentMode('MENU')}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {currentMode === 'ROYALE_3D' && (
          <ThreeBattleRoyaleMode
            playerLeader={currentLeader}
            onBackToMenu={() => setCurrentMode('MENU')}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {(currentMode === 'ROYALE_2D' || currentMode === 'BATTLE_ROYALE') && (
          <BattleRoyaleMode
            playerLeader={currentLeader}
            onBackToMenu={() => setCurrentMode('MENU')}
            onUpdateStats={handleUpdateStats}
          />
        )}

        {currentMode === 'GAUNTLET' && (
          <GauntletMode
            playerLeader={currentLeader}
            onUpdateStats={handleUpdateStats}
            onBackToMenu={() => setCurrentMode('MENU')}
          />
        )}

        {currentMode === 'VERSUS' && (
          <VersusMode onBackToMenu={() => setCurrentMode('MENU')} />
        )}
      </main>

      {/* Modals */}
      {showShopModal && (
        <ShopModal
          onClose={() => setShowShopModal(false)}
          onOpenAuth={() => {
            setShowShopModal(false);
            setShowLoginModal(true);
          }}
        />
      )}

      {showLeaderboardModal && (
        <LeaderboardModal
          onClose={() => setShowLeaderboardModal(false)}
          onOpenCustomize={() => {
            setShowLeaderboardModal(false);
            setShowCustomizeModal(true);
          }}
        />
      )}

      {showMissionsModal && (
        <DailyMissionsModal
          onClose={() => setShowMissionsModal(false)}
          onOpenAuth={() => {
            setShowMissionsModal(false);
            setShowLoginModal(true);
          }}
        />
      )}

      {showFriendsModal && (
        <FriendsChatModal onClose={() => setShowFriendsModal(false)} />
      )}

      {showCustomizeModal && (
        <CustomizeModal
          onClose={() => setShowCustomizeModal(false)}
          onOpenAuth={() => {
            setShowCustomizeModal(false);
            setShowLoginModal(true);
          }}
          onOpenShop={() => {
            setShowCustomizeModal(false);
            setShowShopModal(true);
          }}
        />
      )}

      {(showLoginModal || showAuthPrompt) && (
        <AuthModal
          onClose={() => {
            setShowLoginModal(false);
            setShowAuthPrompt(false);
          }}
          reason={authPromptReason}
        />
      )}

      {showHallOfFame && (
        <HallOfFame stats={stats} onClose={() => setShowHallOfFame(false)} />
      )}

      {/* Daily Streak Modal */}
      {showStreakModal && (
        <DailyStreakModal
          onClose={() => setShowStreakModal(false)}
          onOpenAuth={() => {
            setShowStreakModal(false);
            setShowLoginModal(true);
          }}
        />
      )}

      {/* Mobile Drawer Slide-out Menu */}
      <MobileDrawerMenu
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        currentMode={currentMode}
        onSelectMode={(mode) => {
          handleStartMusic();
          setCurrentMode(mode);
        }}
        onOpenShop={() => setShowShopModal(true)}
        onOpenLeaderboard={() => setShowLeaderboardModal(true)}
        onOpenMissions={() => setShowMissionsModal(true)}
        onOpenFriends={() => setShowFriendsModal(true)}
        onOpenStreak={() => setShowStreakModal(true)}
        onOpenAuth={() => setShowLoginModal(true)}
        claimableMissionsCount={claimableMissionsCount}
        isTouchControlsEnabled={isTouchControlsEnabled}
        onToggleTouchControls={() => setIsTouchControlsEnabled((prev) => !prev)}
      />

      {/* On-Screen Mobile Touch Joystick Controls during Active Gameplay */}
      {currentMode !== 'MENU' && isTouchControlsEnabled && (
        <MobileTouchControls />
      )}

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        Conga Clash · 3D Rock Paper Scissors Carnival · 1-2-3-KICK!
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
