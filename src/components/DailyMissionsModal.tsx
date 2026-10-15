import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface DailyMissionsModalProps {
  onClose: () => void;
  onOpenAuth: () => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({ onClose, onOpenAuth }) => {
  const { dailyMissions, claimMissionReward, user } = useAuth();
  const [timeLeft, setTimeLeft] = useState('14h 28m');
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  // Daily reset timer simulation
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const diffMs = endOfDay.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${mins}m`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = (missionId: string, reward: number, title: string) => {
    if (user.isGuest) {
      onOpenAuth();
      return;
    }
    const success = claimMissionReward(missionId);
    if (success) {
      setClaimFeedback(`+${reward} Carnival Coins claimed for "${title}"! 🎉`);
      setTimeout(() => setClaimFeedback(null), 3000);
    }
  };

  const totalCompleted = dailyMissions.filter((m) => m.currentCount >= m.targetCount).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-white">Daily Missions</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>Resets in:</span>
                <span className="font-mono text-amber-400 font-bold">{timeLeft}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Guest Warning */}
        {user.isGuest && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="text-slate-300">
              <strong className="text-amber-400">Guest Mode: </strong>
              Log in with Google or Microsoft to claim and save your Carnival Coins!
            </div>
            <button
              onClick={onOpenAuth}
              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-[11px] rounded-lg shrink-0"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Claim Feedback Banner */}
        {claimFeedback && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 text-center text-xs text-emerald-300 font-bold animate-pulse">
            {claimFeedback}
          </div>
        )}

        {/* Progress Overview Bar */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Daily Progress: <strong className="text-white font-bold">{totalCompleted} / {dailyMissions.length}</strong> Completed
          </span>
          <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(totalCompleted / dailyMissions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Missions List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 scrollbar-thin">
          {dailyMissions.map((mission) => {
            const isFinished = mission.currentCount >= mission.targetCount;
            const progressPercent = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));

            return (
              <div
                key={mission.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  mission.isClaimed
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    : isFinished
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-md'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">
                      {mission.category === 'duels'
                        ? '⚔️'
                        : mission.category === 'recruits'
                        ? '💃'
                        : mission.category === 'royale'
                        ? '🪂'
                        : '💬'}
                    </span>
                    <h4 className="font-display font-bold text-sm text-white truncate">{mission.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300">{mission.description}</p>

                  {/* Progress Bar */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFinished ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 shrink-0 tabular-nums">
                      {mission.currentCount} / {mission.targetCount}
                    </span>
                  </div>
                </div>

                {/* Reward & Action */}
                <div className="sm:text-right shrink-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                    <span>🪙</span>
                    <span>+{mission.rewardCoins} Coins</span>
                  </div>

                  {mission.isClaimed ? (
                    <span className="text-xs font-bold text-slate-500">✓ Claimed</span>
                  ) : isFinished ? (
                    <button
                      onClick={() => handleClaim(mission.id, mission.rewardCoins, mission.title)}
                      className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-black text-xs rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      Claim!
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">In Progress</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center text-xs text-slate-400">
          New daily objectives unlock every 24 hours at midnight UTC.
        </div>
      </div>
    </div>
  );
};
