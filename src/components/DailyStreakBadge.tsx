import React from 'react';
import { useAuth } from '../context/AuthContext';

interface DailyStreakBadgeProps {
  onClick: () => void;
  className?: string;
}

export const DailyStreakBadge: React.FC<DailyStreakBadgeProps> = ({ onClick, className = '' }) => {
  const { dailyStreak, streakMultiplier } = useAuth();
  const hasUnclaimed = !dailyStreak.claimedToday;

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
        hasUnclaimed
          ? 'bg-gradient-to-r from-orange-950/80 via-amber-950/60 to-orange-900/40 border-orange-500/60 hover:border-orange-400 shadow-md shadow-orange-500/10'
          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/40'
      } ${className}`}
      title={`Daily Streak: Day ${dailyStreak.currentStreak} (${streakMultiplier}x Coin Multiplier)${
        hasUnclaimed ? ' — Reward ready to claim!' : ''
      }`}
    >
      {/* Flame Icon with subtle animation */}
      <span className={`text-base sm:text-lg transition-transform group-hover:scale-110 ${hasUnclaimed ? 'animate-bounce' : ''}`}>
        🔥
      </span>

      {/* Streak Info */}
      <div className="flex flex-col items-start leading-tight">
        <div className="flex items-center gap-1">
          <span className="font-display font-black text-xs text-white whitespace-nowrap">
            Day {dailyStreak.currentStreak}
          </span>
          <span className="text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black px-1 rounded uppercase tracking-wider">
            {streakMultiplier}x
          </span>
        </div>
        <span className="text-[9px] text-orange-400 font-bold hidden sm:inline">
          {hasUnclaimed ? 'Claim Reward!' : 'Active Streak'}
        </span>
      </div>

      {/* Notification Ping if unclaimed */}
      {hasUnclaimed && (
        <span className="relative flex h-2 w-2 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
      )}
    </button>
  );
};
