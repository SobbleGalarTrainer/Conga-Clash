import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { STREAK_DAY_REWARDS } from '../data/dailyStreak';

interface DailyStreakModalProps {
  onClose: () => void;
  onOpenAuth: () => void;
}

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({ onClose, onOpenAuth }) => {
  const { dailyStreak, streakMultiplier, claimDailyStreakReward, user } = useAuth();
  const [timeLeft, setTimeLeft] = useState('14h 28m');
  const [claimSuccess, setClaimSuccess] = useState<{ coins: number; multiplier: number; day: number } | null>(null);

  // Countdown timer to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const diffMs = Math.max(0, endOfDay.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${mins}m`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentDayCycle = ((dailyStreak.currentStreak - 1) % 7) + 1; // 1 to 7

  const handleClaim = () => {
    if (user.isGuest) {
      onOpenAuth();
      return;
    }
    const result = claimDailyStreakReward();
    if (result) {
      setClaimSuccess(result);
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#f97316', '#ef4444', '#facc15', '#10b981'],
        });
      } catch {
        // Fallback
      }
      setTimeout(() => setClaimSuccess(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-orange-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        {/* Header with fiery festive gradient */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-orange-950/60 via-amber-950/40 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-400 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20 border border-amber-300/40">
              🔥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-xl sm:text-2xl text-white">Daily Streak & Multiplier</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950">
                  {streakMultiplier}x Boost
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Play every day to boost all Carnival Coins earned across all 6 modes!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Top Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Streak</span>
              <div className="font-display font-black text-2xl text-orange-400 mt-0.5 flex items-center justify-center gap-1">
                <span>🔥</span>
                <span>{dailyStreak.currentStreak} {dailyStreak.currentStreak === 1 ? 'Day' : 'Days'}</span>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Streak Multiplier</span>
              <div className="font-display font-black text-2xl text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                <span>⚡</span>
                <span>{streakMultiplier}x</span>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Highest Streak</span>
              <div className="font-display font-black text-2xl text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                <span>🏆</span>
                <span>{dailyStreak.highestStreak} {dailyStreak.highestStreak === 1 ? 'Day' : 'Days'}</span>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Streak Resets In</span>
              <div className="font-display font-mono font-bold text-lg text-cyan-400 mt-1">
                {timeLeft}
              </div>
            </div>
          </div>

          {/* Claim success banner */}
          {claimSuccess && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-3.5 text-center text-emerald-200 font-bold text-sm animate-in zoom-in-95 flex items-center justify-center gap-2">
              <span>🎉</span>
              <span>
                Awesome! You claimed +{claimSuccess.coins} Carnival Coins with a {claimSuccess.multiplier}x Streak Multiplier!
              </span>
            </div>
          )}

          {/* 7-Day Rewards Schedule */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                <span>📅</span>
                <span>7-Day Fiesta Reward Path</span>
              </h3>
              <span className="text-xs text-amber-400 font-bold">
                Cycle Progress: Day {currentDayCycle} of 7
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {STREAK_DAY_REWARDS.map((reward) => {
                const isPastDay = reward.day < currentDayCycle;
                const isCurrentDay = reward.day === currentDayCycle;
                const isClaimed = isPastDay || (isCurrentDay && dailyStreak.claimedToday);
                const isReadyToClaim = isCurrentDay && !dailyStreak.claimedToday;
                const totalCoins = Math.round(reward.baseCoins * reward.multiplier);

                return (
                  <div
                    key={reward.day}
                    className={`rounded-2xl p-3.5 flex flex-col justify-between border transition-all relative overflow-hidden ${
                      isReadyToClaim
                        ? 'bg-gradient-to-b from-orange-950/80 to-amber-950/50 border-orange-400 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/50'
                        : isCurrentDay
                        ? 'bg-slate-800/90 border-amber-500/50'
                        : isPastDay
                        ? 'bg-slate-900/60 border-slate-800 opacity-75'
                        : 'bg-slate-900/40 border-slate-800/80'
                    }`}
                  >
                    {/* Top indicator badge */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="font-display font-black text-xs text-slate-300">
                        Day {reward.day}
                      </span>
                      {isClaimed ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          ✓ Claimed
                        </span>
                      ) : isReadyToClaim ? (
                        <span className="bg-orange-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                          Ready!
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500">
                          Locked
                        </span>
                      )}
                    </div>

                    {/* Icon & Title */}
                    <div className="flex items-center gap-2.5 my-1">
                      <span className="text-2xl">{reward.icon}</span>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-xs text-white truncate">
                          {reward.title}
                        </div>
                        <div className="text-[10px] text-amber-400 font-bold">
                          {reward.multiplier}x Multiplier
                        </div>
                      </div>
                    </div>

                    {/* Reward Coins */}
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Coins:</span>
                      <span className="font-display font-black text-sm text-amber-400">
                        +{totalCoins}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multiplier Boost Explanation */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="text-3xl shrink-0">✨</div>
            <div className="text-xs text-slate-300 space-y-1 text-center sm:text-left">
              <strong className="text-amber-300 font-bold block">
                How Your Streak Multiplier Works:
              </strong>
              <p>
                Your <span className="text-amber-400 font-bold">{streakMultiplier}x Multiplier</span> boosts
                all coins you earn from recruiting dancers, winning Rock Paper Scissors duels, surviving Conga Royale, and completing Daily Missions!
              </p>
            </div>
          </div>

          {/* Guest notice */}
          {user.isGuest && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="text-xs text-indigo-300">
                <strong className="text-white">Playing as Guest ({user.displayName}):</strong> Sign in with Google or Microsoft to save your streak across devices and unlock your coin bank!
              </div>
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Footer with Claim Action */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {dailyStreak.claimedToday ? (
              <span>Come back tomorrow to advance your streak to <strong>Day {dailyStreak.currentStreak + 1}</strong>!</span>
            ) : (
              <span>Claim today’s <strong>Day {currentDayCycle}</strong> reward to secure your <strong>{streakMultiplier}x Multiplier</strong>!</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!dailyStreak.claimedToday ? (
              <button
                onClick={handleClaim}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 hover:from-orange-400 hover:to-yellow-300 text-slate-950 font-display font-black text-sm rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔥</span>
                <span>
                  {user.isGuest
                    ? 'Sign In to Claim Reward'
                    : `Claim Day ${currentDayCycle} Reward (+${Math.round(
                        (STREAK_DAY_REWARDS[currentDayCycle - 1]?.baseCoins || 50) * streakMultiplier
                      )} Coins)`}
                </span>
              </button>
            ) : (
              <button
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 text-slate-400 font-display font-bold text-sm rounded-xl border border-slate-700 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>✓</span>
                <span>Claimed for Today</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
